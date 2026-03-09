import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('cannonball_user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('cannonball_user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={S.nav}>
      <Link to="/" style={S.brand}>
        <span style={S.brandIcon}>⚽</span>
        <span style={S.brandText}>CANNON<span style={S.brandGreen}>BALL</span></span>
      </Link>

      <div style={S.links}>
        <Link to="/"        style={{...S.link, ...(isActive('/')           ? S.active    : {})}}>Home</Link>
        <Link to="/venues"  style={{...S.link, ...(isActive('/venues')     ? S.active    : {})}}>Venues</Link>
        <Link to="/ai"      style={{...S.link, ...(isActive('/ai')         ? S.activeAI  : {})}}>🤖 AI Insights</Link>
        {user && (
          <Link to="/my-bookings" style={{...S.link, ...(isActive('/my-bookings') ? S.active : {})}}>
            My Bookings
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin" style={{...S.link, ...(isActive('/admin') ? S.activeAdmin : {})}}>
            🛡️ Admin
          </Link>
        )}
      </div>

      <div style={S.actions}>
        {user ? (
          <>
            <span style={S.badge}>👤 {user.full_name?.split(' ')[0]}</span>
            <button onClick={handleLogout} style={S.logoutBtn}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"    style={S.loginLink}>Login</Link>
            <Link to="/register" style={S.regBtn}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const S = {
  nav:         { background: 'rgba(8,12,20,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,230,118,0.12)', padding: '0 40px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000 },
  brand:       { display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' },
  brandIcon:   { fontSize: '26px' },
  brandText:   { fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', color: '#e8edf5', letterSpacing: '2px' },
  brandGreen:  { color: '#00e676' },
  links:       { display: 'flex', gap: '30px', alignItems: 'center' },
  link:        { color: '#7a8da8', textDecoration: 'none', fontSize: '15px', fontWeight: '500', padding: '4px 0' },
  active:      { color: '#00e676', borderBottom: '2px solid #00e676' },
  activeAI:    { color: '#00bcd4', borderBottom: '2px solid #00bcd4' },
  activeAdmin: { color: '#ff6b35', borderBottom: '2px solid #ff6b35' },
  actions:     { display: 'flex', alignItems: 'center', gap: '16px' },
  badge:       { color: '#00e676', fontWeight: '600', fontSize: '14px', background: 'rgba(0,230,118,0.1)', padding: '7px 14px', borderRadius: '20px' },
  logoutBtn:   { background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: '600', fontSize: '14px' },
  loginLink:   { color: '#7a8da8', textDecoration: 'none', fontSize: '15px', fontWeight: '500' },
  regBtn:      { background: '#00e676', color: '#080c14', padding: '9px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' },
};

export default Navbar;