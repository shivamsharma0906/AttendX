import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { Users, Clock, Calendar, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';

/* ── Motivation Carousel ──────────────────────────────────── */
const QUOTES = [
  "“The only way to do great work is to love what you do.” — Steve Jobs",
  "“Success is not final, failure is not fatal: it is the courage to continue that counts.”",
  "“Don't count the days, make the days count.” — Muhammad Ali",
  "“Hard work beats talent when talent doesn’t work hard.” — Tim Notke",
  "“Your limitation—it's only your imagination.”",
  "“Great things never come from comfort zones.”",
  "“Dream big and dare to fail.” — Norman Vaughan"
];

const QuoteCarousel = () => {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const int = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(int);
  }, []);

  return (
    <div style={{ position: 'relative', height: 26, overflow: 'hidden', marginTop: '0.4rem' }}>
      <AnimatePresence mode="wait">
        <motion.p key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ margin: 0, color: '#22d3ee', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(6,182,212,0.4)' }}>
          {QUOTES[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

const statCard = (icon, label, value, color, delay) => (
  <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} scale={1.02} transitionSpeed={2000}>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)',
        border: `1px solid ${color}25`, borderRadius: 16,
        padding: '1.5rem', position: 'relative', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: color + '12', borderRadius: '50%', filter: 'blur(30px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ padding: '0.5rem', background: color + '18', borderRadius: 10 }}>
          {React.createElement(icon, { size: 20, color })}
        </div>
        <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#f8fafc' }}>{value}</p>
    </motion.div>
  </Tilt>
);

const AdminDashboard = () => {
  const { user, employees, records, settings, addEmployee } = useAppStore();
  const navigate = useNavigate();
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const targetHrs = settings.workingDays * settings.hoursPerDay;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPunches = records.filter(r => r.date === todayStr).length;

  const handleAddEmp = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newSalary) return;
    addEmployee({ id: Date.now().toString(), name: newName.trim(), baseSalary: Number(newSalary), joinDate: todayStr });
    setNewName(''); setNewSalary(''); setShowAddEmp(false);
  };

  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const empRec = records.filter(r => r.empId === emp.id);
      let hrs = 0;
      empRec.forEach(r => {
        if (r.inTime && r.outTime) {
          const [ih, im] = r.inTime.split(':').map(Number);
          const [oh, om] = r.outTime.split(':').map(Number);
          let diff = (oh + om / 60) - (ih + im / 60);
          if (diff < 0) diff += 24;
          hrs += diff;
        }
      });
      const finalSalary = ((emp.baseSalary / targetHrs) * hrs).toFixed(0);
      return { ...emp, days: empRec.length, hrs: hrs.toFixed(1), finalSalary };
    });
  }, [employees, records, targetHrs]);

  return (
    <Layout>
      {/* 🔮 Insane Level Animated Glowing Background Orbs */}
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'fixed', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(0,0,0,0) 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 60%)', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />
      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'fixed', top: '30%', left: '40%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 50%)', filter: 'blur(120px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* ✨ Glassmorphic Hero Banner */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2.5rem', padding: '1px', borderRadius: 24, background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(6,182,212,0.5), rgba(16,185,129,0.3))', position: 'relative', zIndex: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>

          <div style={{ background: 'rgba(10,10,18,0.7)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 23, padding: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>

            {/* Internal subtle glow */}
            <div style={{ position: 'absolute', top: -50, left: -50, width: 250, height: 250, background: 'rgba(139,92,246,0.25)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ margin: '0 0 0.5rem', fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.02em', WebkitTextFillColor: 'transparent', background: 'linear-gradient(to right, #f8fafc, #cbd5e1)', WebkitBackgroundClip: 'text' }}>
                Admin <span className="tg" style={{ filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.6))' }}>Control Center</span> ⚡
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => setShowAddEmp(v => !v)} className="btn-v" style={{ padding: '0.7rem 1.25rem', boxShadow: '0 8px 20px rgba(139,92,246,0.3)' }}>
                  <Plus size={16} /> Add Employee
                </button>
                <button onClick={() => navigate('/register-face')} className="btn-v" style={{ padding: '0.7rem 1.25rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 20px rgba(99,102,241,0.3)' }}>
                  🧠 Register Face
                </button>
                <QuoteCarousel />
              </div>
            </div>

            <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Add Employee Panel */}
        {showAddEmp && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>New Employee</h3>
            <form onSubmit={handleAddEmp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <input className="input-field" placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, minWidth: 200 }} required />
              <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>₹</span>
                <input className="input-field" type="number" placeholder="Monthly Salary" value={newSalary} onChange={e => setNewSalary(e.target.value)} style={{ paddingLeft: '1.75rem' }} required />
              </div>
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setShowAddEmp(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '0.75rem 1rem', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </form>
          </motion.div>
        )}

        {/* Stats */}
        <div className="r-grid-4" style={{ marginBottom: '2rem' }}>
          {statCard(Users, 'Employees', employees.length, '#8b5cf6', 0.05)}
          {statCard(Calendar, "Today's Punches", todayPunches, '#06b6d4', 0.1)}
          {statCard(Clock, 'Target Hours / Month', `${targetHrs}h`, '#f59e0b', 0.15)}
          {statCard(TrendingUp, 'Total Records', records.length, '#10b981', 0.2)}
        </div>

        {/* Payroll Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-panel" style={{ padding: '2rem', overflowX: 'auto' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontWeight: 700, fontSize: '1.1rem' }}>Payroll Summary</h2>
          {payrollData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
              <Users size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
              <p>No employees yet. Click "Add Employee" to get started.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Employee', 'Base Salary', 'Days Present', 'Hours Worked', 'Final Salary'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollData.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>₹{d.baseSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.85rem' }}>
                        {d.days} / {settings.workingDays}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: Number(d.hrs) >= targetHrs ? '#34d399' : '#f8fafc' }}>
                      {d.hrs}h
                      {Number(d.hrs) < targetHrs && Number(d.hrs) > 0 && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 5px', borderRadius: 4 }}>
                          -{(targetHrs - Number(d.hrs)).toFixed(1)}h
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="text-gradient" style={{ fontSize: '1.15rem', fontWeight: 800 }}>₹{Number(d.finalSalary).toLocaleString('en-IN')}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
