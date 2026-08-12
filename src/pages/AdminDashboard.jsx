import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { Users, Clock, TrendingUp, UserCheck, UserX, BarChart2, ChevronRight, Activity, RefreshCw, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../services/firebase';
import { calcFinalSalary } from '../utils/calc';

const db = getFirestore(app);
const todayStr = new Date().toISOString().split('T')[0];
const fmtTime = (s) => { if (!s) return '--'; const [h, m] = s.split(':'); const hr = parseInt(h, 10); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; };

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

const StatCard = ({ icon, label, value, sub, color, delay, onClick }) => (
  <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2200} style={{ height: '100%' }}>
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onClick={onClick}
      style={{
        background: 'rgba(14,14,22,0.75)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${color}22`,
        borderRadius: 20,
        padding: '1.4rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '165px'
      }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, background: color + '14', borderRadius: '50%', filter: 'blur(35px)', pointerEvents: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ padding: '0.55rem', background: color + '1a', borderRadius: 12 }}>{React.createElement(icon, { size: 20, color })}</div>
        {onClick && <ArrowUpRight size={16} color={color + '80'} />}
      </div>

      <div>
        <p style={{ margin: '0 0 0.3rem', fontSize: '2rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{value}</p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.74rem', color: sub ? color + 'cc' : 'transparent', fontWeight: 500, minHeight: '1.1em', visibility: sub ? 'visible' : 'hidden' }}>
          {sub || '—'}
        </p>
      </div>
    </motion.div>
  </Tilt>
);

