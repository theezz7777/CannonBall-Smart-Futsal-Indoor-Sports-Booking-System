# ⚽ CannonBall — Smart Futsal & Indoor Sports Booking System

![CannonBall](https://img.shields.io/badge/CannonBall-Smart%20Booking-00e676?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-Flask-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-Frontend-61dafb?style=for-the-badge&logo=react)
![MySQL](https://img.shields.io/badge/MySQL-Database-orange?style=for-the-badge&logo=mysql)
![ML](https://img.shields.io/badge/ML-scikit--learn-yellow?style=for-the-badge)

> A full-stack AI-powered futsal court booking system with real-time slot availability, machine learning predictions, and a complete admin dashboard.

**Student:** Theekshana Denuwan Samarawickrama Dahanayaka  
**ID:** CL/BSCSD/32/61 | st20282269  
**Module:** CIS6035 — Software Engineering Project

---

## 🚀 Features

- 🔐 **User Authentication** — Register, Login, JWT session management
- 🏟️ **Venue & Court Browsing** — Filter by district, view courts per venue
- 📅 **Smart Booking System** — Select date, time slot, payment method
- 🤖 **AI Predictions** — ML-powered slot recommendations and peak hour predictions
- ⭐ **Review System** — Leave star ratings and comments per booking
- 📊 **Admin Dashboard** — Full analytics, manage venues, courts, users, bookings, reviews
- 🗓️ **Auto Slot Generation** — Generate 180 days of time slots with one click

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Axios |
| Backend | Python, Flask, Flask-MySQLdb |
| Database | MySQL |
| ML Models | scikit-learn (Random Forest, Gradient Boosting, Logistic Regression) |
| Auth | bcrypt password hashing, localStorage session |

---

## 📁 Project Structure

```
CannonBall/
├── backend/
│   ├── app.py                  # Flask app entry point
│   ├── train_model.py          # ML model training script
│   ├── ml_models/              # Trained .pkl model files
│   ├── ml_data/                # Training datasets (.csv)
│   └── routes/
│       ├── auth.py             # Register / Login
│       ├── venues.py           # Venues & Courts CRUD
│       ├── bookings.py         # Booking management
│       ├── ml.py               # AI prediction endpoints
│       └── reviews.py          # Review system
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.js
│       │   ├── Venues.js
│       │   ├── Booking.js
│       │   ├── MyBookings.js
│       │   ├── Admin.js
│       │   ├── AIInsights.js
│       │   ├── Login.js
│       │   └── Register.js
│       └── components/
│           └── Navbar.js
└── README.md
```

## 🌐 Running the App

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Admin Panel | http://localhost:3000/admin |
| AI Insights | http://localhost:3000/ai |

---

## 🔑 Admin Access

To make a user admin, run in MySQL:
```sql
UPDATE users SET role='admin' WHERE email='your@email.com';
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/venues/` | Get all venues |
| GET | `/api/venues/:id/courts` | Get courts for a venue |
| GET | `/api/bookings/slots` | Get available time slots |
| POST | `/api/bookings/create` | Create a booking |
| PUT | `/api/bookings/cancel/:id` | Cancel a booking |
| GET | `/api/ml/recommend` | AI slot recommendation |
| GET | `/api/ml/all-peaks` | Peak hour predictions |
| POST | `/api/reviews/submit` | Submit a review |
| GET | `/api/reviews/venue/:id` | Get venue reviews |

---

## 🤖 ML Models

| Model | Algorithm | Purpose | Accuracy |
|---|---|---|---|
| Slot Recommender | Random Forest | Recommends best time slots | 35.3% CV |
| Peak Predictor | Gradient Boosting | Predicts busy hours | MAE: 0.12 |
| Cancellation Predictor | Logistic Regression | Predicts cancellation risk | 91.4% |

---

## 📸 Screenshots

| Page | Description |
|---|---|
| Home | Landing page with hero section |
| Venues | Venue listing with district filter and reviews |
| Booking | Court booking with AI prediction panel |
| My Bookings | User booking history with review form |
| Admin Dashboard | Analytics, manage venues, courts, users, reviews |
| AI Insights | Peak hour charts and ML recommendations |

---

## 📄 License

This project is submitted as part of the BSc Computer Science degree at Cardiff Metropolitan University / ICBT Campus.

© 2026 Theekshana Denuwan Samarawickrama Dahanayaka. All rights reserved.
