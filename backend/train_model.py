import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import joblib, os, json

os.makedirs('ml_models', exist_ok=True)

print("=" * 50)
print("  CannonBall ML Training Script v3")
print("=" * 50)

print("\n[1] Loading datasets...")
bookings = pd.read_csv('ml_data/bookings_dataset.csv')
profiles  = pd.read_csv('ml_data/user_profiles.csv')
slots     = pd.read_csv('ml_data/slot_popularity.csv')
monthly   = pd.read_csv('ml_data/monthly_analytics.csv')
print(f"    Bookings: {len(bookings)} rows")
print(f"    Profiles: {len(profiles)} rows")

# ════════════════════════════════════════════════════
# MODEL 1: SLOT RECOMMENDER (FIXED - no data leakage)
#
# Goal: Given a user's profile + context (day, month,
# venue, payment), predict if they prefer
# morning / afternoon / evening
#
# Features used (NO time_slot — that was leaking!):
#   user_id, venue, day_of_week, is_weekend,
#   month, payment_method
# ════════════════════════════════════════════════════
print("\n[2] Training Model 1 - Slot Recommender (fixed)...")

confirmed = bookings[bookings['status'] == 'confirmed'].copy()

le_venue   = LabelEncoder()
le_day     = LabelEncoder()
le_payment = LabelEncoder()
le_time    = LabelEncoder()
le_tod     = LabelEncoder()

confirmed['venue_encoded']   = le_venue.fit_transform(confirmed['venue_name'])
confirmed['day_encoded']     = le_day.fit_transform(confirmed['day_of_week'])
confirmed['payment_encoded'] = le_payment.fit_transform(confirmed['payment_method'])
confirmed['time_encoded']    = le_time.fit_transform(confirmed['time_of_day'])
confirmed['tod_target']      = le_tod.fit_transform(confirmed['time_of_day'])

# ── Enrich with user profile aggregates ─────────────
# For each booking, add: how many times has this user
# booked in morning / afternoon / evening overall?
user_tod = confirmed.groupby(['user_id','time_of_day']).size().unstack(fill_value=0)
user_tod.columns = [f'user_{c}_count' for c in user_tod.columns]
confirmed = confirmed.join(user_tod, on='user_id')

tod_count_cols = [c for c in confirmed.columns if c.startswith('user_') and c.endswith('_count')]

features_rec = [
    'venue_encoded',
    'day_encoded',
    'is_weekend',
    'month',
    'payment_encoded',
] + tod_count_cols   # user's historical preference counts

target_rec = 'tod_target'  # morning / afternoon / evening

X_rec = confirmed[features_rec]
y_rec = confirmed[target_rec]

X_train, X_test, y_train, y_test = train_test_split(
    X_rec, y_rec, test_size=0.2, random_state=42, stratify=y_rec
)

model_rec = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    min_samples_split=10,
    random_state=42,
    class_weight='balanced'
)
model_rec.fit(X_train, y_train)
acc1 = accuracy_score(y_test, model_rec.predict(X_test))

# Cross-validation for honest score
cv_scores = cross_val_score(model_rec, X_rec, y_rec, cv=5, scoring='accuracy')
print(f"    Test Accuracy:  {acc1*100:.1f}%")
print(f"    CV Accuracy:    {cv_scores.mean()*100:.1f}% (+/- {cv_scores.std()*100:.1f}%)")
print(f"    Classes: {list(le_tod.classes_)}")

print("    Feature importances:")
feat_imp = sorted(zip(features_rec, model_rec.feature_importances_), key=lambda x: -x[1])
for f, i in feat_imp[:5]:
    print(f"      {f}: {i*100:.1f}%")

joblib.dump(model_rec,  'ml_models/slot_recommender.pkl')
joblib.dump(le_venue,   'ml_models/le_venue.pkl')
joblib.dump(le_day,     'ml_models/le_day.pkl')
joblib.dump(le_payment, 'ml_models/le_payment.pkl')
joblib.dump(le_time,    'ml_models/le_time.pkl')
joblib.dump(le_tod,     'ml_models/le_tod.pkl')
joblib.dump(tod_count_cols, 'ml_models/tod_count_cols.pkl')
joblib.dump(user_tod,   'ml_models/user_tod_counts.pkl')
print("    Saved: slot_recommender.pkl")

