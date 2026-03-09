/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://127.0.0.1:5000/api';
const ML  = 'http://127.0.0.1:5000/api/ml';

function Booking() {
  const { courtId } = useParams();
  const navigate    = useNavigate();
  const user        = JSON.parse(localStorage.getItem('cannonball_user') || 'null');

  const [slots,         setSlots]         = useState([]);
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0]);
  const [loading,       setLoading]       = useState(false);
  const [slotsLoading,  setSlotsLoading]  = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [aiRecs,        setAiRecs]        = useState([]);
  const [cancelRisk,    setCancelRisk]    = useState(null);
  const [peakScore,     setPeakScore]     = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);

  // ── Fetch available slots ──────────────────────────
  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const res = await axios.get(`${API}/bookings/slots/${courtId}?date=${date}`);
      setSlots(res.data);
    } catch { setError('Failed to load time slots.'); }
    setSlotsLoading(false);
  };

  // ── Fetch DB-based AI recommendations ─────────────
  const fetchAiRecs = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${ML}/recommend/${user.id}`);
      setAiRecs(res.data.slice(0, 3));
    } catch {}
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchSlots();
    fetchAiRecs();
  }, [date]);

  // ── Live AI predictions when slot/payment changes ──
  useEffect(() => {
    if (!selectedSlot) { setCancelRisk(null); setPeakScore(null); return; }
    const fetchAI = async () => {
      setAiLoading(true);
      const h   = parseInt(selectedSlot.start_time?.toString().split(':')[0] || '18');
      const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      const slotNum   = h < 12 ? 1 : h < 17 ? 5 : 8;
      const d         = new Date(date);
      const isWeekend = (d.getDay() === 0 || d.getDay() === 6) ? 1 : 0;
      const month     = d.getMonth() + 1;
      const startStr  = selectedSlot.start_time?.toString().slice(0, 5) || '18:00';
      try {
        const [riskRes, peakRes] = await Promise.all([
          axios.post(`${ML}/cancel-risk`, {
            time_slot: slotNum, is_weekend: isWeekend,
            month, time_of_day: tod, payment_method: paymentMethod, price: 1500,
          }),
          axios.post(`${ML}/peak`, {
            court_id: parseInt(courtId), start_time: startStr,
            time_of_day: tod, venue_name: 'Colombo Sports Arena',
            is_peak: tod !== 'morning' ? 1 : 0,
            weekday_bookings: 100, weekend_bookings: 60,
          }),
        ]);
        setCancelRisk(riskRes.data);
        setPeakScore(peakRes.data);
      } catch {}
      setAiLoading(false);
    };
    fetchAI();
  }, [selectedSlot, paymentMethod]);

  // ── Create booking ─────────────────────────────────
  const handleBook = async () => {
    if (!selectedSlot) { setError('Please select a time slot.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      await axios.post(`${API}/bookings/create`, {
        user_id: user.id, time_slot_id: selectedSlot.id,
        payment_method: paymentMethod, total_amount: 1500,
      });
      setSuccess('🎉 Booking confirmed! Have a great game!');
      setSelectedSlot(null); setCancelRisk(null); setPeakScore(null);
      fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Try again.');
    }
    setLoading(false);
  };

  // ── Helpers ────────────────────────────────────────
  const fmt = (t) => {
    if (!t) return '';
    const [h, m] = t.toString().split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const riskColor = (r) => r === 'High Risk' ? '#e74c3c' : r === 'Medium Risk' ? '#ffc107' : '#00e676';
  const peakColor = (s) => s >= 8 ? '#e74c3c' : s >= 6 ? '#ff6b35' : s >= 4 ? '#ffc107' : '#00e676';
  const peakLabel = (s) => s >= 8 ? 'Very Busy' : s >= 6 ? 'Busy' : s >= 4 ? 'Moderate' : 'Quiet';

  return (
    <div style={S.page}>
      <button onClick={() => navigate('/venues')} style={S.back}>← Back to Venues</button>

      <div style={S.grid}>
        {/* ── LEFT: slot picker + payment ── */}
        <div>
          <div style={S.card}>
            <h2 style={S.title}>⏰ Select Time Slot</h2>
            <label style={S.lbl}>Date</label>
            <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
              onChange={e => { setDate(e.target.value); setSelectedSlot(null); }} style={S.input} />

            {error   && <div style={S.err}>{error}</div>}
            {success && <div style={S.succ}>{success}</div>}

            {slotsLoading
              ? <p style={S.muted}>Loading slots...</p>
              : slots.length === 0
              ? <p style={S.muted}>No slots available for this date. Try another date or ask admin to generate slots.</p>
              : (
                <div style={S.slotGrid}>
                  {slots.map(slot => (
                    <div key={slot.id} onClick={() => setSelectedSlot(slot)}
                      style={{...S.slot, ...(selectedSlot?.id === slot.id ? S.slotOn : {})}}>
                      <span style={S.slotT}>{fmt(slot.start_time)}</span>
                      <span style={S.slotArr}>→</span>
                      <span style={S.slotT}>{fmt(slot.end_time)}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {selectedSlot && (
            <div style={{...S.card, marginTop: '20px'}}>
              <h2 style={S.title}>💳 Payment Method</h2>
              <div style={S.payRow}>
                {[
                  { id: 'cash',   icon: '💵', label: 'Cash on Arrival',  tip: null },
                  { id: 'online', icon: '💳', label: 'Online Payment',   tip: '✅ Lower cancellation risk' },
                ].map(m => (
                  <div key={m.id} onClick={() => setPaymentMethod(m.id)}
                    style={{...S.payOpt, ...(paymentMethod === m.id ? S.payOn : {})}}>
                    <span style={{fontSize: '28px'}}>{m.icon}</span>
                    <span style={S.payLbl}>{m.label}</span>
                    {m.tip && <span style={S.payTip}>{m.tip}</span>}
                  </div>
                ))}
              </div>
              <button onClick={handleBook} disabled={loading} style={S.bookBtn}>
                {loading ? 'Confirming...' : '⚽ Confirm Booking'}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: summary + AI panel + recs ── */}
        <div>
          {selectedSlot && (
            <div style={S.card}>
              <h2 style={S.title}>📋 Booking Summary</h2>
              {[
                ['Date',    date],
                ['Time',    `${fmt(selectedSlot.start_time)} – ${fmt(selectedSlot.end_time)}`],
                ['Payment', paymentMethod === 'cash' ? '💵 Cash' : '💳 Online'],
              ].map(([k, v]) => (
                <div key={k} style={S.row}>
                  <span style={S.rowK}>{k}</span>
                  <span style={S.rowV}>{v}</span>
                </div>
              ))}
              <div style={{...S.row, borderBottom: 'none'}}>
                <span style={S.rowK}>Total</span>
                <span style={{...S.rowV, color: '#00e676', fontWeight: '700', fontSize: '18px'}}>Rs. 1,500</span>
              </div>

              {/* ── LIVE AI PANEL ── */}
              <div style={S.aiPanel}>
                <p style={S.aiHdr}>🤖 Live AI Predictions</p>
                {aiLoading
                  ? <p style={S.muted}>Analysing slot...</p>
                  : (
                    <>
                      {cancelRisk && (
                        <div style={S.aiRow}>
                          <div style={{flex: 1}}>
                            <p style={S.aiLbl}>Cancellation Risk</p>
                            <p style={{...S.aiVal, color: riskColor(cancelRisk.risk_level)}}>
                              {cancelRisk.risk_level}
                            </p>
                            <p style={S.aiNote}>{cancelRisk.suggestion}</p>
                          </div>
                          <div style={{...S.aiBadge,
                            background: riskColor(cancelRisk.risk_level) + '18',
                            color: riskColor(cancelRisk.risk_level)}}>
                            {cancelRisk.cancellation_probability}%
                          </div>
                        </div>
                      )}
                      {peakScore && (
                        <div style={{...S.aiRow, marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                          <div style={{flex: 1}}>
                            <p style={S.aiLbl}>Court Demand</p>
                            <p style={{...S.aiVal, color: peakColor(peakScore.popularity_score)}}>
                              {peakLabel(peakScore.popularity_score)}
                            </p>
                            <p style={S.aiNote}>Popularity score: {peakScore.popularity_score}/10</p>
                          </div>
                          <div style={{...S.aiBadge,
                            background: peakColor(peakScore.popularity_score) + '18',
                            color: peakColor(peakScore.popularity_score)}}>
                            {peakScore.popularity_score}
                          </div>
                        </div>
                      )}
                    </>
                  )
                }
              </div>
            </div>
          )}

          {/* ── DB AI RECS ── */}
          {aiRecs.length > 0 && (
            <div style={{...S.card, marginTop: selectedSlot ? '20px' : '0'}}>
              <h2 style={S.title}>🎯 Suggested For You</h2>
              <p style={{...S.muted, textAlign: 'left', padding: '0 0 14px 0'}}>Based on your booking history</p>
              {aiRecs.map((rec, i) => (
                <div key={i} style={S.recCard}>
                  <div style={{flex: 1}}>
                    <p style={S.recVenue}>{rec.venue_name} — {rec.court_name}</p>
                    <p style={S.recTime}>{rec.date} · {fmt(rec.start_time)}</p>
                  </div>
                  <div style={S.recScore}>
                    <span style={S.recNum}>{rec.recommendation_score}</span>
                    <span style={S.recLbl}>score</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  page:    { maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' },
  back:    { background: 'transparent', color: '#7a8da8', border: '1px solid rgba(122,141,168,0.3)', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", marginBottom: '28px', fontSize: '14px' },
  grid:    { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' },
  card:    { background: '#162032', border: '1px solid rgba(0,230,118,0.12)', borderRadius: '16px', padding: '28px' },
  title:   { fontFamily: "'Bebas Neue',sans-serif", fontSize: '24px', color: '#e8edf5', letterSpacing: '1.5px', marginBottom: '20px' },
  lbl:     { display: 'block', fontSize: '12px', fontWeight: '700', color: '#7a8da8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' },
  input:   { width: '100%', padding: '12px 16px', background: '#0d1421', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '10px', color: '#e8edf5', fontFamily: "'Outfit',sans-serif", fontSize: '15px', marginBottom: '20px', display: 'block', boxSizing: 'border-box' },
  err:     { background: 'rgba(231,76,60,0.12)', color: '#e74c3c', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '14px' },
  succ:    { background: 'rgba(0,230,118,0.1)', color: '#00e676', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '14px' },
  muted:   { color: '#7a8da8', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  slotGrid:{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '10px' },
  slot:    { background: '#0d1421', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '10px', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', cursor: 'pointer' },
  slotOn:  { background: 'rgba(0,230,118,0.15)', border: '1px solid #00e676' },
  slotT:   { color: '#e8edf5', fontWeight: '600', fontSize: '14px' },
  slotArr: { color: '#7a8da8', fontSize: '12px' },
  payRow:  { display: 'flex', gap: '14px', marginBottom: '22px' },
  payOpt:  { flex: 1, background: '#0d1421', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' },
  payOn:   { background: 'rgba(0,230,118,0.12)', border: '1px solid #00e676' },
  payLbl:  { color: '#e8edf5', fontWeight: '600', fontSize: '13px', textAlign: 'center' },
  payTip:  { color: '#00e676', fontSize: '11px', textAlign: 'center' },
  bookBtn: { width: '100%', background: '#00e676', color: '#080c14', padding: '15px', borderRadius: '10px', border: 'none', fontFamily: "'Outfit',sans-serif", fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  row:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  rowK:    { color: '#7a8da8', fontSize: '14px' },
  rowV:    { color: '#e8edf5', fontWeight: '600', fontSize: '14px' },
  aiPanel: { background: '#0d1421', borderRadius: '12px', padding: '16px', marginTop: '18px', border: '1px solid rgba(0,188,212,0.2)' },
  aiHdr:   { color: '#00bcd4', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px 0' },
  aiRow:   { display: 'flex', alignItems: 'center', gap: '12px' },
  aiLbl:   { color: '#7a8da8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px 0' },
  aiVal:   { fontWeight: '700', fontSize: '15px', margin: '0 0 3px 0' },
  aiNote:  { color: '#7a8da8', fontSize: '11px', margin: 0 },
  aiBadge: { padding: '8px 12px', borderRadius: '10px', fontWeight: '700', fontSize: '20px', fontFamily: "'Bebas Neue',sans-serif", minWidth: '52px', textAlign: 'center' },
  recCard: { background: '#0d1421', borderRadius: '10px', padding: '14px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  recVenue:{ color: '#e8edf5', fontWeight: '600', fontSize: '14px', marginBottom: '4px' },
  recTime: { color: '#7a8da8', fontSize: '12px' },
  recScore:{ display: 'flex', flexDirection: 'column', alignItems: 'center' },
  recNum:  { color: '#00e676', fontWeight: '700', fontSize: '20px' },
  recLbl:  { color: '#7a8da8', fontSize: '11px' },
};

export default Booking;