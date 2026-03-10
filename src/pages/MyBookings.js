/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API = 'http://127.0.0.1:5000/api';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display:'flex', gap:'6px' }}>
      {[1,2,3,4,5].map(star => (
        <span key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{ fontSize:'28px', cursor:'pointer', transition:'transform 0.1s',
            transform: (hovered || value) >= star ? 'scale(1.2)' : 'scale(1)',
            color: (hovered || value) >= star ? '#ffc107' : 'rgba(255,255,255,0.2)' }}>
          ★
        </span>
      ))}
    </div>
  );
}

function MyBookings() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('cannonball_user') || 'null');

  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [msg,        setMsg]        = useState('');
  const [filter,     setFilter]     = useState('all');
  const [cancelling, setCancelling] = useState(null);

  // Review state
  const [reviewed,      setReviewed]      = useState({});   // { booking_id: true/false }
  const [reviewOpen,    setReviewOpen]    = useState(null);  // booking_id with form open
  const [reviewRating,  setReviewRating]  = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/bookings/user/${user.id}`);
      const bks = res.data;
      setBookings(bks);
      // Check which bookings already have reviews
      const checks = await Promise.all(
        bks.map(b => axios.get(`${API}/reviews/check/${b.booking_id}`).catch(() => ({ data:{ reviewed:false } })))
      );
      const map = {};
      bks.forEach((b, i) => { map[b.booking_id] = checks[i].data.reviewed; });
      setReviewed(map);
    } catch { setError('Failed to load bookings.'); }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(bookingId);
    try {
      await axios.put(`${API}/bookings/cancel/${bookingId}`);
      setMsg('✅ Booking cancelled successfully.');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not cancel booking.');
    }
    setCancelling(null);
  };

  const openReviewForm = (bookingId) => {
    setReviewOpen(bookingId);
    setReviewRating(0);
    setReviewComment('');
  };

  const handleSubmitReview = async (booking) => {
    if (!reviewRating) { setError('Please select a star rating.'); return; }
    if (reviewComment.trim().length < 1) { setError('Please write a comment.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API}/reviews/submit`, {
        user_id:    user.id,
        venue_id:   booking.venue_id,
        booking_id: booking.booking_id,
        rating:     reviewRating,
        comment:    reviewComment.trim(),
      });
      setMsg('⭐ Review submitted! Thank you for your feedback.');
      setReviewOpen(null);
      setReviewed(prev => ({ ...prev, [booking.booking_id]: true }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit review.');
    }
    setSubmitting(false);
  };

  const fmt = (t) => {
    if (!t) return '';
    const [h, m] = t.toString().split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const statusStyle = (s) => ({
    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
    background: s === 'confirmed' ? 'rgba(0,230,118,0.12)' : s === 'cancelled' ? 'rgba(231,76,60,0.12)' : 'rgba(255,193,7,0.12)',
    color:      s === 'confirmed' ? '#00e676'              : s === 'cancelled' ? '#e74c3c'              : '#ffc107',
  });

  const ratingLabel = (r) => ['','😞 Poor','😐 Fair','🙂 Good','😊 Very Good','🤩 Excellent'][r] || '';

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const counts   = {
    all: bookings.length,
    confirmed:  bookings.filter(b => b.status === 'confirmed').length,
    cancelled:  bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.hdr}>
        <div>
          <p style={S.tag}>MY ACCOUNT</p>
          <h1 style={S.title}>My Bookings</h1>
          <p style={S.sub}>Track and manage all your futsal reservations</p>
        </div>
        <Link to="/venues" style={S.newBtn}>+ New Booking</Link>
      </div>

      {/* STATS */}
      <div style={S.statsRow}>
        {[
          { label:'Total Bookings', value: counts.all,       color:'#00bcd4' },
          { label:'Confirmed',      value: counts.confirmed, color:'#00e676' },
          { label:'Cancelled',      value: counts.cancelled, color:'#e74c3c' },
          { label:'Total Spent',    value:`Rs. ${(counts.confirmed * 1500).toLocaleString()}`, color:'#ffd700' },
        ].map((s, i) => (
          <div key={i} style={S.statCard}>
            <p style={{ ...S.statVal, color: s.color }}>{s.value}</p>
            <p style={S.statLbl}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* MESSAGES */}
      {error && <div style={S.errBox}><span>⚠️ {error}</span><button onClick={() => setError('')} style={S.xBtn}>✕</button></div>}
      {msg   && <div style={S.msgBox}><span>{msg}</span><button onClick={() => setMsg('')} style={{ ...S.xBtn, color:'#00e676' }}>✕</button></div>}

      {/* FILTER TABS */}
      <div style={S.tabs}>
        {['all','confirmed','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...S.tab, ...(filter === f ? S.tabOn : {}) }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ ...S.tabCount, background: filter === f ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.06)' }}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* BOOKING LIST */}
      {loading ? (
        <div style={S.empty}>Loading your bookings... ⏳</div>
      ) : filtered.length === 0 ? (
        <div style={S.emptyBox}>
          <p style={{ fontSize:'48px', margin:'0 0 16px 0' }}>🏟️</p>
          <p style={{ color:'#e8edf5', fontWeight:'700', fontSize:'18px', margin:'0 0 8px 0' }}>
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </p>
          <p style={{ color:'#7a8da8', fontSize:'14px', margin:'0 0 20px 0' }}>
            {filter === 'all' ? 'Book a court and start playing!' : 'Switch filter to see other bookings.'}
          </p>
          {filter === 'all' && <Link to="/venues" style={S.newBtn}>Browse Venues →</Link>}
        </div>
      ) : (
        <div style={S.list}>
          {filtered.map((b, i) => {
            const alreadyReviewed = reviewed[b.booking_id];
            const isOpen = reviewOpen === b.booking_id;

            return (
              <div key={b.booking_id || i} style={S.cardWrap}>
                {/* MAIN BOOKING CARD */}
                <div style={{ ...S.bookingCard, ...(b.status === 'cancelled' ? S.cancelledCard : {}) }}>
                  {/* LEFT */}
                  <div style={S.bLeft}>
                    <div style={S.bIcon}>⚽</div>
                    <div>
                      <p style={S.bVenue}>{b.venue_name || 'Futsal Court'}</p>
                      <p style={S.bCourt}>{b.court_name || `Court #${b.time_slot_id}`}</p>
                    </div>
                  </div>

                  {/* MIDDLE */}
                  <div style={S.bMid}>
                    <div style={S.bDetail}><span style={S.bIcon2}>📅</span><span style={S.bDetailTxt}>{b.date || b.booking_date || '—'}</span></div>
                    <div style={S.bDetail}><span style={S.bIcon2}>⏰</span><span style={S.bDetailTxt}>{fmt(b.start_time)} – {fmt(b.end_time)}</span></div>
                    <div style={S.bDetail}><span style={S.bIcon2}>{b.payment_method === 'cash' ? '💵' : '💳'}</span><span style={S.bDetailTxt}>{b.payment_method === 'cash' ? 'Cash' : 'Online'}</span></div>
                  </div>

                  {/* RIGHT */}
                  <div style={S.bRight}>
                    <p style={S.bAmount}>Rs. {(b.total_amount || 1500).toLocaleString()}</p>
                    <span style={statusStyle(b.status)}>{b.status}</span>
                    {b.status === 'confirmed' && (
                      <button onClick={() => handleCancel(b.booking_id)}
                        disabled={cancelling === b.booking_id} style={S.cancelBtn}>
                        {cancelling === b.booking_id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    {/* REVIEW BUTTON — only for confirmed bookings */}
                    {b.status === 'confirmed' && (
                      alreadyReviewed ? (
                        <div style={S.reviewedBadge}>⭐ Reviewed</div>
                      ) : (
                        <button onClick={() => openReviewForm(b.booking_id)} style={S.reviewBtn}>
                          ✍️ Leave Review
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* REVIEW FORM — slides open below the card */}
                {isOpen && (
                  <div style={S.reviewForm}>
                    <p style={S.reviewFormTitle}>⭐ Rate your experience at {b.venue_name}</p>
                    <p style={S.reviewFormSub}>Your review helps other players choose the right venue</p>

                    {/* Star picker */}
                    <div style={S.starSection}>
                      <StarPicker value={reviewRating} onChange={setReviewRating} />
                      {reviewRating > 0 && (
                        <span style={S.ratingLabel}>{ratingLabel(reviewRating)}</span>
                      )}
                    </div>

                    {/* Comment box */}
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Tell us about your experience — the court condition, facilities, staff, etc."
                      maxLength={500}
                      rows={4}
                      style={S.textarea}
                    />
                    <p style={S.charCount}>{reviewComment.length}/500</p>

                    {/* Actions */}
                    <div style={S.formBtns}>
                      <button onClick={() => setReviewOpen(null)} style={S.formCancelBtn}>Cancel</button>
                      <button onClick={() => handleSubmitReview(b)} disabled={submitting || !reviewRating} style={S.formSubmitBtn}>
                        {submitting ? 'Submitting...' : '⭐ Submit Review'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  page:         { maxWidth:'1000px', margin:'0 auto', padding:'40px 24px' },
  hdr:          { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px' },
  tag:          { fontSize:'12px', fontWeight:'700', letterSpacing:'2px', color:'#00e676', marginBottom:'6px' },
  title:        { fontFamily:"'Bebas Neue',sans-serif", fontSize:'42px', color:'#e8edf5', letterSpacing:'2px', marginBottom:'4px' },
  sub:          { color:'#7a8da8', fontSize:'14px' },
  newBtn:       { background:'#00e676', color:'#080c14', padding:'11px 22px', borderRadius:'10px', textDecoration:'none', fontWeight:'700', fontSize:'14px', fontFamily:"'Outfit',sans-serif", whiteSpace:'nowrap' },
  statsRow:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' },
  statCard:     { background:'#162032', border:'1px solid rgba(0,230,118,0.1)', borderRadius:'12px', padding:'18px', textAlign:'center' },
  statVal:      { fontSize:'26px', fontWeight:'700', fontFamily:"'Bebas Neue',sans-serif", margin:'0 0 4px 0' },
  statLbl:      { color:'#7a8da8', fontSize:'12px', margin:0 },
  errBox:       { background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', color:'#e74c3c', display:'flex', justifyContent:'space-between', fontSize:'14px' },
  msgBox:       { background:'rgba(0,230,118,0.08)', border:'1px solid rgba(0,230,118,0.25)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', color:'#00e676', display:'flex', justifyContent:'space-between', fontSize:'14px' },
  xBtn:         { background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#e74c3c' },
  tabs:         { display:'flex', gap:'8px', marginBottom:'20px' },
  tab:          { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#7a8da8', padding:'9px 18px', borderRadius:'8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'14px', display:'flex', alignItems:'center', gap:'8px' },
  tabOn:        { background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.3)', color:'#00e676' },
  tabCount:     { padding:'2px 8px', borderRadius:'12px', fontSize:'12px' },
  list:         { display:'flex', flexDirection:'column', gap:'12px' },
  cardWrap:     { display:'flex', flexDirection:'column' },
  bookingCard:  { background:'#162032', border:'1px solid rgba(0,230,118,0.1)', borderRadius:'14px', padding:'20px 24px', display:'flex', alignItems:'center', gap:'24px' },
  cancelledCard:{ opacity:0.6 },
  bLeft:        { display:'flex', alignItems:'center', gap:'14px', minWidth:'200px' },
  bIcon:        { fontSize:'32px', background:'rgba(0,230,118,0.08)', borderRadius:'10px', width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center' },
  bVenue:       { color:'#e8edf5', fontWeight:'700', fontSize:'15px', margin:'0 0 3px 0' },
  bCourt:       { color:'#7a8da8', fontSize:'13px', margin:0 },
  bMid:         { flex:1, display:'flex', flexDirection:'column', gap:'6px' },
  bDetail:      { display:'flex', alignItems:'center', gap:'8px' },
  bIcon2:       { fontSize:'14px' },
  bDetailTxt:   { color:'#b0bec5', fontSize:'14px' },
  bRight:       { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px', minWidth:'130px' },
  bAmount:      { color:'#e8edf5', fontWeight:'700', fontSize:'18px', margin:0 },
  cancelBtn:    { background:'rgba(231,76,60,0.12)', color:'#e74c3c', border:'1px solid rgba(231,76,60,0.25)', padding:'6px 14px', borderRadius:'8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'12px' },
  reviewBtn:    { background:'rgba(255,193,7,0.1)', color:'#ffc107', border:'1px solid rgba(255,193,7,0.3)', padding:'6px 14px', borderRadius:'8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'12px' },
  reviewedBadge:{ background:'rgba(0,230,118,0.08)', color:'#00e676', border:'1px solid rgba(0,230,118,0.2)', padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:'600', textAlign:'center' },
  // Review form
  reviewForm:   { background:'#0d1421', border:'1px solid rgba(255,193,7,0.25)', borderRadius:'0 0 14px 14px', padding:'24px', borderTop:'none', marginTop:'-4px' },
  reviewFormTitle:{ color:'#e8edf5', fontWeight:'700', fontSize:'16px', margin:'0 0 4px 0' },
  reviewFormSub:{ color:'#7a8da8', fontSize:'13px', margin:'0 0 20px 0' },
  starSection:  { display:'flex', alignItems:'center', gap:'16px', marginBottom:'18px' },
  ratingLabel:  { color:'#ffc107', fontWeight:'600', fontSize:'15px' },
  textarea:     { width:'100%', background:'#162032', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#e8edf5', padding:'14px', fontSize:'14px', fontFamily:"'Outfit',sans-serif", resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.6 },
  charCount:    { color:'#7a8da8', fontSize:'12px', textAlign:'right', margin:'6px 0 16px 0' },
  formBtns:     { display:'flex', gap:'12px', justifyContent:'flex-end' },
  formCancelBtn:{ background:'transparent', color:'#7a8da8', border:'1px solid rgba(255,255,255,0.1)', padding:'10px 22px', borderRadius:'9px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'14px' },
  formSubmitBtn:{ background:'#ffc107', color:'#080c14', border:'none', padding:'10px 24px', borderRadius:'9px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'700', fontSize:'14px' },
  empty:        { textAlign:'center', color:'#7a8da8', padding:'60px', fontSize:'16px' },
  emptyBox:     { textAlign:'center', background:'#162032', border:'1px solid rgba(0,230,118,0.1)', borderRadius:'16px', padding:'60px 40px' },
};

export default MyBookings;