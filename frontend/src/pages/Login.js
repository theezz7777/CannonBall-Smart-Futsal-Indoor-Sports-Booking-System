import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/auth/login', form);
      localStorage.setItem('cannonball_user', JSON.stringify(res.data.user));
      navigate('/venues');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.top}>
          <span style={styles.icon}>⚽</span>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.sub}>Log in to your CannonBall account</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email Address</label>
          <input
            name="email" type="email" placeholder="you@example.com"
            value={form.email} onChange={handleChange}
            required style={styles.input}
          />
          <label style={styles.label}>Password</label>
          <input
            name="password" type="password" placeholder="••••••••"
            value={form.password} onChange={handleChange}
            required style={styles.input}
          />
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.footerLink}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: 'calc(100vh - 70px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(0,230,118,0.07) 0%, transparent 70%), #080c14',
    padding: '40px 24px',
  },
  card: {
    background: '#162032',
    border: '1px solid rgba(0,230,118,0.15)',
    borderRadius: '20px',
    padding: '48px 44px',
    width: '100%',
    maxWidth: '440px',
  },
  top: { textAlign: 'center', marginBottom: '36px' },
  icon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '38px', color: '#e8edf5', letterSpacing: '2px', marginBottom: '8px',
  },
  sub: { color: '#7a8da8', fontSize: '15px' },
  error: {
    background: 'rgba(231,76,60,0.12)',
    border: '1px solid rgba(231,76,60,0.35)',
    color: '#e74c3c',
    padding: '12px 16px', borderRadius: '10px',
    marginBottom: '20px', fontSize: '14px',
  },
  label: {
    display: 'block', fontSize: '12px', fontWeight: '700',
    color: '#7a8da8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px',
  },
  input: {
    width: '100%', padding: '13px 16px',
    background: '#0d1421', border: '1px solid rgba(0,230,118,0.15)',
    borderRadius: '10px', color: '#e8edf5',
    fontFamily: "'Outfit', sans-serif", fontSize: '15px',
    marginBottom: '20px', display: 'block',
  },
  btn: {
    width: '100%', background: '#00e676', color: '#080c14',
    padding: '14px', borderRadius: '10px', border: 'none',
    fontFamily: "'Outfit', sans-serif", fontSize: '16px',
    fontWeight: '700', cursor: 'pointer', marginTop: '8px',
  },
  footer: { textAlign: 'center', marginTop: '28px', color: '#7a8da8', fontSize: '14px' },
  footerLink: { color: '#00e676', fontWeight: '600', textDecoration: 'none' },
};

export default Login;