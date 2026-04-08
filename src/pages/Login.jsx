import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { mockFirebaseAuth } from '../services/firebase';

const Login = () => {
  const [email, setEmail] = useState('admin@nexuspay.com');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await mockFirebaseAuth(email, password);
      login(user, user.role);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/employee');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '1.5rem', backgroundColor: '#06060c',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(139,92,246,0.12), transparent 35%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.08), transparent 35%)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-panel"
        style={{ padding: '2.5rem', width: '100%', maxWidth: '420px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>
            NexusPay
          </h1>
          <p style={{ color: '#64748b', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
            Smart Attendance & HR Platform
          </p>
          <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', margin: '1rem auto 0', borderRadius: 2 }} />
        </div>

        {error && (
          <div style={{
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
            color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.875rem', textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                type="email"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ color: '#475569', fontSize: '0.75rem', margin: '0 0 0.3rem', textAlign: 'center' }}>Demo Credentials</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0', textAlign: 'center' }}>
            Admin: admin@nexuspay.com / <strong>admin</strong>
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0.2rem 0 0', textAlign: 'center' }}>
            Employee: emp@nexuspay.com / <strong>emp</strong>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
