import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      {/* ── Hero ── */}
      <div style={styles.hero}>
        <div style={styles.heroBg} />
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>🏆 Sri Lanka's #1 Futsal Booking Platform</div>
          <h1 style={styles.heroTitle}>
            Book Your Court.<br />
            <span style={styles.heroGreen}>Play Smarter.</span>
          </h1>
          <p style={styles.heroSub}>
            Real-time slot booking for futsal & indoor sports across Sri Lanka.<br />
            AI-powered recommendations. Zero hassle.
          </p>
          <div style={styles.heroBtns}>
            <Link to="/venues" style={styles.btnPrimary}>Browse Venues →</Link>
            <Link to="/register" style={styles.btnSecondary}>Create Account</Link>
          </div>
          <div style={styles.stats}>
            <div style={styles.stat}><strong style={styles.statNum}>3+</strong><span style={styles.statLabel}>Venues</span></div>
            <div style={styles.divider} />
            <div style={styles.stat}><strong style={styles.statNum}>2</strong><span style={styles.statLabel}>Sports</span></div>
            <div style={styles.divider} />
            <div style={styles.stat}><strong style={styles.statNum}>24/7</strong><span style={styles.statLabel}>Booking</span></div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={styles.features}>
        <p style={styles.sectionTag}>WHY CANNONBALL</p>
        <h2 style={styles.sectionTitle}>Everything You Need to Play</h2>
        <div style={styles.grid}>
          {[
            { icon: '🏟️', title: 'Multiple Venues', desc: 'Browse courts across Colombo, Kandy, Galle and more districts.' },
            { icon: '⚡', title: 'Instant Booking', desc: 'Check availability and reserve your slot in seconds — no phone calls.' },
            { icon: '💳', title: 'Flexible Payments', desc: 'Pay online or choose cash on arrival. Your choice, always.' },
            { icon: '🤖', title: 'AI Recommendations', desc: 'Smart slot suggestions based on your history and peak-hour patterns.' },
          ].map((f, i) => (
            <div key={i} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={styles.cta}>
        <h2 style={styles.ctaTitle}>Ready to Play?</h2>
        <p style={styles.ctaSub}>Join CannonBall and book your first court in under 2 minutes.</p>
        <Link to="/register" style={styles.btnPrimary}>Get Started — It's Free</Link>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    position: 'relative',
    minHeight: '88vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    overflow: 'hidden',
    padding: '60px 24px',
  },
  heroBg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,230,118,0.1) 0%, transparent 70%), linear-gradient(180deg, #080c14 0%, #0d1421 100%)',
  },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: '720px' },
  heroBadge: {
    display: 'inline-block',
    background: 'rgba(0,230,118,0.12)',
    border: '1px solid rgba(0,230,118,0.3)',
    color: '#00e676',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    marginBottom: '28px',
  },
  heroTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '80px',
    lineHeight: 1.05,
    color: '#e8edf5',
    letterSpacing: '2px',
    marginBottom: '24px',
  },
  heroGreen: { color: '#00e676' },
  heroSub: {
    fontSize: '18px',
    color: '#7a8da8',
    lineHeight: 1.7,
    marginBottom: '40px',
  },
  heroBtns: { display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '50px' },
  btnPrimary: {
    background: '#00e676',
    color: '#080c14',
    padding: '15px 32px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '700',
    transition: 'all 0.25s',
  },
  btnSecondary: {
    background: 'transparent',
    color: '#e8edf5',
    padding: '15px 32px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '600',
    border: '1px solid rgba(232,237,245,0.2)',
  },
  stats: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statNum: { fontSize: '28px', color: '#00e676', fontWeight: '700' },
  statLabel: { fontSize: '13px', color: '#7a8da8', fontWeight: '500' },
  divider: { width: '1px', height: '40px', background: 'rgba(122,141,168,0.3)' },
  features: {
    background: '#0d1421',
    padding: '90px 40px',
    textAlign: 'center',
  },
  sectionTag: {
    fontSize: '12px', fontWeight: '700', letterSpacing: '2px',
    color: '#00e676', marginBottom: '12px',
  },
  sectionTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '44px', color: '#e8edf5', letterSpacing: '1px', marginBottom: '50px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  featureCard: {
    background: '#162032',
    border: '1px solid rgba(0,230,118,0.12)',
    borderRadius: '16px',
    padding: '36px 28px',
    textAlign: 'left',
    transition: 'transform 0.25s, box-shadow 0.25s',
  },
  featureIcon: { fontSize: '40px', display: 'block', marginBottom: '18px' },
  featureTitle: { fontSize: '18px', fontWeight: '700', color: '#e8edf5', marginBottom: '10px' },
  featureDesc: { fontSize: '14px', color: '#7a8da8', lineHeight: 1.7 },
  cta: {
    background: 'linear-gradient(135deg, #0d1421 0%, #162032 100%)',
    padding: '90px 40px',
    textAlign: 'center',
    borderTop: '1px solid rgba(0,230,118,0.1)',
  },
  ctaTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '52px', color: '#e8edf5', letterSpacing: '2px', marginBottom: '16px',
  },
  ctaSub: { fontSize: '18px', color: '#7a8da8', marginBottom: '36px' },
};

export default Home;