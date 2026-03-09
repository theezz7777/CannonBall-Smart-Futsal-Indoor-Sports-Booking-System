/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:5000/api/ml';

function AIInsights() {
  const user = JSON.parse(localStorage.getItem('cannonball_user') || 'null');
  const [summary, setSummary]   = useState(null);
  const [peaks, setPeaks]       = useState([]);
  const [recs, setRecs]         = useState([]);
  const [risk, setRisk]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [recForm, setRecForm]   = useState({ venue:'Colombo Sports Arena', day:'Saturday', is_weekend:1, month:6, payment:'cash' });
  const [riskForm, setRiskForm] = useState({ time_slot:8, is_weekend:0, month:6, time_of_day:'evening', payment:'cash', price:1500 });
  const [recLoading, setRecLoading]   = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [s, p] = await Promise.all([
        axios.get(API + '/summary'),
        axios.get(API + '/all-peaks'),
      ]);
      setSummary(s.data);
      setPeaks(p.data);
    } catch {
      setError('Models not trained yet! Run: python train_model.py in the backend folder.');
    }
    setLoading(false);
  };

  const getRecommendations = async () => {
    setRecLoading(true); setRecs([]);
    try {
      const res = await axios.post(API + '/recommend', {
        user_id:        user?.id || 1,
        venue_name:     recForm.venue,
        day_of_week:    recForm.day,
        is_weekend:     parseInt(recForm.is_weekend),
        month:          parseInt(recForm.month),
        payment_method: recForm.payment,
      });
      setRecs(res.data.recommendations || []);
    } catch { setError('Recommendation failed. Is Flask running?'); }
    setRecLoading(false);
  };

  const getRisk = async () => {
    setRiskLoading(true); setRisk(null);
    try {
      const res = await axios.post(API + '/cancel-risk', {
        time_slot:      parseInt(riskForm.time_slot),
        is_weekend:     parseInt(riskForm.is_weekend),
        month:          parseInt(riskForm.month),
        time_of_day:    riskForm.time_of_day,
        payment_method: riskForm.payment,
        price:          parseInt(riskForm.price),
      });
      setRisk(res.data);
    } catch { setError('Risk prediction failed. Is Flask running?'); }
    setRiskLoading(false);
  };

  // ── Helpers ──────────────────────────────────────
  const scoreColor = (s) => s >= 8 ? '#e74c3c' : s >= 6 ? '#ff6b35' : s >= 4 ? '#ffc107' : '#00e676';
  const scoreLabel = (s) => s >= 8 ? '🔴 Very Busy' : s >= 6 ? '🟠 Busy' : s >= 4 ? '🟡 Moderate' : '🟢 Quiet';
  const riskColor  = (r) => r === 'High Risk' ? '#e74c3c' : r === 'Medium Risk' ? '#ffc107' : '#00e676';
  const todColor   = (t) => t === 'Evening' ? '#ff6b35' : t === 'Afternoon' ? '#ffc107' : '#00bcd4';
  const todIcon    = (t) => t === 'Evening' ? '🌆' : t === 'Afternoon' ? '☀️' : '🌅';

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const venues = ['Colombo Sports Arena','Kandy Indoor Courts','Galle Futsal Center'];

  // Build unique court list from real peaks data
  const courtList = peaks.reduce((acc, p) => {
    if (!acc.find(c => c.court_id === p.court_id))
      acc.push({ court_id: p.court_id, court_name: p.court_name || ('Court ' + p.court_id), venue_name: p.venue_name || '' });
    return acc;
  }, []);
  const activeCourt     = selectedCourtId || (courtList[0]?.court_id ?? null);
  const courtPeaks      = peaks.filter(p => p.court_id === activeCourt);
  const activeCourtInfo = courtList.find(c => c.court_id === activeCourt);

  return (
    <div style={S.page}>

      {/* HEADER */}
      <div style={S.hdr}>
        <div>
          <p style={S.tag}>AI POWERED</p>
          <h1 style={S.title}>CannonBall Insights</h1>
          <p style={S.sub}>Machine Learning predictions for smarter bookings</p>
        </div>
        <button onClick={loadData} style={S.refreshBtn}>↻ Refresh</button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={S.errBox}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={S.xBtn}>✕</button>
        </div>
      )}

      {loading ? <div style={S.loading}>Loading AI models... 🤖</div> : <>

        {/* STAT CARDS */}
        {summary && (<>
          <div style={S.g4}>
            {[
              { icon:'🎯', label:'Model 1 Accuracy',    value: summary.model1_accuracy + '%', sub:'Slot Recommender',       color:'#00e676' },
              { icon:'📊', label:'Model 3 Accuracy',    value: summary.model3_accuracy + '%', sub:'Cancellation Predictor', color:'#00bcd4' },
              { icon:'🏆', label:'Most Popular Venue',  value: summary.top_venue?.split(' ')[0], sub: summary.top_venue,   color:'#ffd700' },
              { icon:'📅', label:'Peak Month',          value: summary.peak_month,            sub:'Highest bookings',       color:'#ff6b35' },
            ].map((c,i) => (
              <div key={i} style={S.scard}>
                <div style={S.sicon}>{c.icon}</div>
                <p style={S.slbl}>{c.label}</p>
                <p style={{...S.sval, color:c.color}}>{c.value}</p>
                <p style={S.ssub}>{c.sub}</p>
              </div>
            ))}
          </div>
          <div style={S.g3}>
            {[
              { icon:'📅', label:'Total Bookings', value: summary.total_bookings?.toLocaleString() },
              { icon:'✅', label:'Confirmed',       value: summary.confirmed?.toLocaleString() },
              { icon:'💰', label:'Total Revenue',   value: 'Rs. ' + summary.total_revenue?.toLocaleString() },
            ].map((c,i) => (
              <div key={i} style={S.mini}>
                <span style={{fontSize:'22px'}}>{c.icon}</span>
                <div><p style={S.mlbl}>{c.label}</p><p style={S.mval}>{c.value}</p></div>
              </div>
            ))}
          </div>
        </>)}

        {/* PEAK HEATMAP */}
        {courtList.length > 0 && (
          <div style={S.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <h2 style={{...S.ct,margin:0}}>🔥 Peak Hour Predictions</h2>
                <p style={{...S.csub,margin:'4px 0 0 0'}}>AI-predicted demand score (0 = quiet · 10 = very busy)</p>
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {courtList.map(c => (
                  <button key={c.court_id}
                    onClick={() => setSelectedCourtId(c.court_id)}
                    style={{padding:'7px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',border:'1px solid',
                      background: c.court_id === activeCourt ? '#00e676' : 'transparent',
                      color:      c.court_id === activeCourt ? '#080c14' : '#7a8da8',
                      borderColor: c.court_id === activeCourt ? '#00e676' : 'rgba(255,255,255,0.1)'}}>
                    {c.court_name}
                  </button>
                ))}
              </div>
            </div>
            {activeCourtInfo && (
              <p style={{color:'#7a8da8',fontSize:'12px',marginBottom:'14px'}}>
                📍 {activeCourtInfo.venue_name}
              </p>
            )}
            <div style={S.hmap}>
              {courtPeaks.map((p,i) => (
                <div key={i} style={{...S.hcell, background: scoreColor(p.popularity_score)+'18',
                  border:'1px solid '+scoreColor(p.popularity_score)+'44'}}>
                  <p style={S.htime}>{p.start_time}</p>
                  <p style={{...S.hscore, color: scoreColor(p.popularity_score)}}>{p.popularity_score}</p>
                  <p style={S.hlbl}>{scoreLabel(p.popularity_score)}</p>
                </div>
              ))}
            </div>
            <div style={S.legend}>
              {[{c:'#00e676',l:'Quiet (0–4)'},{c:'#ffc107',l:'Moderate (4–6)'},{c:'#ff6b35',l:'Busy (6–8)'},{c:'#e74c3c',l:'Very Busy (8–10)'}].map((x,i)=>(
                <div key={i} style={S.litem}>
                  <div style={{...S.ldot, background:x.c}}/>
                  <span style={{color:'#7a8da8',fontSize:'12px'}}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECOMMENDER + RISK */}
        <div style={S.two}>

          {/* SLOT RECOMMENDER */}
          <div style={S.card}>
            <h2 style={S.ct}>🎯 Slot Recommender</h2>
            <p style={S.csub}>AI suggests your ideal time of day to book</p>
            <div style={S.fstack}>
              <div>
                <label style={S.lbl}>Venue</label>
                <select value={recForm.venue} onChange={e=>setRecForm({...recForm,venue:e.target.value})} style={S.sel}>
                  {venues.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Day of Week</label>
                <select value={recForm.day} onChange={e=>setRecForm({...recForm,day:e.target.value,
                  is_weekend:['Saturday','Sunday'].includes(e.target.value)?1:0})} style={S.sel}>
                  {days.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Month</label>
                <select value={recForm.month} onChange={e=>setRecForm({...recForm,month:parseInt(e.target.value)})} style={S.sel}>
                  {months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Payment Method</label>
                <select value={recForm.payment} onChange={e=>setRecForm({...recForm,payment:e.target.value})} style={S.sel}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
            <button onClick={getRecommendations} style={S.aiBtn} disabled={recLoading}>
              {recLoading ? 'Predicting... ⏳' : '🤖 Get AI Recommendation'}
            </button>

            {recs.length > 0 && (
              <div style={{marginTop:'20px'}}>
                <p style={{color:'#7a8da8',fontSize:'12px',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>Recommended time of day</p>
                {recs.map((r,i) => (
                  <div key={i} style={{...S.recCard, opacity: i===0?1:0.65,
                    borderColor: i===0 ? todColor(r.time_of_day) : 'rgba(255,255,255,0.06)'}}>
                    <div style={{...S.recBadge, background: todColor(r.time_of_day)+'20', color: todColor(r.time_of_day)}}>
                      {todIcon(r.time_of_day)} {r.time_of_day}
                    </div>
                    <div style={{flex:1}}>
                      <p style={S.recSlots}>
                        {r.slots?.map(s => s.start).join(' · ') || ''}
                      </p>
                    </div>
                    <div style={{...S.conf, color: i===0 ? todColor(r.time_of_day) : '#7a8da8'}}>
                      {r.confidence}%
                    </div>
                  </div>
                ))}
                <p style={{color:'#7a8da8',fontSize:'11px',marginTop:'10px'}}>
                  💡 Top pick based on your booking history & selected preferences
                </p>
              </div>
            )}
          </div>

          {/* CANCELLATION RISK */}
          <div style={S.card}>
            <h2 style={S.ct}>❌ Cancellation Risk</h2>
            <p style={S.csub}>AI predicts likelihood of a booking being cancelled</p>
            <div style={S.fstack}>
              <div>
                <label style={S.lbl}>Time of Day</label>
                <select value={riskForm.time_of_day} onChange={e=>setRiskForm({...riskForm,time_of_day:e.target.value})} style={S.sel}>
                  {['morning','afternoon','evening'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Payment Method</label>
                <select value={riskForm.payment} onChange={e=>setRiskForm({...riskForm,payment:e.target.value})} style={S.sel}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label style={S.lbl}>Month</label>
                <select value={riskForm.month} onChange={e=>setRiskForm({...riskForm,month:parseInt(e.target.value)})} style={S.sel}>
                  {months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Weekend?</label>
                <select value={riskForm.is_weekend} onChange={e=>setRiskForm({...riskForm,is_weekend:parseInt(e.target.value)})} style={S.sel}>
                  <option value={0}>Weekday</option>
                  <option value={1}>Weekend</option>
                </select>
              </div>
            </div>
            <button onClick={getRisk} style={S.aiBtn} disabled={riskLoading}>
              {riskLoading ? 'Predicting... ⏳' : '🔮 Predict Cancellation Risk'}
            </button>

            {risk && (
              <div style={{...S.riskBox, borderColor: riskColor(risk.risk_level)}}>
                <div style={S.riskTop}>
                  <div>
                    <p style={{...S.riskLvl, color: riskColor(risk.risk_level)}}>{risk.risk_level}</p>
                    <p style={S.riskSub}>cancellation probability</p>
                  </div>
                  <p style={{...S.riskPct, color: riskColor(risk.risk_level)}}>{risk.cancellation_probability}%</p>
                </div>
                <div style={S.rbar}>
                  <div style={{...S.rfill, width: Math.min(risk.cancellation_probability, 100)+'%',
                    background: riskColor(risk.risk_level)}}/>
                </div>
                <p style={S.rsugg}>💡 {risk.suggestion}</p>
              </div>
            )}
          </div>
        </div>

        {/* MODELS STATUS */}
        {summary?.models_loaded && (
          <div style={S.card}>
            <h2 style={S.ct}>🤖 Models Status</h2>
            <div style={S.mg}>
              {[
                {name:'Slot Recommender',      key:'slot_recommender',       icon:'🎯', desc:'Predicts best time of day for each user',      acc: summary.model1_accuracy+'%'},
                {name:'Peak Hour Predictor',    key:'peak_predictor',         icon:'📈', desc:'Predicts how busy each time slot will be',     acc: 'Live'},
                {name:'Cancellation Predictor', key:'cancellation_predictor', icon:'❌', desc:'Predicts cancellation risk before booking',    acc: summary.model3_accuracy+'%'},
              ].map((m,i) => {
                const ok = summary.models_loaded[m.key];
                return (
                  <div key={i} style={{...S.mcard, borderColor: ok?'rgba(0,230,118,0.25)':'rgba(231,76,60,0.25)'}}>
                    <div style={S.mtop}>
                      <span style={{fontSize:'28px'}}>{m.icon}</span>
                      <span style={{...S.mstat, background: ok?'rgba(0,230,118,0.12)':'rgba(231,76,60,0.12)',
                        color: ok?'#00e676':'#e74c3c'}}>{ok ? '✅ Loaded' : '❌ Not Trained'}</span>
                    </div>
                    <p style={S.mname}>{m.name}</p>
                    <p style={S.mdesc}>{m.desc}</p>
                    {ok && <p style={S.macc}>Accuracy: <strong style={{color:'#00e676'}}>{m.acc}</strong></p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

const S = {
  page:       {maxWidth:'1100px',margin:'0 auto',padding:'36px 24px'},
  hdr:        {display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'28px'},
  tag:        {fontSize:'12px',fontWeight:'700',letterSpacing:'2px',color:'#00e676',marginBottom:'6px'},
  title:      {fontFamily:"'Bebas Neue',sans-serif",fontSize:'46px',color:'#e8edf5',letterSpacing:'2px',marginBottom:'4px'},
  sub:        {color:'#7a8da8',fontSize:'14px'},
  refreshBtn: {background:'rgba(0,188,212,0.12)',color:'#00bcd4',border:'1px solid rgba(0,188,212,0.3)',padding:'10px 16px',borderRadius:'9px',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:'600',fontSize:'13px'},
  errBox:     {background:'rgba(231,76,60,0.1)',border:'1px solid rgba(231,76,60,0.3)',borderRadius:'10px',padding:'12px 16px',marginBottom:'20px',color:'#e74c3c',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'14px'},
  xBtn:       {background:'none',border:'none',color:'#e74c3c',cursor:'pointer',fontSize:'16px'},
  loading:    {textAlign:'center',color:'#7a8da8',padding:'80px',fontSize:'17px'},
  g4:         {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'14px',marginBottom:'14px'},
  g3:         {display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'22px'},
  scard:      {background:'#162032',border:'1px solid rgba(0,230,118,0.1)',borderRadius:'14px',padding:'20px',textAlign:'center'},
  sicon:      {fontSize:'30px',marginBottom:'8px'},
  slbl:       {color:'#7a8da8',fontSize:'12px',margin:'0 0 6px 0'},
  sval:       {fontSize:'26px',fontWeight:'700',fontFamily:"'Bebas Neue',sans-serif",letterSpacing:'1px',margin:'0 0 4px 0'},
  ssub:       {color:'#7a8da8',fontSize:'11px',margin:0},
  mini:       {background:'#162032',border:'1px solid rgba(0,230,118,0.08)',borderRadius:'12px',padding:'16px',display:'flex',gap:'12px',alignItems:'center'},
  mlbl:       {color:'#7a8da8',fontSize:'12px',margin:'0 0 4px 0'},
  mval:       {color:'#e8edf5',fontSize:'18px',fontWeight:'700',margin:0},
  card:       {background:'#162032',border:'1px solid rgba(0,230,118,0.1)',borderRadius:'14px',padding:'24px',marginBottom:'20px'},
  ct:         {fontFamily:"'Bebas Neue',sans-serif",fontSize:'22px',color:'#e8edf5',letterSpacing:'1.5px',margin:'0 0 4px 0'},
  csub:       {color:'#7a8da8',fontSize:'13px',margin:'0 0 18px 0'},
  hmap:       {display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px',marginBottom:'16px'},
  hcell:      {borderRadius:'10px',padding:'14px 8px',textAlign:'center'},
  htime:      {color:'#e8edf5',fontWeight:'700',fontSize:'13px',margin:'0 0 6px 0'},
  hscore:     {fontSize:'24px',fontWeight:'700',fontFamily:"'Bebas Neue',sans-serif",margin:'0 0 4px 0'},
  hlbl:       {fontSize:'11px',color:'#7a8da8',margin:0},
  legend:     {display:'flex',gap:'20px',flexWrap:'wrap'},
  litem:      {display:'flex',alignItems:'center',gap:'6px'},
  ldot:       {width:'10px',height:'10px',borderRadius:'50%'},
  two:        {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'20px'},
  fstack:     {display:'flex',flexDirection:'column',gap:'12px',marginBottom:'16px'},
  lbl:        {display:'block',fontSize:'11px',fontWeight:'700',color:'#7a8da8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'},
  sel:        {width:'100%',padding:'10px 12px',background:'#0d1421',border:'1px solid rgba(0,230,118,0.15)',borderRadius:'8px',color:'#e8edf5',fontFamily:"'Outfit',sans-serif",fontSize:'13px'},
  aiBtn:      {background:'#00e676',color:'#080c14',border:'none',padding:'11px 20px',borderRadius:'9px',cursor:'pointer',fontFamily:"'Outfit',sans-serif",fontWeight:'700',fontSize:'14px',width:'100%'},
  recCard:    {display:'flex',alignItems:'center',gap:'12px',background:'#0d1421',border:'1px solid',borderRadius:'10px',padding:'12px 14px',marginBottom:'8px'},
  recBadge:   {padding:'5px 10px',borderRadius:'8px',fontWeight:'700',fontSize:'13px',whiteSpace:'nowrap'},
  recSlots:   {color:'#7a8da8',fontSize:'12px',margin:0},
  conf:       {fontWeight:'700',fontSize:'15px',fontFamily:"'Bebas Neue',sans-serif",minWidth:'40px',textAlign:'right'},
  riskBox:    {marginTop:'18px',background:'#0d1421',border:'1px solid',borderRadius:'12px',padding:'18px'},
  riskTop:    {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'},
  riskLvl:    {fontWeight:'700',fontSize:'16px',margin:'0 0 4px 0'},
  riskSub:    {color:'#7a8da8',fontSize:'12px',margin:0},
  riskPct:    {fontFamily:"'Bebas Neue',sans-serif",fontSize:'36px',margin:0},
  rbar:       {background:'rgba(255,255,255,0.06)',borderRadius:'6px',height:'8px',overflow:'hidden',marginBottom:'12px'},
  rfill:      {height:'100%',borderRadius:'6px',transition:'width 0.6s ease'},
  rsugg:      {color:'#7a8da8',fontSize:'13px',margin:0},
  mg:         {display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px'},
  mcard:      {background:'#0d1421',border:'1px solid',borderRadius:'12px',padding:'18px'},
  mtop:       {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'},
  mstat:      {padding:'4px 10px',borderRadius:'8px',fontSize:'12px',fontWeight:'700'},
  mname:      {color:'#e8edf5',fontWeight:'700',fontSize:'14px',margin:'0 0 6px 0'},
  mdesc:      {color:'#7a8da8',fontSize:'12px',margin:'0 0 8px 0'},
  macc:       {color:'#7a8da8',fontSize:'12px',margin:0},
};

export default AIInsights;