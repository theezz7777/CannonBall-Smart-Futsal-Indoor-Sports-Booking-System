from flask import Blueprint, request, jsonify
from datetime import date, timedelta, datetime

bookings_bp = Blueprint('bookings', __name__)
mysql = None

def init_mysql(db):
    global mysql
    mysql = db

@bookings_bp.route('/slots/<int:court_id>', methods=['GET'])
def get_slots(court_id):
    slot_date = request.args.get('date')
    try:
        cur = mysql.connection.cursor()
        if slot_date:
            cur.execute("SELECT * FROM time_slots WHERE court_id=%s AND date=%s AND is_available=TRUE", (court_id, slot_date))
        else:
            cur.execute("SELECT * FROM time_slots WHERE court_id=%s AND is_available=TRUE", (court_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([{'id':r[0],'court_id':r[1],'date':str(r[2]),'start_time':str(r[3]),'end_time':str(r[4]),'is_available':r[5]} for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/create', methods=['POST'])
def create_booking():
    data         = request.get_json()
    user_id      = data.get('user_id')
    time_slot_id = data.get('time_slot_id')
    payment_method = data.get('payment_method')
    total_amount   = data.get('total_amount')
    if not user_id or not time_slot_id or not payment_method:
        return jsonify({'error': 'Missing required fields'}), 400
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT is_available FROM time_slots WHERE id=%s", (time_slot_id,))
        slot = cur.fetchone()
        if not slot or not slot[0]:
            return jsonify({'error': 'Slot is no longer available'}), 400
        cur.execute("INSERT INTO bookings (user_id,time_slot_id,payment_method,total_amount) VALUES (%s,%s,%s,%s)",
                    (user_id, time_slot_id, payment_method, total_amount))
        cur.execute("UPDATE time_slots SET is_available=FALSE WHERE id=%s", (time_slot_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Booking confirmed!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_bookings(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""SELECT b.id,l.name,c.court_name,ts.date,ts.start_time,ts.end_time,
            b.payment_method,b.payment_status,b.total_amount,b.status,l.id
            FROM bookings b JOIN time_slots ts ON b.time_slot_id=ts.id
            JOIN courts c ON ts.court_id=c.id JOIN locations l ON c.location_id=l.id
            WHERE b.user_id=%s ORDER BY b.booking_date DESC""", (user_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([{'booking_id':r[0],'venue_name':r[1],'court_name':r[2],'date':str(r[3]),
            'start_time':str(r[4]),'end_time':str(r[5]),'payment_method':r[6],
            'payment_status':r[7],'total_amount':float(r[8]) if r[8] else 0,'status':r[9],
            'venue_id':r[10]} for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/generate-slots', methods=['POST'])
def generate_slots():
    try:
        data      = request.get_json(force=True, silent=True) or {}
        start_str = data.get('start_date') if data else None
        days      = int(data.get('days', 300)) if data else 300

        start = datetime.strptime(start_str, '%Y-%m-%d').date() if start_str else date.today()

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM courts")
        courts = cur.fetchall()

        times = [
            ('08:00:00','09:00:00'), ('09:00:00','10:00:00'),
            ('10:00:00','11:00:00'), ('11:00:00','12:00:00'),
            ('14:00:00','15:00:00'), ('15:00:00','16:00:00'),
            ('16:00:00','17:00:00'), ('17:00:00','18:00:00'),
            ('18:00:00','19:00:00'), ('19:00:00','20:00:00'),
        ]

        created = 0
        for i in range(days):
            d = start + timedelta(days=i)
            for court in courts:
                for start_t, end_t in times:
                    cur.execute(
                        "SELECT id FROM time_slots WHERE court_id=%s AND date=%s AND start_time=%s",
                        (court[0], d, start_t)
                    )
                    if not cur.fetchone():
                        cur.execute(
                            "INSERT INTO time_slots (court_id,date,start_time,end_time,is_available) VALUES (%s,%s,%s,%s,TRUE)",
                            (court[0], d, start_t, end_t)
                        )
                        created += 1

        mysql.connection.commit()
        cur.close()
        end_date = start + timedelta(days=days - 1)
        return jsonify({
            'message':       f'Generated {created} slots from {start} to {end_date}!',
            'slots_created':  created,
            'from':           str(start),
            'to':             str(end_date),
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/cancel/<int:booking_id>', methods=['PUT'])
def cancel_booking(booking_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT time_slot_id FROM bookings WHERE id=%s", (booking_id,))
        booking = cur.fetchone()
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        cur.execute("UPDATE bookings SET status='cancelled' WHERE id=%s", (booking_id,))
        cur.execute("UPDATE time_slots SET is_available=TRUE WHERE id=%s", (booking[0],))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Booking cancelled successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bookings_bp.route('/all', methods=['GET'])
def get_all_bookings():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""SELECT b.id,u.full_name,u.email,l.name,c.court_name,
            ts.date,ts.start_time,ts.end_time,b.payment_method,b.payment_status,b.total_amount,b.status
            FROM bookings b JOIN users u ON b.user_id=u.id
            JOIN time_slots ts ON b.time_slot_id=ts.id
            JOIN courts c ON ts.court_id=c.id JOIN locations l ON c.location_id=l.id
            ORDER BY b.booking_date DESC""")
        rows = cur.fetchall()
        cur.close()
        return jsonify([{'booking_id':r[0],'user_name':r[1],'user_email':r[2],'venue_name':r[3],
            'court_name':r[4],'date':str(r[5]),'start_time':str(r[6]),'end_time':str(r[7]),
            'payment_method':r[8],'payment_status':r[9],
            'total_amount':float(r[10]) if r[10] else 0,'status':r[11]} for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500