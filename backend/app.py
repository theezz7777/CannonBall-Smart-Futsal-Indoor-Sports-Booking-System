from flask import Flask
from flask_mysqldb import MySQL
from flask_cors import CORS
from routes.auth import auth_bp, init_mysql as auth_init
from routes.venues import venues_bp, init_mysql as venues_init
from routes.bookings import bookings_bp, init_mysql as bookings_init
from routes.ml import ml_bp, init_mysql as ml_init
from routes.reviews import reviews_bp, init_mysql as reviews_init

app = Flask(__name__)
CORS(app)

# ── MySQL Config ─────────────────────────────────────
import os
from dotenv import load_dotenv
load_dotenv()

app.config['MYSQL_HOST']     = os.getenv('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER']     = os.getenv('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', 'root')
app.config['MYSQL_DB']       = os.getenv('MYSQL_DB', 'cannonball')

mysql = MySQL(app)

auth_init(mysql)
venues_init(mysql)
bookings_init(mysql)
ml_init(mysql)
reviews_init(mysql)

# ── Register Blueprints ──────────────────────────────
app.register_blueprint(auth_bp,     url_prefix='/api/auth')
app.register_blueprint(venues_bp,   url_prefix='/api/venues')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(ml_bp,       url_prefix='/api/ml')
app.register_blueprint(reviews_bp,  url_prefix='/api/reviews')

@app.route('/')
def index():
    return {'message': 'CannonBall API running!', 'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True)