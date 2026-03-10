from flask import Blueprint, request, jsonify

reviews_bp = Blueprint('reviews', __name__)

mysql = None
def init_mysql(db):
    global mysql
    mysql = db

# ── GET: All reviews for a venue ─────────────────────
@reviews_bp.route('/venue/<int:venue_id>', methods=['GET'])
def get_venue_reviews(venue_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT r.id, r.rating, r.comment, r.created_at,
                   u.full_name, r.user_id
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.venue_id = %s
            ORDER BY r.created_at DESC
        """, (venue_id,))
        rows = cur.fetchall()
        cur.close()
        reviews = [{
            'id':         row[0],
            'rating':     row[1],
            'comment':    row[2],
            'created_at': str(row[3]),
            'user_name':  row[4],
            'user_id':    row[5],
        } for row in rows]
        # Compute average rating
        avg = round(sum(r['rating'] for r in reviews) / len(reviews), 1) if reviews else 0
        return jsonify({ 'reviews': reviews, 'average_rating': avg, 'total': len(reviews) }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET: Check if user already reviewed a booking ────
@reviews_bp.route('/check/<int:booking_id>', methods=['GET'])
def check_review(booking_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM reviews WHERE booking_id = %s", (booking_id,))
        row = cur.fetchone()
        cur.close()
        return jsonify({ 'reviewed': row is not None }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── POST: Submit a review ─────────────────────────────
@reviews_bp.route('/submit', methods=['POST'])
def submit_review():
    data       = request.get_json(force=True, silent=True) or {}
    user_id    = data.get('user_id')
    venue_id   = data.get('venue_id')
    booking_id = data.get('booking_id')
    rating     = data.get('rating')
    comment    = data.get('comment', '').strip()

    if not all([user_id, venue_id, booking_id, rating, comment]):
        return jsonify({'error': 'All fields are required.'}), 400
    if not (1 <= int(rating) <= 5):
        return jsonify({'error': 'Rating must be between 1 and 5.'}), 400
    if len(comment) < 1:
        return jsonify({'error': 'Please write a comment.'}), 400

    try:
        cur = mysql.connection.cursor()
        # Check booking belongs to this user
        cur.execute("SELECT id, status FROM bookings WHERE id = %s AND user_id = %s", (booking_id, user_id))
        booking = cur.fetchone()
        if not booking:
            return jsonify({'error': 'Booking not found or does not belong to you.'}), 403

        # Check not already reviewed
        cur.execute("SELECT id FROM reviews WHERE booking_id = %s", (booking_id,))
        if cur.fetchone():
            return jsonify({'error': 'You have already reviewed this booking.'}), 409

        cur.execute("""
            INSERT INTO reviews (user_id, venue_id, booking_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, venue_id, booking_id, rating, comment))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Review submitted successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── GET: All reviews (admin) ──────────────────────────
@reviews_bp.route('/all', methods=['GET'])
def get_all_reviews():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT r.id, r.rating, r.comment, r.created_at,
                   u.full_name, l.name, r.venue_id, r.booking_id
            FROM reviews r
            JOIN users u     ON r.user_id  = u.id
            JOIN locations l ON r.venue_id = l.id
            ORDER BY r.created_at DESC
        """)
        rows = cur.fetchall()
        cur.close()
        return jsonify([{
            'id':         row[0],
            'rating':     row[1],
            'comment':    row[2],
            'created_at': str(row[3]),
            'user_name':  row[4],
            'venue_name': row[5],
            'venue_id':   row[6],
            'booking_id': row[7],
        } for row in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── DELETE: Delete a review (admin) ──────────────────
@reviews_bp.route('/delete/<int:review_id>', methods=['DELETE'])
def delete_review(review_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM reviews WHERE id = %s", (review_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Review deleted.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500