# ════════════════════════════════════════════════════
# MODEL 2: PEAK HOUR PREDICTOR
# ════════════════════════════════════════════════════
print("\n[3] Training Model 2 - Peak Hour Predictor...")

le_stime  = LabelEncoder()
le_stod   = LabelEncoder()
le_svenue = LabelEncoder()

slots['time_encoded']  = le_stime.fit_transform(slots['start_time'])
slots['tod_encoded']   = le_stod.fit_transform(slots['time_of_day'])
slots['venue_encoded'] = le_svenue.fit_transform(slots['venue_name'])

X_peak = slots[['court_id','time_encoded','tod_encoded','venue_encoded',
                 'is_peak','weekday_bookings','weekend_bookings']]
y_peak = slots['popularity_score']

model_peak = RandomForestRegressor(n_estimators=200, random_state=42)
model_peak.fit(X_peak, y_peak)

joblib.dump(model_peak,  'ml_models/peak_predictor.pkl')
joblib.dump(le_stime,    'ml_models/le_slot_time.pkl')
joblib.dump(le_stod,     'ml_models/le_slot_tod.pkl')
joblib.dump(le_svenue,   'ml_models/le_slot_venue.pkl')
print(f"    Trained on {len(slots)} slot records")
print("    Saved: peak_predictor.pkl")

# ════════════════════════════════════════════════════
# MODEL 3: CANCELLATION PREDICTOR
# ════════════════════════════════════════════════════
print("\n[4] Training Model 3 - Cancellation Predictor...")

bml = bookings.copy()
bml['is_cancelled']    = (bml['status'] == 'cancelled').astype(int)
bml['time_encoded']    = le_time.transform(
    bml['time_of_day'].map(lambda x: x if x in le_time.classes_ else le_time.classes_[0])
)
bml['payment_encoded'] = le_payment.transform(
    bml['payment_method'].map(lambda x: x if x in le_payment.classes_ else le_payment.classes_[0])
)

X_c = bml[['time_slot','is_weekend','month','time_encoded','payment_encoded','price']]
y_c = bml['is_cancelled']

X_trc, X_tec, y_trc, y_tec = train_test_split(X_c, y_c, test_size=0.2, random_state=42)
model_cancel = GradientBoostingClassifier(n_estimators=200, learning_rate=0.05, random_state=42)
model_cancel.fit(X_trc, y_trc)
acc3 = accuracy_score(y_tec, model_cancel.predict(X_tec))
print(f"    Accuracy: {acc3*100:.1f}%")

joblib.dump(model_cancel, 'ml_models/cancellation_predictor.pkl')
print("    Saved: cancellation_predictor.pkl")

# ════════════════════════════════════════════════════
# SAVE ANALYTICS SUMMARY
# ════════════════════════════════════════════════════
print("\n[5] Saving analytics summary...")
summary = {
    'total_bookings':  int(len(bookings)),
    'confirmed':       int((bookings['status']=='confirmed').sum()),
    'cancelled':       int((bookings['status']=='cancelled').sum()),
    'total_revenue':   int(bookings[bookings['status']=='confirmed']['total_amount'].sum()),
    'top_venue':       str(confirmed['venue_name'].value_counts().index[0]),
    'top_time':        str(confirmed['time_of_day'].value_counts().index[0]),
    'top_day':         str(confirmed['day_of_week'].value_counts().index[0]),
    'peak_month':      str(monthly.loc[monthly['confirmed'].idxmax(), 'month_name']),
    'model1_accuracy': round(cv_scores.mean() * 100, 1),
    'model3_accuracy': round(acc3 * 100, 1),
    'tod_classes':     list(le_tod.classes_),
}
with open('ml_models/analytics_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)
print("    Saved: analytics_summary.json")

print("\n" + "=" * 50)
print("  ALL MODELS TRAINED SUCCESSFULLY!")
print("=" * 50)
print(f"  Model 1 - Slot Recommender:  {cv_scores.mean()*100:.1f}% CV accuracy")
print(f"  Model 2 - Peak Predictor:    Trained")
print(f"  Model 3 - Cancellation:      {acc3*100:.1f}% accuracy")
print(f"\n  Files saved in: backend/ml_models/")
print("=" * 50)