const ActionCard = ({ icon, label, desc, color, onClick, delay }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    whileHover={{ y: -3, transition: { duration: 0.2 } }} onClick={onClick}
    style={{ background: 'rgba(14,14,22,0.7)', backdropFilter: 'blur(20px)', border: `1px solid ${color}20`, borderRadius: 18, padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
    onMouseEnter={e => e.currentTarget.style.borderColor = color + '45'}
    onMouseLeave={e => e.currentTarget.style.borderColor = color + '20'}>
    <div style={{ padding: '0.65rem', background: color + '18', borderRadius: 13, flexShrink: 0, fontSize: '1.3rem' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>{label}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>{desc}</p>
    </div>
    <ChevronRight size={16} color={color + '80'} />
  </motion.div>
);

const AdminDashboard = () => {
  const { user, employees, records, settings, fetchSettings } = useAppStore();
  const navigate = useNavigate();
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const fetchLiveData = async () => {
    setLiveLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'attendance'), where('date', '==', todayStr)));
      setTodayAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastRefreshed(new Date());
    } catch (err) { console.error(err); }
    finally { setLiveLoading(false); }
  };

  useEffect(() => { fetchLiveData(); }, []);

  const targetHrs = settings.workingDays * settings.hoursPerDay;
  const presentToday = todayAttendance.length;
  const absentToday = Math.max(0, employees.length - presentToday);
  const attendanceRate = employees.length > 0 ? Math.round((presentToday / employees.length) * 100) : 0;

  const payrollData = useMemo(() => employees.map(emp => {
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
    return { ...emp, days: empRec.length, hrs: hrs.toFixed(1), finalSalary: calcFinalSalary(emp.baseSalary, hrs, targetHrs, 0, settings?.workingDays || 26).toFixed(0) };
  }), [employees, records, targetHrs, settings]);

  const totalPayroll = payrollData.reduce((s, e) => s + Number(e.finalSalary), 0);
  const nowDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';
  const empName = (empId) => { const e = employees.find(e => String(e.id) === String(empId)); return e?.name || `ID: ${empId}`; };

  const isMobile = useIsMobile();

  return (
    <Layout>
      <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'fixed', top: '-15%', left: '-15%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -60, 0] }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 60%)', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ width: '100%', padding: isMobile ? '0 0.5rem' : '0 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live</span>
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Good {greeting}, <span className="text-gradient">{user?.name?.split(' ')[0] || 'Admin'}</span> 👋
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.82rem' }}>{nowDisplay}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
            {lastRefreshed && !isMobile && <span style={{ fontSize: '0.7rem', color: '#334155' }}>Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={fetchLiveData} disabled={liveLoading}
              style={{ flex: isMobile ? 1 : 'none', padding: '0.55rem 1.1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <motion.span animate={liveLoading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><RefreshCw size={14} /></motion.span>
              Refresh
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/admin/employees')}
              style={{ flex: isMobile ? 1 : 'none', padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
              <Users size={15} /> Staff
            </motion.button>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(175px, 1fr))', gap: isMobile ? '0.75rem' : '1rem', marginBottom: '1.75rem', alignItems: 'stretch' }}>
          <StatCard icon={Users}      label="Total Employees"  value={employees.length}       color="#8b5cf6" delay={0.04} onClick={() => navigate('/admin/employees')} />
          <StatCard icon={UserCheck}  label="Present Today"    value={presentToday}           color="#10b981" delay={0.08} sub={`${attendanceRate}% attendance`} />
          <StatCard icon={UserX}      label="Absent Today"     value={absentToday}            color="#f87171" delay={0.12} />
          <StatCard icon={BarChart2}  label="Total Records"    value={records.length}         color="#06b6d4" delay={0.16} />
          <StatCard icon={Clock}      label="Target Hrs/Mo"    value={`${targetHrs}h`}        color="#f59e0b" delay={0.20} />
          <StatCard icon={TrendingUp} label="Est. Payroll"     value={`₹${(totalPayroll/1000).toFixed(1)}k`} color="#34d399" delay={0.24} sub="Current period" />
        </div>

        {/* Two-column: Today feed + right panel */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'start' }}>

          {/* Today check-ins */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.15)', borderRadius: 11 }}><Activity size={18} color="#34d399" /></div>
                <div>
                  <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Today's Check-ins</h2>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <span style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                {presentToday} Present
              </span>
            </div>

            {liveLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#475569' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block' }}><RefreshCw size={20} /></motion.div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Loading…</p>
              </div>
            ) : todayAttendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#334155' }}>
                <UserX size={38} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>No check-ins yet today</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: 340, overflowY: 'auto' }}>
                {[...todayAttendance].sort((a, b) => a.time > b.time ? 1 : -1).map((rec, i) => (
                  <motion.div key={rec.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.85rem', flexShrink: 0 }}>
                      {empName(rec.employeeId).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empName(rec.employeeId)}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>ID: {rec.employeeId}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#818cf8', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Clock size={12} /> {fmtTime(rec.time)}
                      </div>
                      <span style={{ background: 'rgba(16,185,129,0.13)', border: '1px solid rgba(16,185,129,0.28)', color: '#34d399', padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, display: 'inline-block', marginTop: '0.2rem' }}>
                        {rec.status || 'Present'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Attendance ring */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Today's Rate</p>
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
                  <motion.circle cx="50" cy="50" r="42" fill="none"
                    stroke={attendanceRate >= 80 ? '#10b981' : attendanceRate >= 50 ? '#f59e0b' : '#f87171'}
                    strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 42) * (1 - attendanceRate / 100) }}
                    transition={{ duration: 1.2, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc' }}>{attendanceRate}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                <div><p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{presentToday}</p><p style={{ margin: 0, fontSize: '0.7rem', color: '#475569' }}>Present</p></div>
                <div><p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>{absentToday}</p><p style={{ margin: 0, fontSize: '0.7rem', color: '#475569' }}>Absent</p></div>
              </div>
            </motion.div>

            <ActionCard icon="👥" label="Manage Employees"  desc="Add, edit & view staff"        color="#8b5cf6" delay={0.34} onClick={() => navigate('/admin/employees')} />
            <ActionCard icon="🧠" label="Register Face"      desc="Enroll biometric for employee"  color="#6366f1" delay={0.38} onClick={() => navigate('/admin/register-face')} />
            <ActionCard icon="📊" label="Reports"            desc="View attendance & payroll"      color="#06b6d4" delay={0.42} onClick={() => navigate('/admin/reports')} />
          </div>
        </div>

        {/* Payroll Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '1.75rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(251,191,36,0.15)', borderRadius: 11 }}><TrendingUp size={18} color="#fbbf24" /></div>
              <div>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Payroll Summary</h2>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>Calculated from attendance records</p>
              </div>
            </div>
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14, padding: '0.5rem 1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Total</p>
              <p style={{ margin: '0.1rem 0 0', fontWeight: 900, fontSize: '1.15rem', color: '#fbbf24' }}>₹{totalPayroll.toLocaleString('en-IN')}</p>
            </div>
          </div>
          {payrollData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#334155' }}>
              <Users size={42} style={{ opacity: 0.15, display: 'block', margin: '0 auto 1rem' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No employees yet</p>
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate('/admin/employees')}
                style={{ marginTop: '1rem', padding: '0.6rem 1.25rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem' }}>
                Add First Employee
              </motion.button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Employee', 'Base Salary', 'Days Logged', 'Hours Worked', 'Est. Salary'].map(h => (
                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', color: '#475569', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollData.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>{d.name}</p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#475569' }}>#{d.id}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.88rem' }}>₹{d.baseSalary?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <span style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>{d.days} / {settings.workingDays}</span>
                    </td>
                    <td style={{ padding: '0.95rem 1rem', color: Number(d.hrs) >= targetHrs ? '#34d399' : '#f8fafc', fontWeight: 600, fontSize: '0.88rem' }}>
                      {d.hrs}h
                      {Number(d.hrs) < targetHrs && Number(d.hrs) > 0 && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 5px', borderRadius: 4 }}>-{(targetHrs - Number(d.hrs)).toFixed(1)}h</span>
                      )}
                    </td>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <span className="text-gradient" style={{ fontSize: '1.05rem', fontWeight: 900 }}>₹{Number(d.finalSalary).toLocaleString('en-IN')}</span>
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
