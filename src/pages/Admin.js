/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://127.0.0.1:5000/api';

// ── Small reusable components ─────────────────────────────────
const Msg = ({ msg, onClose }) => {
  if (!msg) return null;
  const isErr = msg.startsWith('err:');
  const text  = msg.replace(/^(ok:|err:)/, '');
  return (
    <div style={{
      padding:'13px 18px', borderRadius:'10px', marginBottom:'20px',
      display:'flex', justifyContent:'space-between', alignItems:'center',
      fontSize:'14px', fontWeight:'500',
      background: isErr ? 'rgba(231,76,60,0.12)' : 'rgba(0,230,118,0.1)',
      border: `1px solid ${isErr ? 'rgba(231,76,60,0.35)' : 'rgba(0,230,118,0.3)'}`,
      color: isErr ? '#e74c3c' : '#00e676',
    }}>
      <span>{isErr ? '⚠️' : '✅'} {text}</span>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:'18px',lineHeight:1}}>×</button>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={S.scard}>
    <div style={{...S.sico, color}}>{icon}</div>
    <div>
      <p style={S.slbl}>{label}</p>
      <p style={{...S.sval, color}}>{value}</p>
      {sub && <p style={S.ssub}>{sub}</p>}
    </div>
  </div>
);

const Bar = ({ label, value, max, color='#00e676' }) => (
  <div style={S.barRow}>
    <span style={S.barLbl}>{label}</span>
    <div style={S.barBg}>
      <div style={{...S.barFill, width: max ? (value/max*100)+'%' : '0%', background: color}} />
    </div>
    <span style={{...S.barNum, color}}>{value}</span>
  </div>
);

const statusBadge = (s) => ({
  display:'inline-block', padding:'3px 10px', borderRadius:'20px',
  fontSize:'11px', fontWeight:'700', letterSpacing:'0.5px',
  background: s==='confirmed' ? 'rgba(0,230,118,0.12)' : s==='cancelled' ? 'rgba(231,76,60,0.12)' : 'rgba(255,193,7,0.12)',
  color:       s==='confirmed' ? '#00e676'              : s==='cancelled' ? '#e74c3c'              : '#ffc107',
});

