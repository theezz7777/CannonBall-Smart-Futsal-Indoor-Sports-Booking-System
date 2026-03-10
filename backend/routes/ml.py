from flask import Blueprint, request, jsonify
import joblib, json, os
import numpy as np

ml_bp = Blueprint('ml', __name__)

mysql = None
def init_mysql(db):
    global mysql
    mysql = db

MODELS_DIR = 'ml_models'

def load_model(name):
    path = os.path.join(MODELS_DIR, name)
    if os.path.exists(path):
        return joblib.load(path)
    return None

model_rec    = None
model_peak   = None
model_cancel = None
le_venue = le_day = le_payment = le_time = le_tod = None
le_stime = le_stod = le_svenue = None
tod_count_cols = None
user_tod_counts = None

def load_all_models():
    global model_rec, model_peak, model_cancel
    global le_venue, le_day, le_payment, le_time, le_tod
    global le_stime, le_stod, le_svenue
    global tod_count_cols, user_tod_counts
    model_rec       = load_model('slot_recommender.pkl')
    model_peak      = load_model('peak_predictor.pkl')
    model_cancel    = load_model('cancellation_predictor.pkl')
    le_venue        = load_model('le_venue.pkl')
    le_day          = load_model('le_day.pkl')
    le_payment      = load_model('le_payment.pkl')
    le_time         = load_model('le_time.pkl')
    le_tod          = load_model('le_tod.pkl')
    le_stime        = load_model('le_slot_time.pkl')
    le_stod         = load_model('le_slot_tod.pkl')
    le_svenue       = load_model('le_slot_venue.pkl')
    tod_count_cols  = load_model('tod_count_cols.pkl')
    user_tod_counts = load_model('user_tod_counts.pkl')

load_all_models()

TOD_SLOTS = {
    'morning':   [{'slot':1,'start':'08:00','end':'09:00'},{'slot':2,'start':'09:00','end':'10:00'},
                  {'slot':3,'start':'10:00','end':'11:00'},{'slot':4,'start':'11:00','end':'12:00'}],
    'afternoon': [{'slot':5,'start':'14:00','end':'15:00'},{'slot':6,'start':'15:00','end':'16:00'},
                  {'slot':7,'start':'16:00','end':'17:00'}],
    'evening':   [{'slot':8,'start':'17:00','end':'18:00'},{'slot':9,'start':'18:00','end':'19:00'},
                  {'slot':10,'start':'19:00','end':'20:00'}],
}

