import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Venues from './pages/Venues';
import Booking from './pages/Booking';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import AIInsights from './pages/AIInsights';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/venues" element={<Venues />} />
        <Route path="/booking/:courtId" element={<Booking />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/admin"             element={<Admin />} />
        <Route path="/ai" element={<AIInsights />} />
      </Routes>
    </Router>
  );
}

export default App;