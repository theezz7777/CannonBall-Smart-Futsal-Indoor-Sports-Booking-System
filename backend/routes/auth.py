from flask import Blueprint, request, jsonify
import hashlib

auth_bp = Blueprint('auth', __name__)
mysql = None

def init_mysql(db):
    global mysql
    mysql = db

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    full_name = data.get('full_name')
    email     = data.get('email')
    phone     = data.get('phone', '')
    password  = data.get('password')
    if not full_name or not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    try:
        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO users (full_name, email, phone, password_hash) VALUES (%s,%s,%s,%s)",
                    (full_name, email, phone, password_hash))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'User registered successfully!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data          = request.get_json()
    email         = data.get('email')
    password      = data.get('password')
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, full_name, email, role FROM users WHERE email=%s AND password_hash=%s",
                    (email, password_hash))
        user = cur.fetchone()
        cur.close()
        if user:
            return jsonify({'message': 'Login successful!', 'user': {
                'id': user[0], 'full_name': user[1], 'email': user[2], 'role': user[3]
            }}), 200
        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""SELECT u.id, u.full_name, u.email, u.phone, u.role, u.created_at,
                       COUNT(b.id) as total_bookings
                       FROM users u
                       LEFT JOIN bookings b ON u.id = b.user_id
                       GROUP BY u.id ORDER BY u.created_at DESC""")
        rows = cur.fetchall()
        cur.close()
        return jsonify([{
            'id':r[0],'full_name':r[1],'email':r[2],
            'phone':r[3] or '','role':r[4],'created_at':str(r[5]),
            'total_bookings': int(r[6])
        } for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>/make-admin', methods=['PUT'])
def make_admin(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE users SET role='admin' WHERE id=%s", (user_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'User promoted to admin!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>/remove-admin', methods=['PUT'])
def remove_admin(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("UPDATE users SET role='user' WHERE id=%s", (user_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'Admin role removed.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM bookings WHERE user_id=%s", (user_id,))
        cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'User deleted.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500