# ── DB ROUTE 1: Recommend from user history ──────────
@ml_bp.route('/recommend/<int:user_id>', methods=['GET'])
def recommend_from_db(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT ts.start_time, ts.date, c.sport_type
            FROM bookings b
            JOIN time_slots ts ON b.time_slot_id = ts.id
            JOIN courts c ON ts.court_id = c.id
            WHERE b.user_id = %s
        """, (user_id,))
        history = cur.fetchall()
        cur.execute("""
            SELECT ts.id, ts.date, ts.start_time, ts.end_time,
                   c.court_name, c.sport_type, c.price_per_hour, l.name
            FROM time_slots ts
            JOIN courts c ON ts.court_id = c.id
            JOIN locations l ON c.location_id = l.id
            WHERE ts.is_available = TRUE AND ts.date >= CURDATE()
            LIMIT 20
        """)
        available = cur.fetchall()
        cur.close()
        preferred_hour = 18
        if history:
            hours = [int(str(row[0]).split(':')[0]) for row in history]
            preferred_hour = max(set(hours), key=hours.count)
        recommendations = []
        for slot in available:
            slot_hour = int(str(slot[2]).split(':')[0])
            score = 100 - abs(slot_hour - preferred_hour) * 10
            recommendations.append({
                'slot_id': slot[0], 'date': str(slot[1]),
                'start_time': str(slot[2]), 'end_time': str(slot[3]),
                'court_name': slot[4], 'sport_type': slot[5],
                'price_per_hour': float(slot[6]), 'venue_name': slot[7],
                'recommendation_score': max(score, 10)
            })
        recommendations.sort(key=lambda x: x['recommendation_score'], reverse=True)
        return jsonify(recommendations[:5]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── DB ROUTE 2: Peak hours from live DB ─────────────
@ml_bp.route('/peak-hours', methods=['GET'])
def peak_hours_db():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT HOUR(ts.start_time) as hour, COUNT(*) as bookings
            FROM bookings b
            JOIN time_slots ts ON b.time_slot_id = ts.id
            GROUP BY HOUR(ts.start_time)
            ORDER BY bookings DESC
        """)
        rows = cur.fetchall()
        cur.close()
        return jsonify([{'hour': f"{r[0]}:00", 'bookings': r[1]} for r in rows]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── ML ROUTE 1: Recommend using trained model ────────
@ml_bp.route('/recommend', methods=['POST'])
def recommend_ml():
    if not model_rec:
        return jsonify({'error': 'Models not trained yet. Run train_model.py first!'}), 503

    data        = request.get_json()
    user_id     = data.get('user_id', 1)
    venue_name  = data.get('venue_name', 'Colombo Sports Arena')
    day_of_week = data.get('day_of_week', 'Saturday')
    is_weekend  = data.get('is_weekend', 1)
    month       = data.get('month', 6)
    payment     = data.get('payment_method', 'cash')

    try:
        venue_enc   = le_venue.transform([venue_name])[0]   if venue_name  in le_venue.classes_   else 0
        day_enc     = le_day.transform([day_of_week])[0]    if day_of_week in le_day.classes_     else 0
        payment_enc = le_payment.transform([payment])[0]    if payment     in le_payment.classes_ else 0

        # Get this user's historical time-of-day counts
        counts = {}
        if user_tod_counts is not None and user_id in user_tod_counts.index:
            row = user_tod_counts.loc[user_id]
            counts = row.to_dict()

        feature_row = [venue_enc, day_enc, is_weekend, month, payment_enc]
        for col in tod_count_cols:
            feature_row.append(counts.get(col, 0))

        features = np.array([feature_row])
        probs    = model_rec.predict_proba(features)[0]
        classes  = model_rec.classes_

        # Build top 3 time-of-day recommendations
        top_idx = np.argsort(probs)[::-1]
        recommendations = []
        for idx in top_idx:
            tod_encoded = int(classes[idx])
            tod_name    = le_tod.inverse_transform([tod_encoded])[0]
            example_slots = TOD_SLOTS.get(tod_name, [])
            recommendations.append({
                'time_of_day': tod_name.capitalize(),
                'confidence':  round(float(probs[idx]) * 100, 1),
                'slots':       example_slots,
            })

        return jsonify({
            'user_id':         user_id,
            'venue':           venue_name,
            'day':             day_of_week,
            'recommendations': recommendations,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── ML ROUTE 2: Peak score for a slot ────────────────
@ml_bp.route('/peak', methods=['POST'])
def predict_peak():
    if not model_peak:
        return jsonify({'error': 'Models not trained yet. Run train_model.py first!'}), 503
    data        = request.get_json()
    court_id    = data.get('court_id', 1)
    start_time  = data.get('start_time', '18:00')
    time_of_day = data.get('time_of_day', 'evening')
    venue_name  = data.get('venue_name', 'Colombo Sports Arena')
    is_peak     = data.get('is_peak', 1)
    weekday_bk  = data.get('weekday_bookings', 100)
    weekend_bk  = data.get('weekend_bookings', 80)
    try:
        time_enc  = le_stime.transform([start_time])[0]  if start_time  in le_stime.classes_  else 0
        tod_enc   = le_stod.transform([time_of_day])[0]  if time_of_day in le_stod.classes_   else 0
        venue_enc = le_svenue.transform([venue_name])[0] if venue_name  in le_svenue.classes_ else 0
        features  = np.array([[court_id, time_enc, tod_enc, venue_enc, is_peak, weekday_bk, weekend_bk]])
        score     = float(model_peak.predict(features)[0])
        score     = round(max(0, min(10, score)), 2)
        level = 'Very High' if score >= 8 else 'High' if score >= 6 else 'Medium' if score >= 4 else 'Low'
        return jsonify({'court_id': court_id, 'start_time': start_time,
                        'popularity_score': score, 'demand_level': level}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── ML ROUTE 3: Cancellation risk ────────────────────
@ml_bp.route('/cancel-risk', methods=['POST'])
def cancel_risk():
    if not model_cancel:
        return jsonify({'error': 'Models not trained yet. Run train_model.py first!'}), 503
    data           = request.get_json()
    time_slot      = data.get('time_slot', 8)
    is_weekend     = data.get('is_weekend', 0)
    month          = data.get('month', 6)
    time_of_day    = data.get('time_of_day', 'evening')
    payment_method = data.get('payment_method', 'cash')
    price          = data.get('price', 1500)
    try:
        time_enc    = le_time.transform([time_of_day])[0]       if time_of_day    in le_time.classes_    else 0
        payment_enc = le_payment.transform([payment_method])[0] if payment_method in le_payment.classes_ else 0
        features    = np.array([[time_slot, is_weekend, month, time_enc, payment_enc, price]])
        prob        = model_cancel.predict_proba(features)[0][1]
        risk_pct    = round(float(prob) * 100, 1)
        risk_level  = 'High Risk' if risk_pct >= 20 else 'Medium Risk' if risk_pct >= 10 else 'Low Risk'
        suggestion  = 'Consider online payment to reduce risk.' if payment_method == 'cash' and risk_pct > 15 else 'Booking looks stable!'
        return jsonify({'cancellation_probability': risk_pct,
                        'risk_level': risk_level, 'suggestion': suggestion}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── ML ROUTE 4: AI analytics summary ─────────────────
@ml_bp.route('/summary', methods=['GET'])
def ai_summary():
    path = os.path.join(MODELS_DIR, 'analytics_summary.json')
    if not os.path.exists(path):
        return jsonify({'error': 'Run train_model.py first!'}), 503
    with open(path) as f:
        summary = json.load(f)
    summary['models_loaded'] = {
        'slot_recommender':       model_rec    is not None,
        'peak_predictor':         model_peak   is not None,
        'cancellation_predictor': model_cancel is not None,
    }
    return jsonify(summary), 200

# ── ML ROUTE 5: All slot peak scores ─────────────────
@ml_bp.route('/all-peaks', methods=['GET'])
def all_peaks():
    if not model_peak:
        return jsonify({'error': 'Models not trained yet.'}), 503
    results = []

    # Realistic demand volumes per time slot — morning quiet, evening busy
    slot_config = [
        ('08:00', 'morning',   0, 18, 10),
        ('09:00', 'morning',   0, 22, 14),
        ('10:00', 'morning',   0, 25, 18),
        ('11:00', 'morning',   0, 30, 22),
        ('14:00', 'afternoon', 1, 45, 38),
        ('15:00', 'afternoon', 1, 55, 48),
        ('16:00', 'afternoon', 1, 65, 58),
        ('17:00', 'evening',   1, 78, 72),
        ('18:00', 'evening',   1, 90, 85),
        ('19:00', 'evening',   1, 95, 92),
    ]

    # Fetch real courts from DB
    courts = []
    db_error = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT c.id, c.court_name, l.name
            FROM courts c
            JOIN locations l ON c.location_id = l.id
            ORDER BY c.id
        """)
        courts = cur.fetchall()
        cur.close()
    except Exception as db_err:
        db_error = str(db_err)
        courts = [(1, 'Court A', 'Colombo Sports Arena')]

    if not courts:
        courts = [(1, 'Court A', 'Colombo Sports Arena')]

    # Use first known venue name from encoder as safe fallback
    safe_venue = le_svenue.classes_[0] if le_svenue is not None and len(le_svenue.classes_) > 0 else 'Colombo Sports Arena'

    for court_id, court_name, venue_name in courts:
        # Use real venue name if encoder knows it, else safe fallback
        v = venue_name if (le_svenue is not None and venue_name in le_svenue.classes_) else safe_venue
        for start, tod, is_pk, wday_bk, wend_bk in slot_config:
            try:
                time_enc  = le_stime.transform([start])[0] if (le_stime is not None and start in le_stime.classes_) else 0
                tod_enc   = le_stod.transform([tod])[0]    if (le_stod  is not None and tod   in le_stod.classes_)  else 0
                venue_enc = le_svenue.transform([v])[0]    if le_svenue is not None else 0
                features  = np.array([[court_id, time_enc, tod_enc, venue_enc, is_pk, wday_bk, wend_bk]])
                score     = round(max(0, min(10, float(model_peak.predict(features)[0]))), 2)
                results.append({
                    'court_id':         court_id,
                    'court_name':       court_name,
                    'venue_name':       venue_name,
                    'start_time':       start,
                    'time_of_day':      tod,
                    'popularity_score': score
                })
            except:
                pass
    return jsonify(results), 200