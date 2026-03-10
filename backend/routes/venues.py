from flask import Blueprint, request, jsonify

venues_bp = Blueprint('venues', __name__)
mysql = None

def init_mysql(db):
    global mysql
    mysql = db

@venues_bp.route('/', methods=['GET'])
def get_venues():
    district = request.args.get('district')
    try:
        cur = mysql.connection.cursor()
        if district:
            cur.execute("SELECT * FROM locations WHERE district=%s", (district,))
        else:
            cur.execute("SELECT * FROM locations")
        rows = cur.fetchall()
        cur.close()
        return jsonify([{'id':r[0],'name':r[1],'address':r[2],'city':r[3],'district':r[4],'image_url':r[5],'description':r[6]} for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/<int:venue_id>/courts', methods=['GET'])
def get_courts(venue_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM courts WHERE location_id=%s", (venue_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([{'id':r[0],'location_id':r[1],'court_name':r[2],'sport_type':r[3],'capacity':r[4],'price_per_hour':float(r[5])} for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/add', methods=['POST'])
def add_venue():
    d = request.get_json()
    try:
        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO locations (name,address,city,district,description) VALUES (%s,%s,%s,%s,%s)",
                    (d.get('name'),d.get('address'),d.get('city'),d.get('district'),d.get('description','')))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Venue added successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/delete/<int:venue_id>', methods=['DELETE'])
def delete_venue(venue_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM locations WHERE id=%s", (venue_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Venue deleted!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/add-court', methods=['POST'])
def add_court():
    d = request.get_json()
    try:
        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO courts (location_id,court_name,sport_type,capacity,price_per_hour) VALUES (%s,%s,%s,%s,%s)",
            (d.get('location_id'), d.get('court_name'), d.get('sport_type','Futsal'),
             d.get('capacity', 10), d.get('price_per_hour', 1500))
        )
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Court added successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/delete-court/<int:court_id>', methods=['DELETE'])
def delete_court(court_id):
    try:
        cur = mysql.connection.cursor()
        # Step 1: Delete bookings linked to this court's time slots
        cur.execute("""
            DELETE FROM bookings WHERE time_slot_id IN (
                SELECT id FROM time_slots WHERE court_id = %s
            )
        """, (court_id,))
        # Step 2: Delete time slots for this court
        cur.execute("DELETE FROM time_slots WHERE court_id = %s", (court_id,))
        # Step 3: Now safe to delete the court
        cur.execute("DELETE FROM courts WHERE id = %s", (court_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Court deleted successfully!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/all-courts', methods=['GET'])
def get_all_courts():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""SELECT c.id, c.court_name, c.sport_type, c.capacity,
                       c.price_per_hour, l.name as venue_name, l.id as venue_id
                       FROM courts c JOIN locations l ON c.location_id=l.id
                       ORDER BY l.name, c.court_name""")
        rows = cur.fetchall()
        cur.close()
        return jsonify([{
            'id':r[0],'court_name':r[1],'sport_type':r[2],
            'capacity':r[3],'price_per_hour':float(r[4]),
            'venue_name':r[5],'venue_id':r[6]
        } for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@venues_bp.route('/stats', methods=['GET'])
def get_stats():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT COUNT(*) FROM bookings"); total_bookings = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users"); total_users = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(SUM(total_amount),0) FROM bookings WHERE status!='cancelled'")
        total_revenue = float(cur.fetchone()[0] or 0)
        cur.execute("SELECT COUNT(*) FROM locations"); total_venues = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM courts"); total_courts = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM time_slots WHERE is_available=TRUE"); available_slots = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM bookings WHERE status='confirmed'"); active_bookings = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM bookings WHERE status='cancelled'"); cancelled_bookings = cur.fetchone()[0]
        cur.execute("""SELECT l.name, COUNT(b.id) as total FROM bookings b
            JOIN time_slots ts ON b.time_slot_id=ts.id
            JOIN courts c ON ts.court_id=c.id
            JOIN locations l ON c.location_id=l.id
            GROUP BY l.name ORDER BY total DESC""")
        venue_stats = [{'venue':r[0],'bookings':r[1]} for r in cur.fetchall()]
        cur.execute("""SELECT HOUR(ts.start_time) as hour, COUNT(*) as total
            FROM bookings b JOIN time_slots ts ON b.time_slot_id=ts.id
            GROUP BY HOUR(ts.start_time) ORDER BY total DESC LIMIT 8""")
        peak_hours = [{'hour':str(r[0])+':00','bookings':r[1]} for r in cur.fetchall()]
        # Monthly revenue for last 6 months
        cur.execute("""SELECT DATE_FORMAT(booking_date,'%b %Y') as month,
            COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as bookings
            FROM bookings WHERE status='confirmed'
            AND booking_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(booking_date,'%Y-%m'), DATE_FORMAT(booking_date,'%b %Y')
            ORDER BY MIN(booking_date)""")
        monthly = [{'month':r[0],'revenue':float(r[1]),'bookings':r[2]} for r in cur.fetchall()]
        cur.close()
        return jsonify({
            'total_bookings':total_bookings,'total_users':total_users,
            'total_revenue':total_revenue,'total_venues':total_venues,
            'total_courts':total_courts,'available_slots':available_slots,
            'active_bookings':active_bookings,'cancelled_bookings':cancelled_bookings,
            'venue_stats':venue_stats,'peak_hours':peak_hours,'monthly':monthly
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500