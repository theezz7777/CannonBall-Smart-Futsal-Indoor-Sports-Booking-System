/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://127.0.0.1:5000/api';
const DISTRICTS = ['All', 'Colombo', 'Kandy', 'Galle'];

function StarDisplay({ rating, size = 16 }) {
  return (
    <span style={{ fontSize: size + 'px', letterSpacing: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= rating ? '#ffc107' : 'rgba(255,255,255,0.15)' }}>★</span>
      ))}
    </span>
  );
}

function Venues() {
  const navigate  = useNavigate();
  const [venues,   setVenues]   = useState([]);
  const [courts,   setCourts]   = useState({});
  const [reviews,  setReviews]  = useState({});
  const [district, setDistrict] = useState('All');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showReviews, setShowReviews] = useState(null);

  useEffect(() => { fetchVenues(); }, [district]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const url = district === 'All'
        ? `${API}/venues/`
        : `${API}/venues/?district=${district}`;
      const res = await axios.get(url);
      setVenues(res.data);
      // Fetch ratings for all venues
      res.data.forEach(v => fetchReviews(v.id));
    } catch { setError('Failed to load venues.'); }
    setLoading(false);
  };

  const fetchReviews = async (venueId) => {
    try {
      const res = await axios.get(`${API}/reviews/venue/${venueId}`);
      setReviews(prev => ({ ...prev, [venueId]: res.data }));
    } catch {}
  };

  const loadCourts = async (venueId) => {
    if (expanded === venueId) { setExpanded(null); return; }
    try {
      const res = await axios.get(`${API}/venues/${venueId}/courts`);
      setCourts(prev => ({ ...prev, [venueId]: res.data }));
      setExpanded(venueId);
    } catch { setError('Failed to load courts.'); }
  };

  const handleBookNow = (courtId) => {
    const user = JSON.parse(localStorage.getItem('cannonball_user') || 'null');
    if (!user) { navigate('/login'); return; }
    navigate(`/booking/${courtId}`);
  };

  const sportColor = (s) => {
    const m = { Futsal:'rgba(0,230,118,0.15)', Basketball:'rgba(255,193,7,0.15)', Badminton:'rgba(0,188,212,0.15)', Tennis:'rgba(255,107,53,0.15)' };
    const t = { Futsal:'#00e676', Basketball:'#ffc107', Badminton:'#00bcd4', Tennis:'#ff6b35' };
    return { bg: m[s] || 'rgba(0,230,118,0.15)', color: t[s] || '#00e676' };
  };

  const sportIcon = (s) => ({ Futsal:'⚽', Basketball:'🏀', Badminton:'🏸', Tennis:'🎾' }[s] || '🏅');

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  return (
    <div style={S.wrapper}>
      {/* HEADER */}
      <div style={S.header}>
        <p style={S.tag}>BROWSE</p>
        <h1 style={S.title}>Available Venues</h1>
        <p style={S.sub}>Choose your district and find the perfect court</p>
      </div>

      {/* DISTRICT FILTERS */}
      <div style={S.filters}>
        {DISTRICTS.map(d => (
          <button key={d} onClick={() => setDistrict(d)}
            style={{ ...S.filterBtn, ...(district === d ? S.filterActive : {}) }}>
            {d}
          </button>
        ))}
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? <div style={S.loading}>Loading venues... ⚽</div>
        : venues.length === 0 ? <div style={S.empty}>No venues found in {district}.</div>
        : (
          <div style={S.grid}>
            {venues.map(venue => {
              const vr = reviews[venue.id];
              const avg = vr?.average_rating || 0;
              const total = vr?.total || 0;
              const last3 = (vr?.reviews || []).slice(0, 3);
              const showingReviews = showReviews === venue.id;

              return (
                <div key={venue.id} style={S.venueCard}>
                  {/* Banner */}
                  <div style={S.banner}>🏟️</div>

                  <div style={S.venueBody}>
                    {/* Name + Rating badge */}
                    <div style={S.nameRow}>
                      <h2 style={S.venueName}>{venue.name}</h2>
                      {avg > 0 && (
                        <div style={S.ratingBadge}>
                          <span style={S.ratingNum}>{avg}</span>
                          <span style={{ color:'#ffc107', fontSize:'13px' }}>★</span>
                        </div>
                      )}
                    </div>

                    <p style={S.venueAddr}>📍 {venue.address}, {venue.city}</p>
                    <p style={S.venueDesc}>{venue.description}</p>

                    {/* Star row + review count */}
                    <div style={S.starRow}>
                      <StarDisplay rating={Math.round(avg)} size={17} />
                      <span style={S.reviewCount}>
                        {total > 0 ? `${avg} · ${total} review${total !== 1 ? 's' : ''}` : 'No reviews yet'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={S.btnRow}>
                      <button style={S.viewBtn} onClick={() => loadCourts(venue.id)}>
                        {expanded === venue.id ? 'Hide Courts ▲' : 'View Courts ▼'}
                      </button>
                      {total > 0 && (
                        <button style={S.reviewToggleBtn}
                          onClick={() => setShowReviews(showingReviews ? null : venue.id)}>
                          {showingReviews ? 'Hide Reviews ▲' : `💬 Reviews (${total})`}
                        </button>
                      )}
                    </div>

                    {/* Courts */}
                    {expanded === venue.id && courts[venue.id] && (
                      <div style={S.courtsSection}>
                        <p style={S.sectionLabel}>Available Courts</p>
                        {courts[venue.id].map(court => {
                          const sc = sportColor(court.sport_type);
                          return (
                            <div key={court.id} style={S.courtRow}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <span style={S.courtName}>{court.court_name}</span>
                                <span style={{ ...S.sportTag, background: sc.bg, color: sc.color }}>
                                  {sportIcon(court.sport_type)} {court.sport_type}
                                </span>
                              </div>
                              <div style={S.courtRight}>
                                <span style={S.price}>Rs. {court.price_per_hour}/hr</span>
                                <button style={S.bookBtn} onClick={() => handleBookNow(court.id)}>Book Now</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reviews Section */}
                    {showingReviews && last3.length > 0 && (
                      <div style={S.reviewsSection}>
                        <p style={S.sectionLabel}>⭐ Customer Reviews</p>

                        {/* Rating summary bar */}
                        <div style={S.ratingSummary}>
                          <div style={S.bigRating}>
                            <span style={S.bigNum}>{avg}</span>
                            <StarDisplay rating={Math.round(avg)} size={18} />
                            <span style={{ color:'#7a8da8', fontSize:'12px' }}>{total} review{total !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={S.ratingBars}>
                            {[5,4,3,2,1].map(star => {
                              const count = (vr?.reviews || []).filter(r => r.rating === star).length;
                              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={star} style={S.barRow}>
                                  <span style={S.barLabel}>{star}★</span>
                                  <div style={S.barTrack}>
                                    <div style={{ ...S.barFill, width: pct + '%',
                                      background: star >= 4 ? '#00e676' : star === 3 ? '#ffc107' : '#e74c3c' }} />
                                  </div>
                                  <span style={S.barCount}>{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Individual reviews */}
                        {last3.map((r, i) => (
                          <div key={i} style={S.reviewCard}>
                            <div style={S.reviewTop}>
                              <div style={S.reviewAvatar}>
                                {r.user_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={S.reviewUser}>{r.user_name}</p>
                                <p style={S.reviewDate}>{fmtDate(r.created_at)}</p>
                              </div>
                              <div style={{ marginLeft:'auto' }}>
                                <StarDisplay rating={r.rating} size={14} />
                              </div>
                            </div>
                            <p style={S.reviewComment}>"{r.comment}"</p>
                          </div>
                        ))}

                        {total > 3 && (
                          <p style={{ color:'#7a8da8', fontSize:'12px', textAlign:'center', marginTop:'8px' }}>
                            Showing 3 of {total} reviews
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

const S = {
  wrapper:        { maxWidth:'1100px', margin:'0 auto', padding:'50px 24px' },
  header:         { textAlign:'center', marginBottom:'40px' },
  tag:            { fontSize:'12px', fontWeight:'700', letterSpacing:'2px', color:'#00e676', marginBottom:'10px' },
  title:          { fontFamily:"'Bebas Neue',sans-serif", fontSize:'52px', color:'#e8edf5', letterSpacing:'2px', marginBottom:'12px' },
  sub:            { color:'#7a8da8', fontSize:'16px' },
  filters:        { display:'flex', gap:'12px', justifyContent:'center', marginBottom:'40px', flexWrap:'wrap' },
  filterBtn:      { background:'#162032', color:'#7a8da8', border:'1px solid rgba(0,230,118,0.15)', padding:'10px 24px', borderRadius:'30px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'14px' },
  filterActive:   { background:'#00e676', color:'#080c14', border:'1px solid #00e676' },
  error:          { background:'rgba(231,76,60,0.12)', color:'#e74c3c', padding:'14px', borderRadius:'10px', marginBottom:'24px' },
  loading:        { textAlign:'center', color:'#7a8da8', fontSize:'18px', padding:'60px' },
  empty:          { textAlign:'center', color:'#7a8da8', fontSize:'18px', padding:'60px' },
  grid:           { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'24px' },
  venueCard:      { background:'#162032', border:'1px solid rgba(0,230,118,0.12)', borderRadius:'16px', overflow:'hidden' },
  banner:         { height:'160px', background:'linear-gradient(135deg,#0d1421,#162032)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'60px', borderBottom:'1px solid rgba(0,230,118,0.1)' },
  venueBody:      { padding:'24px' },
  nameRow:        { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' },
  venueName:      { fontSize:'20px', fontWeight:'700', color:'#e8edf5', margin:0 },
  ratingBadge:    { display:'flex', alignItems:'center', gap:'3px', background:'rgba(255,193,7,0.12)', border:'1px solid rgba(255,193,7,0.3)', borderRadius:'8px', padding:'4px 10px' },
  ratingNum:      { color:'#ffc107', fontWeight:'700', fontSize:'14px' },
  venueAddr:      { color:'#7a8da8', fontSize:'14px', marginBottom:'10px' },
  venueDesc:      { color:'#7a8da8', fontSize:'14px', lineHeight:1.6, marginBottom:'14px' },
  starRow:        { display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' },
  reviewCount:    { color:'#7a8da8', fontSize:'13px' },
  btnRow:         { display:'flex', gap:'10px', marginBottom:'4px' },
  viewBtn:        { flex:1, background:'transparent', color:'#00e676', border:'1px solid rgba(0,230,118,0.3)', padding:'9px 16px', borderRadius:'8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px' },
  reviewToggleBtn:{ flex:1, background:'rgba(255,193,7,0.08)', color:'#ffc107', border:'1px solid rgba(255,193,7,0.25)', padding:'9px 16px', borderRadius:'8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px' },
  courtsSection:  { marginTop:'18px', borderTop:'1px solid rgba(0,230,118,0.1)', paddingTop:'18px' },
  reviewsSection: { marginTop:'18px', borderTop:'1px solid rgba(255,193,7,0.15)', paddingTop:'18px' },
  sectionLabel:   { fontSize:'12px', fontWeight:'700', color:'#7a8da8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'14px' },
  courtRow:       { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  courtName:      { color:'#e8edf5', fontWeight:'600', fontSize:'15px' },
  sportTag:       { padding:'3px 10px', borderRadius:'12px', fontSize:'11px', fontWeight:'700' },
  courtRight:     { display:'flex', alignItems:'center', gap:'12px' },
  price:          { color:'#00e676', fontWeight:'700', fontSize:'14px' },
  bookBtn:        { background:'#00e676', color:'#080c14', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'700', fontSize:'13px' },
  // Rating summary
  ratingSummary:  { display:'flex', gap:'20px', background:'rgba(255,193,7,0.05)', border:'1px solid rgba(255,193,7,0.1)', borderRadius:'12px', padding:'16px', marginBottom:'14px' },
  bigRating:      { display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', minWidth:'70px' },
  bigNum:         { fontSize:'36px', fontWeight:'700', color:'#ffc107', fontFamily:"'Bebas Neue',sans-serif", lineHeight:1 },
  ratingBars:     { flex:1, display:'flex', flexDirection:'column', gap:'6px', justifyContent:'center' },
  barRow:         { display:'flex', alignItems:'center', gap:'8px' },
  barLabel:       { color:'#7a8da8', fontSize:'12px', minWidth:'20px' },
  barTrack:       { flex:1, background:'rgba(255,255,255,0.06)', borderRadius:'4px', height:'7px', overflow:'hidden' },
  barFill:        { height:'100%', borderRadius:'4px', transition:'width 0.4s ease' },
  barCount:       { color:'#7a8da8', fontSize:'12px', minWidth:'14px', textAlign:'right' },
  // Review cards
  reviewCard:     { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'14px', marginBottom:'10px' },
  reviewTop:      { display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' },
  reviewAvatar:   { width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#00e676,#00bcd4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'14px', color:'#080c14', flexShrink:0 },
  reviewUser:     { color:'#e8edf5', fontWeight:'600', fontSize:'14px', margin:0 },
  reviewDate:     { color:'#7a8da8', fontSize:'12px', margin:0 },
  reviewComment:  { color:'#a8b8cc', fontSize:'14px', lineHeight:1.6, margin:0, fontStyle:'italic' },
};

export default Venues;