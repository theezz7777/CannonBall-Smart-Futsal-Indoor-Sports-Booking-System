import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      await axios.post('http://127.0.0.1:5000/api/auth/register', {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.top}>
          <span style={styles.icon}>🏟️</span>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.sub}>Join CannonBall and start booking today</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successMsg}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Full Name</label>
          <input name="full_name" placeholder="Theekshana Denuwan" value={form.full_name} onChange={handleChange} required style={styles.input} />

          <label style={styles.label}>Email Address</label>
          <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required style={styles.input} />

          <label style={styles.label}>Phone Number</label>
          <input name="phone" placeholder="07X XXX XXXX" value={form.phone} onChange={handleChange} style={styles.input} />

          <label style={styles.label}>Password</label>
          <input name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required style={styles.input} />

          <label style={styles.label}>Confirm Password</label>
          <input name="confirm" type="password" placeholder="Repeat password" value={form.confirm} onChange={handleChange} required style={styles.input} />

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account →'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.footerLink}>Login here</Link>
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
    background: '#162032', border: '1px solid rgba(0,230,118,0.15)',
    borderRadius: '20px', padding: '48px 44px',
    width: '100%', maxWidth: '460px',
  },
  top: { textAlign: 'center', marginBottom: '36px' },
  icon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '38px', color: '#e8edf5', letterSpacing: '2px', marginBottom: '8px',
  },
  sub: { color: '#7a8da8', fontSize: '15px' },
  error: {
    background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.35)',
    color: '#e74c3c', padding: '12px 16px', borderRadius: '10px',
    marginBottom: '20px', fontSize: '14px',
  },
  successMsg: {
    background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.35)',
    color: '#00e676', padding: '12px 16px', borderRadius: '10px',
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
    marginBottom: '18px', display: 'block',
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

export default Register;