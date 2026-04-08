import React, { useState } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { Clock, CheckCircle, AlertCircle, Fingerprint } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';

const S = {
  card: {
    background: 'rgba(18,18,26,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden'
  },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' },
  badge: (color) => ({
    background: color + '15', border: `1px solid ${color}30`, color: color,
    padding: '0.875rem 1rem', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500
  })
};

const EmployeeDashboard = () => {
  const { user, addRecord } = useAppStore();
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const handlePunch = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      addRecord({ id: Date.now().toString(), empId: user.id, date: today, inTime, outTime, source: 'manual' });
      setMsg('Attendance recorded successfully!');
      setInTime(''); setOutTime('');
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }, 800);
  };

  const nowDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.3rem' }}>{nowDisplay}</p>
        </motion.div>

        <div className="r-grid-1-1">
          {/* Punch Card */}
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={2500}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={S.card}>
              {/* Glow blob */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(139,92,246,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(139,92,246,0.15)', borderRadius: 12 }}>
                  <Fingerprint size={22} color="#a78bfa" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Daily Punch Card</h2>
              </div>

              {msg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', padding: '0.75rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <CheckCircle size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handlePunch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={S.label}>In Time (When you arrived)</label>
                  <input type="time" className="input-field in-time" value={inTime} onChange={e => setInTime(e.target.value)} required style={{ fontFamily: 'monospace', fontSize: '1.1rem' }} />
                </div>
                <div>
                  <label style={S.label}>Out Time <span style={{ color: '#475569' }}>(optional)</span></label>
                  <input type="time" className="input-field out-time" value={outTime} onChange={e => setOutTime(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '1.1rem' }} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {loading ? 'Recording...' : <><Clock size={16} /> Submit Attendance</>}
                </button>
              </form>
            </motion.div>
          </Tilt>

          {/* Rules Card */}
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={2500}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ ...S.card, height: '100%' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'rgba(6,182,212,0.07)', borderRadius: '50%', filter: 'blur(40px)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6,182,212,0.15)', borderRadius: 12 }}>
                  <AlertCircle size={22} color="#22d3ee" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Attendance Rules</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={S.badge('#94a3b8')}>📋 Standard hours: 9:00 AM – 6:00 PM (9 hrs)</div>
                <div style={S.badge('#f87171')}>⏰ Late if you arrive after <strong>9:15 AM</strong></div>
                <div style={S.badge('#fbbf24')}>🌗 Half Day if worked less than <strong>4.5 hrs</strong></div>
                <div style={S.badge('#34d399')}>✅ Full Day if worked <strong>9+ hrs</strong></div>
                <div style={S.badge('#a78bfa')}>⚡ Overtime if worked more than <strong>9 hrs</strong></div>
              </div>
            </motion.div>
          </Tilt>
        </div>
      </div>
    </Layout>
  );
};

export default EmployeeDashboard;