// ── Main Admin Component ──────────────────────────────────────
function Admin() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('cannonball_user') || 'null');

  const [tab,     setTab]     = useState('dashboard');
  const [stats,   setStats]   = useState(null);
  const [bookings,setBookings]= useState([]);
  const [users,   setUsers]   = useState([]);
  const [venues,  setVenues]  = useState([]);
  const [courts,  setCourts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState('');
  const [reviews, setReviews] = useState([]);

  // Forms
  const blankVenue  = { name:'', address:'', city:'', district:'', description:'' };
  const blankCourt  = { location_id:'', court_name:'', sport_type:'Futsal', capacity:10, price_per_hour:1500 };
  const [venueForm, setVenueForm] = useState(blankVenue);
  const [courtForm, setCourtForm] = useState(blankCourt);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [showCourtForm, setShowCourtForm] = useState(false);

  // Search / filter
  const [bkSearch,  setBkSearch]  = useState('');
  const [bkStatus,  setBkStatus]  = useState('all');
  const [usrSearch, setUsrSearch] = useState('');

  // Pagination
  const [bkPage,  setBkPage]  = useState(1);
  const [usrPage, setUsrPage] = useState(1);
  const PER = 10;

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, b, u, v, c, r] = await Promise.all([
        axios.get(`${API}/venues/stats`),
        axios.get(`${API}/bookings/all`),
        axios.get(`${API}/auth/users`),
        axios.get(`${API}/venues/`),
        axios.get(`${API}/venues/all-courts`),
        axios.get(`${API}/reviews/all`),
      ]);
      setStats(s.data); setBookings(b.data); setUsers(u.data);
      setVenues(v.data); setCourts(c.data); setReviews(r.data);
    } catch (e) {
      setMsg('err:Failed to load. Make sure Flask is running and all route files are updated.');
    }
    setLoading(false);
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axios.delete(`${API}/reviews/delete/${reviewId}`);
      setMsg('ok:Review deleted.');
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch { setMsg('err:Failed to delete review.'); }
  };

  const [generating, setGenerating] = useState(false);

  // ── Actions ──────────────────────────────────────────────────
  const genSlots = async () => {
    if (generating) return;
    setGenerating(true);
    setMsg('');
    try {
      const r = await axios.post(`${API}/bookings/generate-slots`, {}, { timeout: 60000 });
      setMsg('ok:' + r.data.message);
      loadAll();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Failed to generate slots.';
      setMsg('err:' + errMsg);
    }
    setGenerating(false);
  };

  const cancelBooking = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await axios.put(`${API}/bookings/cancel/${id}`);
      setMsg('ok:Booking cancelled successfully.');
      loadAll();
    } catch { setMsg('err:Cancel failed. Check backend.'); }
  };

  const addVenue = async () => {
    if (!venueForm.name || !venueForm.address || !venueForm.city || !venueForm.district)
      return setMsg('err:Please fill all venue fields.');
    try {
      await axios.post(`${API}/venues/add`, venueForm);
      setMsg('ok:Venue added successfully!');
      setVenueForm(blankVenue); setShowVenueForm(false); loadAll();
    } catch { setMsg('err:Failed to add venue.'); }
  };

  const deleteVenue = async (id) => {
    if (!window.confirm('Delete this venue? All its courts and slots will be removed.')) return;
    try {
      await axios.delete(`${API}/venues/delete/${id}`);
      setMsg('ok:Venue deleted.'); loadAll();
    } catch { setMsg('err:Delete failed.'); }
  };

  const addCourt = async () => {
    if (!courtForm.location_id || !courtForm.court_name)
      return setMsg('err:Please fill all court fields.');
    try {
      await axios.post(`${API}/venues/add-court`, courtForm);
      setMsg('ok:Court added successfully!');
      setCourtForm(blankCourt); setShowCourtForm(false); loadAll();
    } catch { setMsg('err:Failed to add court.'); }
  };

  const deleteCourt = async (id) => {
    if (!window.confirm('Delete this court?')) return;
    try {
      await axios.delete(`${API}/venues/delete-court/${id}`);
      setMsg('ok:Court deleted.'); loadAll();
    } catch { setMsg('err:Delete failed.'); }
  };

  const makeAdmin = async (id) => {
    try {
      await axios.put(`${API}/auth/users/${id}/make-admin`);
      setMsg('ok:User promoted to admin!'); loadAll();
    } catch { setMsg('err:Failed to update role.'); }
  };

  const removeAdmin = async (id) => {
    if (!window.confirm('Remove admin role from this user?')) return;
    try {
      await axios.put(`${API}/auth/users/${id}/remove-admin`);
      setMsg('ok:Admin role removed.'); loadAll();
    } catch { setMsg('err:Failed.'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user and all their bookings? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/auth/users/${id}`);
      setMsg('ok:User deleted.'); loadAll();
    } catch { setMsg('err:Delete failed.'); }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const fmt = (t) => {
    if (!t) return '—';
    const [h, m] = t.toString().split(':');
    const hr = parseInt(h);
    return `${hr>12?hr-12:hr===0?12:hr}:${m} ${hr>=12?'PM':'AM'}`;
  };

  // Filtered + paginated bookings
  const filteredBk = bookings.filter(b => {
    const matchText   = [b.user_name,b.venue_name,b.court_name,b.user_email]
      .some(x => x?.toLowerCase().includes(bkSearch.toLowerCase()));
    const matchStatus = bkStatus === 'all' || b.status === bkStatus;
    return matchText && matchStatus;
  });
  const bkPages   = Math.ceil(filteredBk.length / PER);
  const bkSlice   = filteredBk.slice((bkPage-1)*PER, bkPage*PER);

  // Filtered + paginated users
  const filteredUsr = users.filter(u =>
    [u.full_name, u.email].some(x => x?.toLowerCase().includes(usrSearch.toLowerCase()))
  );
  const usrPages  = Math.ceil(filteredUsr.length / PER);
  const usrSlice  = filteredUsr.slice((usrPage-1)*PER, usrPage*PER);

  const maxVS = stats?.venue_stats?.length ? Math.max(...stats.venue_stats.map(x=>x.bookings)) : 1;
  const maxPH = stats?.peak_hours?.length  ? Math.max(...stats.peak_hours.map(x=>x.bookings))  : 1;

  const Pagination = ({ page, pages, setPage }) => pages <= 1 ? null : (
    <div style={S.pager}>
      <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} style={S.pBtn}>‹ Prev</button>
      <span style={S.pInfo}>Page {page} of {pages}</span>
      <button onClick={() => setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={S.pBtn}>Next ›</button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* ── HEADER ── */}
      <div style={S.hdr}>
        <div>
          <p style={S.htag}>🛡️ ADMIN PANEL</p>
          <h1 style={S.htitle}>CannonBall Dashboard</h1>
          <p style={S.hsub}>System management & analytics</p>
        </div>
        <div style={S.hbtns}>
          <button onClick={genSlots} disabled={generating} style={{...S.btnGreen, opacity: generating ? 0.6 : 1}}>
            {generating ? '⏳ Generating...' : '🔄 Generate Slots (180 days)'}
          </button>
          <button onClick={loadAll}     style={S.btnBlue}>↻ Refresh</button>
          <button onClick={()=>navigate('/')} style={S.btnGray}>← Back to Site</button>
        </div>
      </div>

      <Msg msg={msg} onClose={() => setMsg('')} />

      {/* ── TABS ── */}
      <div style={S.tabs}>
        {[
          { id:'dashboard', lbl:'📊 Dashboard' },
          { id:'bookings',  lbl:'📅 Bookings',  n: bookings.length },
          { id:'venues',    lbl:'🏟️ Venues',     n: venues.length },
          { id:'courts',    lbl:'⚽ Courts',     n: courts.length },
          { id:'users',     lbl:'👥 Users',      n: users.length },
          { id:'reviews',   lbl:'⭐ Reviews',    n: reviews.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{...S.tab, ...(tab===t.id ? S.tabOn : {})}}>
            {t.lbl}
            {t.n != null && <span style={{...S.tabCnt, ...(tab===t.id?{background:'rgba(0,0,0,0.2)'}:{})}}>{t.n}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={S.loading}>
          <div style={S.spinner}>⚽</div>
          <p>Loading dashboard data...</p>
        </div>
      ) : <>

        {/* ════════════════════════════════════════
            TAB: DASHBOARD
        ════════════════════════════════════════ */}
        {tab === 'dashboard' && stats && <>

          {/* Stat Cards */}
          <div style={S.g4}>
            <StatCard icon="📅" label="Total Bookings"   value={stats.total_bookings}                         color="#00e676" sub={`${stats.active_bookings} confirmed`} />
            <StatCard icon="💰" label="Total Revenue"     value={`Rs. ${stats.total_revenue.toLocaleString()}`} color="#ffd700" sub="Confirmed only" />
            <StatCard icon="👥" label="Registered Users"  value={stats.total_users}                            color="#00bcd4" />
            <StatCard icon="🏟️" label="Venues"            value={stats.total_venues}                           color="#ff6b35" sub={`${stats.total_courts} courts`} />
            <StatCard icon="⏰" label="Available Slots"   value={stats.available_slots?.toLocaleString()}       color="#4caf50" />
            <StatCard icon="❌" label="Cancellations"     value={stats.cancelled_bookings}                     color="#e74c3c" />
            <StatCard icon="✅" label="Active Bookings"   value={stats.active_bookings}                        color="#a8edea" />
            <StatCard icon="📈" label="Cancellation Rate" value={stats.total_bookings
              ? Math.round(stats.cancelled_bookings/stats.total_bookings*100)+'%' : '0%'}                      color="#ffc107" />
          </div>

          {/* Charts Row */}
          <div style={S.two}>
            <div style={S.card}>
              <h2 style={S.ct}>🏆 Bookings by Venue</h2>
              {!stats.venue_stats?.length
                ? <p style={S.empty}>No booking data yet.</p>
                : stats.venue_stats.map((v,i) => (
                  <Bar key={i} label={v.venue} value={v.bookings} max={maxVS} />
                ))
              }
            </div>
            <div style={S.card}>
              <h2 style={S.ct}>⏰ Peak Booking Hours</h2>
              {!stats.peak_hours?.length
                ? <p style={S.empty}>No data yet.</p>
                : stats.peak_hours.map((h,i) => (
                  <Bar key={i} label={h.hour} value={h.bookings} max={maxPH} color="#ff6b35" />
                ))
              }
            </div>
          </div>

          {/* Monthly Revenue */}
          {stats.monthly?.length > 0 && (
            <div style={S.card}>
              <h2 style={S.ct}>📈 Monthly Revenue (Last 6 Months)</h2>
              <div style={S.monthGrid}>
                {stats.monthly.map((m,i) => {
                  const maxRev = Math.max(...stats.monthly.map(x=>x.revenue)) || 1;
                  const pct    = Math.round(m.revenue / maxRev * 100);
                  return (
                    <div key={i} style={S.monthCol}>
                      <div style={S.monthBarWrap}>
                        <div style={{...S.monthBar, height: pct+'%'}} />
                      </div>
                      <p style={S.monthAmt}>Rs.{(m.revenue/1000).toFixed(0)}k</p>
                      <p style={S.monthLbl}>{m.month}</p>
                      <p style={S.monthBk}>{m.bookings} bk</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Bookings */}
          <div style={S.card}>
            <div style={S.ch}>
              <h2 style={S.ct}>📋 Recent Bookings</h2>
              <button onClick={() => setTab('bookings')} style={S.viewAll}>View All →</button>
            </div>
            {!bookings.length
              ? <p style={S.empty}>No bookings yet.</p>
              : bookings.slice(0,6).map(b => (
                <div key={b.booking_id} style={S.rrow}>
                  <div style={S.ravatar}>{b.user_name?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{flex:1}}>
                    <p style={S.rname}>{b.user_name}</p>
                    <p style={S.rsub}>{b.venue_name} · {b.court_name}</p>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <p style={S.rsub}>📅 {b.date}</p>
                    <p style={S.rsub}>⏰ {fmt(b.start_time)}</p>
                  </div>
                  <div style={{textAlign:'right',minWidth:'110px'}}>
                    <p style={{color:'#00e676',fontWeight:'700',fontSize:'14px',margin:'0 0 5px 0'}}>
                      Rs. {b.total_amount?.toLocaleString()}
                    </p>
                    <span style={statusBadge(b.status)}>{b.status.toUpperCase()}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </>}

        {/* ════════════════════════════════════════
            TAB: BOOKINGS
        ════════════════════════════════════════ */}
        {tab === 'bookings' && (
          <div style={S.card}>
            <div style={S.ch}>
              <h2 style={S.ct}>📅 All Bookings</h2>
              <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
                <input placeholder="Search user, venue, court..."
                  value={bkSearch} onChange={e=>{setBkSearch(e.target.value);setBkPage(1)}}
                  style={S.search} />
                <select value={bkStatus} onChange={e=>{setBkStatus(e.target.value);setBkPage(1)}} style={S.sel}>
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span style={S.countBadge}>{filteredBk.length} results</span>
              </div>
            </div>

            {!bkSlice.length ? <p style={S.empty}>No bookings found.</p> : (
              <div style={{overflowX:'auto'}}>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      {['#ID','User','Email','Venue','Court','Date','Time','Payment','Amount','Status','Action']
                        .map(h => <th key={h} style={S.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {bkSlice.map(b => (
                      <tr key={b.booking_id} style={S.tr}>
                        <td style={{...S.td, color:'#7a8da8'}}>#{b.booking_id}</td>
                        <td style={{...S.td, color:'#e8edf5', fontWeight:'600'}}>{b.user_name}</td>
                        <td style={S.td}>{b.user_email}</td>
                        <td style={S.td}>{b.venue_name}</td>
                        <td style={{...S.td, color:'#e8edf5'}}>{b.court_name}</td>
                        <td style={S.td}>{b.date}</td>
                        <td style={S.td}>{fmt(b.start_time)}</td>
                        <td style={S.td}>{b.payment_method === 'cash' ? '💵 Cash' : '💳 Online'}</td>
                        <td style={{...S.td, color:'#00e676', fontWeight:'700'}}>Rs. {b.total_amount?.toLocaleString()}</td>
                        <td style={S.td}><span style={statusBadge(b.status)}>{b.status.toUpperCase()}</span></td>
                        <td style={S.td}>
                          {b.status === 'confirmed' && (
                            <button onClick={() => cancelBooking(b.booking_id)} style={S.redBtn}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={bkPage} pages={bkPages} setPage={setBkPage} />
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB: VENUES
        ════════════════════════════════════════ */}
        {tab === 'venues' && <>

          {/* Add Venue Form */}
          <div style={S.card}>
            <div style={S.ch}>
              <h2 style={S.ct}>🏟️ Venue Management</h2>
              <button onClick={() => setShowVenueForm(v => !v)} style={S.btnGreen}>
                {showVenueForm ? '✕ Cancel' : '➕ Add New Venue'}
              </button>
            </div>

            {showVenueForm && (
              <div style={S.formBox}>
                <h3 style={S.formTitle}>New Venue Details</h3>
                <div style={S.fg}>
                  {[
                    {k:'name',      p:'Colombo Futsal Arena', lbl:'Venue Name *'},
                    {k:'address',   p:'123 Main Street',      lbl:'Address *'},
                    {k:'city',      p:'Colombo',              lbl:'City *'},
                    {k:'district',  p:'Colombo',              lbl:'District *'},
                  ].map(f => (
                    <div key={f.k}>
                      <label style={S.lbl}>{f.lbl}</label>
                      <input placeholder={f.p} value={venueForm[f.k]} required
                        onChange={e => setVenueForm({...venueForm,[f.k]:e.target.value})}
                        style={S.inp} />
                    </div>
                  ))}
                </div>
                <label style={S.lbl}>Description</label>
                <input placeholder="Brief description of the venue..."
                  value={venueForm.description}
                  onChange={e => setVenueForm({...venueForm, description:e.target.value})}
                  style={{...S.inp, width:'100%', boxSizing:'border-box', marginBottom:'16px'}} />
                <div style={{display:'flex',gap:'10px'}}>
                  <button onClick={addVenue} style={S.btnGreen}>✅ Save Venue</button>
                  <button onClick={() => { setShowVenueForm(false); setVenueForm(blankVenue); }} style={S.btnGray}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Venues List */}
          <div style={S.vgrid}>
            {!venues.length ? <p style={S.empty}>No venues added yet.</p> :
              venues.map(v => (
                <div key={v.id} style={S.vcard}>
                  <div style={S.vhead}>
                    <span style={{fontSize:'36px'}}>🏟️</span>
                    <div>
                      <h3 style={S.vname}>{v.name}</h3>
                      <p style={S.vsub}>📍 {v.city}, {v.district}</p>
                    </div>
                  </div>
                  <div style={S.vbody}>
                    <p style={S.vsub}>{v.address}</p>
                    {v.description && <p style={{...S.vsub, marginTop:'6px', fontStyle:'italic'}}>{v.description}</p>}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'14px'}}>
                      <span style={S.vcourtCount}>
                        {courts.filter(c=>c.venue_id===v.id).length} courts
                      </span>
                      <button onClick={() => deleteVenue(v.id)} style={S.redBtn}>🗑️ Delete</button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </>}

        {/* ════════════════════════════════════════
            TAB: COURTS
        ════════════════════════════════════════ */}
        {tab === 'courts' && <>
          <div style={S.card}>
            <div style={S.ch}>
              <h2 style={S.ct}>⚽ Court Management</h2>
              <button onClick={() => setShowCourtForm(v => !v)} style={S.btnGreen}>
                {showCourtForm ? '✕ Cancel' : '➕ Add New Court'}
              </button>
            </div>

            {showCourtForm && (
              <div style={S.formBox}>
                <h3 style={S.formTitle}>New Court Details</h3>
                <div style={S.fg}>
                  <div>
                    <label style={S.lbl}>Venue *</label>
                    <select value={courtForm.location_id}
                      onChange={e => setCourtForm({...courtForm, location_id: e.target.value})}
                      style={S.sel}>
                      <option value="">Select Venue...</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Court Name *</label>
                    <input placeholder="Court A" value={courtForm.court_name}
                      onChange={e => setCourtForm({...courtForm, court_name:e.target.value})}
                      style={S.inp} />
                  </div>
                  <div>
                    <label style={S.lbl}>Sport Type</label>
                    <select value={courtForm.sport_type}
                      onChange={e => setCourtForm({...courtForm, sport_type:e.target.value})}
                      style={S.sel}>
                      <option>Futsal</option>
                      <option>Basketball</option>
                      <option>Badminton</option>
                      <option>Tennis</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Capacity (players)</label>
                    <input type="number" value={courtForm.capacity}
                      onChange={e => setCourtForm({...courtForm, capacity:parseInt(e.target.value)})}
                      style={S.inp} />
                  </div>
                  <div>
                    <label style={S.lbl}>Price Per Hour (Rs.)</label>
                    <input type="number" value={courtForm.price_per_hour}
                      onChange={e => setCourtForm({...courtForm, price_per_hour:parseInt(e.target.value)})}
                      style={S.inp} />
                  </div>
                </div>
                <div style={{display:'flex', gap:'10px', marginTop:'6px'}}>
                  <button onClick={addCourt} style={S.btnGreen}>✅ Save Court</button>
                  <button onClick={() => { setShowCourtForm(false); setCourtForm(blankCourt); }} style={S.btnGray}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Courts Table */}
          <div style={S.card}>
            <h2 style={S.ct}>All Courts ({courts.length})</h2>
            {!courts.length ? <p style={S.empty}>No courts yet.</p> : (
              <div style={{overflowX:'auto'}}>
                <table style={S.tbl}>
                  <thead>
                    <tr>{['#','Court Name','Venue','Sport','Capacity','Price/Hr','Action'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {courts.map(c => (
                      <tr key={c.id} style={S.tr}>
                        <td style={S.td}>#{c.id}</td>
                        <td style={{...S.td, color:'#e8edf5', fontWeight:'600'}}>{c.court_name}</td>
                        <td style={S.td}>{c.venue_name}</td>
                        <td style={S.td}>
                          <span style={{...statusBadge('confirmed'), background:'rgba(0,188,212,0.12)', color:'#00bcd4'}}>
                            {c.sport_type}
                          </span>
                        </td>
                        <td style={S.td}>{c.capacity} players</td>
                        <td style={{...S.td, color:'#00e676', fontWeight:'700'}}>Rs. {c.price_per_hour?.toLocaleString()}</td>
                        <td style={S.td}>
                          <button onClick={() => deleteCourt(c.id)} style={S.redBtn}>🗑️ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>}

        {/* ════════════════════════════════════════
            TAB: USERS
        ════════════════════════════════════════ */}
        {tab === 'users' && (
          <div style={S.card}>
            <div style={S.ch}>
              <h2 style={S.ct}>👥 User Management</h2>
              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <input placeholder="Search name or email..."
                  value={usrSearch} onChange={e=>{setUsrSearch(e.target.value);setUsrPage(1)}}
                  style={S.search} />
                <span style={S.countBadge}>{filteredUsr.length} users</span>
              </div>
            </div>

            {/* User summary cards */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'24px'}}>
              {[
                { label:'Total Users',  value: users.length,                              color:'#00bcd4' },
                { label:'Admins',       value: users.filter(u=>u.role==='admin').length,   color:'#ff6b35' },
                { label:'Regular Users',value: users.filter(u=>u.role!=='admin').length,   color:'#00e676' },
              ].map((s,i) => (
                <div key={i} style={{background:'#0d1421',borderRadius:'10px',padding:'16px',textAlign:'center'}}>
                  <p style={{...S.sval, color:s.color, fontSize:'28px'}}>{s.value}</p>
                  <p style={S.slbl}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{overflowX:'auto'}}>
              <table style={S.tbl}>
                <thead>
                  <tr>{['#','Name','Email','Phone','Bookings','Role','Joined','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {usrSlice.map(u => (
                    <tr key={u.id} style={S.tr}>
                      <td style={S.td}>#{u.id}</td>
                      <td style={{...S.td, color:'#e8edf5', fontWeight:'600'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                          <div style={{...S.ravatar, width:'28px', height:'28px', fontSize:'12px', flexShrink:0}}>
                            {u.full_name?.[0]?.toUpperCase()}
                          </div>
                          {u.full_name}
                        </div>
                      </td>
                      <td style={S.td}>{u.email}</td>
                      <td style={S.td}>{u.phone || '—'}</td>
                      <td style={{...S.td, color:'#00e676', fontWeight:'700', textAlign:'center'}}>{u.total_bookings}</td>
                      <td style={S.td}>
                        <span style={{
                          ...statusBadge('confirmed'),
                          background: u.role==='admin' ? 'rgba(255,107,53,0.15)' : 'rgba(0,230,118,0.12)',
                          color:      u.role==='admin' ? '#ff6b35'               : '#00e676',
                        }}>
                          {u.role === 'admin' ? '🛡️ ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td style={S.td}>{u.created_at?.split('T')[0]}</td>
                      <td style={{...S.td, display:'flex', gap:'6px', flexWrap:'wrap'}}>
                        {u.role !== 'admin'
                          ? <button onClick={() => makeAdmin(u.id)}  style={S.orangeBtn}>Make Admin</button>
                          : u.id !== user.id
                          ? <button onClick={() => removeAdmin(u.id)} style={S.grayBtn}>Remove Admin</button>
                          : <span style={{color:'#7a8da8',fontSize:'12px'}}>You</span>
                        }
                        {u.id !== user.id && (
                          <button onClick={() => deleteUser(u.id)} style={S.redBtn}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={usrPage} pages={usrPages} setPage={setUsrPage} />
          </div>
        )}

      
        {/* ════════ TAB: REVIEWS ════════ */}
        {tab === 'reviews' && (
          <div style={S.card}>
            <div style={S.ch}>
              <h2 style={S.ct}>⭐ Customer Reviews</h2>
              <span style={S.countBadge}>{reviews.length} total reviews</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px'}}>
              {[
                { label:'Total Reviews', value: reviews.length, color:'#ffc107' },
                { label:'5 Star',        value: reviews.filter(r=>r.rating===5).length, color:'#00e676' },
                { label:'Avg Rating',    value: reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1)+' ★' : '—', color:'#ffc107' },
                { label:'Venues Rated',  value: [...new Set(reviews.map(r=>r.venue_id))].length, color:'#00bcd4' },
              ].map((s,i)=>(
                <div key={i} style={{background:'#0d1421',borderRadius:'10px',padding:'16px',textAlign:'center'}}>
                  <p style={{...S.sval, color:s.color, fontSize:'26px', margin:'0 0 4px 0'}}>{s.value}</p>
                  <p style={S.slbl}>{s.label}</p>
                </div>
              ))}
            </div>
            {reviews.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px',color:'#7a8da8'}}>No reviews yet.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                {reviews.map((r,i) => (
                  <div key={i} style={{background:'#0d1421',border:'1px solid rgba(255,193,7,0.1)',borderRadius:'12px',padding:'16px 20px',display:'flex',gap:'16px',alignItems:'flex-start'}}>
                    <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#ffc107,#ff6b35)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'15px',color:'#080c14',flexShrink:0}}>
                      {r.user_name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px',flexWrap:'wrap'}}>
                        <span style={{color:'#e8edf5',fontWeight:'700',fontSize:'14px'}}>{r.user_name}</span>
                        <span style={{color:'#7a8da8',fontSize:'12px'}}>at</span>
                        <span style={{color:'#ffc107',fontSize:'13px',fontWeight:'600'}}>{r.venue_name}</span>
                        <span style={{marginLeft:'auto',color:'#7a8da8',fontSize:'12px'}}>{r.created_at?.split('T')[0]}</span>
                      </div>
                      <div style={{marginBottom:'8px'}}>
                        {[1,2,3,4,5].map(s=>(
                          <span key={s} style={{color: s<=r.rating ? '#ffc107' : 'rgba(255,255,255,0.15)',fontSize:'16px'}}>★</span>
                        ))}
                        <span style={{color:'#7a8da8',fontSize:'12px',marginLeft:'8px'}}>
                          {['','Poor','Fair','Good','Very Good','Excellent'][r.rating]}
                        </span>
                      </div>
                      <p style={{color:'#a8b8cc',fontSize:'14px',lineHeight:1.6,margin:0,fontStyle:'italic'}}>"{r.comment}"</p>
                    </div>
                    <button onClick={() => deleteReview(r.id)} style={S.redBtn}>🗑️ Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  page:       { maxWidth:'1280px', margin:'0 auto', padding:'36px 24px' },
  hdr:        { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', flexWrap:'wrap', gap:'16px' },
  htag:       { fontSize:'12px', fontWeight:'700', letterSpacing:'2px', color:'#00e676', marginBottom:'6px' },
  htitle:     { fontFamily:"'Bebas Neue',sans-serif", fontSize:'48px', color:'#e8edf5', letterSpacing:'2px', margin:'0 0 4px 0' },
  hsub:       { color:'#7a8da8', fontSize:'14px', margin:0 },
  hbtns:      { display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' },
  btnGreen:   { background:'rgba(0,230,118,0.12)', color:'#00e676', border:'1px solid rgba(0,230,118,0.3)', padding:'10px 16px', borderRadius:'9px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px' },
  btnBlue:    { background:'rgba(0,188,212,0.12)', color:'#00bcd4', border:'1px solid rgba(0,188,212,0.3)', padding:'10px 16px', borderRadius:'9px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px' },
  btnGray:    { background:'transparent', color:'#7a8da8', border:'1px solid rgba(122,141,168,0.3)', padding:'10px 16px', borderRadius:'9px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px' },
  redBtn:     { background:'rgba(231,76,60,0.12)', color:'#e74c3c', border:'1px solid rgba(231,76,60,0.25)', padding:'5px 11px', borderRadius:'7px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'12px' },
  orangeBtn:  { background:'rgba(255,107,53,0.12)', color:'#ff6b35', border:'1px solid rgba(255,107,53,0.25)', padding:'5px 11px', borderRadius:'7px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'12px' },
  grayBtn:    { background:'rgba(122,141,168,0.1)', color:'#7a8da8', border:'1px solid rgba(122,141,168,0.2)', padding:'5px 11px', borderRadius:'7px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'12px' },
  tabs:       { display:'flex', gap:'6px', marginBottom:'24px', flexWrap:'wrap' },
  tab:        { background:'#162032', color:'#7a8da8', border:'1px solid rgba(0,230,118,0.1)', padding:'10px 18px', borderRadius:'9px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px', display:'flex', alignItems:'center', gap:'7px' },
  tabOn:      { background:'#00e676', color:'#080c14', border:'1px solid #00e676' },
  tabCnt:     { background:'rgba(255,255,255,0.12)', padding:'2px 7px', borderRadius:'10px', fontSize:'11px' },
  loading:    { textAlign:'center', color:'#7a8da8', padding:'80px', fontSize:'16px' },
  spinner:    { fontSize:'40px', marginBottom:'16px' },
  g4:         { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'14px', marginBottom:'22px' },
  scard:      { background:'#162032', border:'1px solid rgba(0,230,118,0.1)', borderRadius:'14px', padding:'20px', display:'flex', alignItems:'center', gap:'14px' },
  sico:       { fontSize:'32px', minWidth:'40px', textAlign:'center' },
  slbl:       { color:'#7a8da8', fontSize:'12px', margin:'0 0 4px 0' },
  sval:       { fontSize:'24px', fontWeight:'700', fontFamily:"'Bebas Neue',sans-serif", letterSpacing:'1px', margin:0 },
  ssub:       { color:'#7a8da8', fontSize:'11px', margin:'3px 0 0 0' },
  two:        { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'20px' },
  card:       { background:'#162032', border:'1px solid rgba(0,230,118,0.1)', borderRadius:'14px', padding:'24px', marginBottom:'20px' },
  ct:         { fontFamily:"'Bebas Neue',sans-serif", fontSize:'22px', color:'#e8edf5', letterSpacing:'1.5px', margin:'0 0 18px 0' },
  ch:         { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px', flexWrap:'wrap', gap:'10px' },
  viewAll:    { background:'transparent', color:'#00bcd4', border:'1px solid rgba(0,188,212,0.3)', padding:'7px 14px', borderRadius:'7px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:'13px', fontWeight:'600' },
  empty:      { color:'#7a8da8', textAlign:'center', padding:'30px', fontSize:'14px' },
  barRow:     { display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' },
  barLbl:     { color:'#e8edf5', fontSize:'13px', fontWeight:'500', minWidth:'110px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  barBg:      { flex:1, background:'#0d1421', borderRadius:'6px', height:'8px', overflow:'hidden' },
  barFill:    { height:'100%', borderRadius:'6px', transition:'width 0.4s ease' },
  barNum:     { fontWeight:'700', fontSize:'13px', minWidth:'28px', textAlign:'right' },
  monthGrid:  { display:'flex', gap:'12px', alignItems:'flex-end', height:'160px', padding:'0 4px' },
  monthCol:   { flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%' },
  monthBarWrap:{ flex:1, display:'flex', alignItems:'flex-end', width:'100%', marginBottom:'6px' },
  monthBar:   { width:'100%', background:'linear-gradient(180deg,#00e676,#00b248)', borderRadius:'4px 4px 0 0', minHeight:'4px', transition:'height 0.5s ease' },
  monthAmt:   { color:'#00e676', fontSize:'11px', fontWeight:'700', margin:'0 0 2px 0' },
  monthLbl:   { color:'#e8edf5', fontSize:'11px', fontWeight:'600', margin:'0 0 2px 0' },
  monthBk:    { color:'#7a8da8', fontSize:'10px', margin:0 },
  rrow:       { display:'flex', alignItems:'center', gap:'14px', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' },
  ravatar:    { width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#00e676,#00b248)', display:'flex', alignItems:'center', justifyContent:'center', color:'#080c14', fontWeight:'700', fontSize:'15px', flexShrink:0 },
  rname:      { color:'#e8edf5', fontWeight:'600', fontSize:'14px', margin:'0 0 3px 0' },
  rsub:       { color:'#7a8da8', fontSize:'12px', margin:'0 0 2px 0' },
  search:     { background:'#0d1421', border:'1px solid rgba(0,230,118,0.15)', borderRadius:'8px', color:'#e8edf5', padding:'9px 13px', fontFamily:"'Outfit',sans-serif", fontSize:'13px', width:'220px' },
  sel:        { background:'#0d1421', border:'1px solid rgba(0,230,118,0.15)', borderRadius:'8px', color:'#e8edf5', padding:'9px 13px', fontFamily:"'Outfit',sans-serif", fontSize:'13px', cursor:'pointer' },
  countBadge: { background:'rgba(0,230,118,0.1)', color:'#00e676', padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' },
  tbl:        { width:'100%', borderCollapse:'collapse', minWidth:'800px' },
  th:         { background:'#0d1421', color:'#7a8da8', padding:'11px 12px', textAlign:'left', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom:'1px solid rgba(0,230,118,0.1)', whiteSpace:'nowrap' },
  tr:         { borderBottom:'1px solid rgba(255,255,255,0.04)' },
  td:         { padding:'11px 12px', color:'#7a8da8', fontSize:'13px', verticalAlign:'middle' },
  pager:      { display:'flex', justifyContent:'center', alignItems:'center', gap:'16px', marginTop:'20px', paddingTop:'16px', borderTop:'1px solid rgba(255,255,255,0.05)' },
  pBtn:       { background:'rgba(0,230,118,0.08)', color:'#00e676', border:'1px solid rgba(0,230,118,0.2)', padding:'7px 16px', borderRadius:'7px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:'600', fontSize:'13px' },
  pInfo:      { color:'#7a8da8', fontSize:'13px' },
  formBox:    { background:'#0d1421', border:'1px solid rgba(0,230,118,0.15)', borderRadius:'12px', padding:'22px', marginBottom:'8px' },
  formTitle:  { color:'#e8edf5', fontWeight:'700', fontSize:'16px', margin:'0 0 18px 0' },
  fg:         { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'14px', marginBottom:'14px' },
  lbl:        { display:'block', fontSize:'11px', fontWeight:'700', color:'#7a8da8', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'6px' },
  inp:        { width:'100%', padding:'10px 12px', background:'#162032', border:'1px solid rgba(0,230,118,0.15)', borderRadius:'8px', color:'#e8edf5', fontFamily:"'Outfit',sans-serif", fontSize:'13px', display:'block', boxSizing:'border-box' },
  vgrid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px', marginBottom:'20px' },
  vcard:      { background:'#162032', border:'1px solid rgba(0,230,118,0.1)', borderRadius:'14px', overflow:'hidden' },
  vhead:      { background:'linear-gradient(135deg,#0d1421,#162032)', padding:'20px', display:'flex', alignItems:'center', gap:'14px', borderBottom:'1px solid rgba(0,230,118,0.08)' },
  vname:      { color:'#e8edf5', fontWeight:'700', fontSize:'16px', margin:'0 0 4px 0' },
  vsub:       { color:'#7a8da8', fontSize:'12px', margin:'0 0 2px 0' },
  vbody:      { padding:'16px' },
  vcourtCount:{ background:'rgba(0,188,212,0.12)', color:'#00bcd4', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' },
};

export default Admin;