import React, { useState, useCallback, useEffect } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { Clock, CheckCircle, AlertCircle, Fingerprint, X, Download, Calendar, RefreshCw } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { app } from '../services/firebase';
import FaceScanner from '../components/FaceScanner';
import { recognizeFace } from '../services/faceApi';
import { exportEmployeePayslipPDF } from '../reports/ExportService';
import { isLate } from '../utils/calc';

const db = getFirestore(app);

const S = {
  card: {
    background: 'rgba(18,18,26,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden'
  },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem' },
  badge: (color) => ({
    background: color + '15', border: `1px solid ${color}30`, color: color,
    padding: '0.875rem 1rem', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500
  }),
  statusPill: (status) => {
    const map = {
      Present:    { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399' },
      Late:       { bg: 'rgba(251,191,36,0.15)',   border: 'rgba(251,191,36,0.3)',   color: '#fbbf24' },
      Absent:     { bg: 'rgba(248,113,113,0.15)',  border: 'rgba(248,113,113,0.3)',  color: '#f87171' },
      'Half Day': { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa' },
    };
    const s = map[status] || map.Present;
    return {
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
      display: 'inline-block', whiteSpace: 'nowrap',
    };
  },
};

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

const EmployeeDashboard = () => {
  const isMobile = useIsMobile();
  const { user, addRecord, settings, fetchSettings } = useAppStore();
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const today = new Date().toISOString().split('T')[0];

  // ── Face Attendance Modal state ──────────────────────────────
  const [faceModal, setFaceModal]   = useState(false);
  const [faceStatus, setFaceStatus] = useState('idle'); // idle|scanning|success|error

  const openFaceModal  = () => { setFaceModal(true);  setFaceStatus('scanning'); };
  const closeFaceModal = () => { setFaceModal(false); setFaceStatus('idle'); };

  // ── Attendance History ─────────────────────────────────────
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [historyLoading, setHistoryLoading]       = useState(false);
  const [historyFilter, setHistoryFilter]         = useState('all'); // all | month | week

  const fetchAttendanceHistory = useCallback(async () => {
    const empId = user?.employeeId || user?.id;
    if (!empId) return;
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', empId),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(records);
    } catch {
      // Fallback without orderBy if composite index not yet built
      try {
        const q2 = query(
          collection(db, 'attendance'),
          where('employeeId', '==', empId)
        );
        const snap2 = await getDocs(q2);
        const records2 = snap2.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.date > a.date ? 1 : -1));
        setAttendanceRecords(records2);
      } catch (e2) {
        console.error('Failed to fetch attendance history:', e2);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => { fetchAttendanceHistory(); }, [fetchAttendanceHistory]);

  const filteredRecords = attendanceRecords.filter(r => {
    if (historyFilter === 'all') return true;
    const rDate = new Date(r.date);
    const now   = new Date();
    if (historyFilter === 'month') {
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    }
    if (historyFilter === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
      return rDate >= weekAgo;
    }
    return true;
  });

  const statsPresent = filteredRecords.filter(r => r.status === 'Present').length;
  const statsLate    = filteredRecords.filter(r => r.status === 'Late').length;
  const statsTotal   = filteredRecords.length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':');
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' });
  };

  const handleFaceCapture = useCallback(async (base64) => {
    if (faceStatus !== 'scanning') return;
    try {
      const currentEmployeeId = user?.employeeId || user?.id;
      if (!currentEmployeeId) {
        toast.error('Session error: No Employee ID found.');
        closeFaceModal();
        return;
      }

      // Secure server-side face identification
      const result = await recognizeFace(base64, currentEmployeeId);

      if (!result.matched || String(result.employeeId) !== String(currentEmployeeId)) {
        toast.error('Face did not match the logged-in employee.');
        setFaceStatus('error');
        setTimeout(() => setFaceStatus('scanning'), 2000);
        return;
      }

      const existing = await getDocs(query(
        collection(db, 'attendance'),
        where('employeeId', '==', currentEmployeeId),
        where('date', '==', today),
      ));

      if (!existing.empty) {
        toast('Already marked for today ✅', { icon: '📋' });
        setFaceStatus('success');
        setTimeout(closeFaceModal, 2000);
        return;
      }

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const isLateVal = isLate(timeStr, settings?.shiftStart || '09:00', settings?.gracePeriod !== undefined ? settings.gracePeriod : 15);
      
      const [th, tm] = timeStr.split(':').map(Number);
      const [ch, cm] = (settings?.cutoffTime || '11:00').split(':').map(Number);
      const isCutoff = (th * 60 + tm) > (ch * 60 + cm);
      
      const status = isCutoff ? 'Absent' : (isLateVal ? 'Late' : 'Present');

      await addDoc(collection(db, 'attendance'), {
        employeeId: currentEmployeeId,
        date:       today,
        time:       timeStr,
        status:     status,
        markedAt:   serverTimestamp(),
      });

      setFaceStatus('success');
      if (isCutoff) {
        toast.error('Attendance marked past the cutoff time. Marked as Absent.', { duration: 4000 });
      } else if (isLateVal) {
        toast.warning('Attendance marked as Late. ⏰', { duration: 4000 });
      } else {
        toast.success('Attendance marked! 🎉', { duration: 3000 });
      }
      setTimeout(() => { closeFaceModal(); fetchAttendanceHistory(); }, 2500);
    } catch (err) {
      setFaceStatus('error');
      toast.error(err.message || 'Recognition failed.');
    }
  }, [faceStatus, user, today, fetchAttendanceHistory, settings]);

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

  const handleDownloadPayslip = () => {
    try {
      exportEmployeePayslipPDF(
        {
          name: user?.name || 'Employee',
          id: user?.id || user?.employeeId || 'EMP001',
          role: user?.role || 'Staff',
          baseSalary: user?.baseSalary || 5000,
          joinDate: user?.joinDate || '2025-01-01',
        },
        {
          workedHrs: 160,
          targetHrs: 160,
          leaveDays: 2,
          lateCount: 1,
          finalSalary: user?.baseSalary || 5000,
        },
        'Current Month'
      );
      toast.success('Payslip downloaded successfully!');
    } catch (err) {
      console.error('Payslip export error:', err);
      toast.error('Failed to generate payslip PDF.');
    }
  };

  const nowDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout>
      <Toaster position="top-center" toastOptions={{ style: { background: '#0d1424', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' } }} />

      <AnimatePresence>
        {faceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              style={{ background: 'rgba(12,16,28,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 24, padding: isMobile ? '1.25rem' : '2rem', width: '100%', maxWidth: 480, position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
              <button onClick={closeFaceModal} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', display: 'flex' }}>
                <X size={18} />
              </button>
              <h2 style={{ margin: '0 0 1.25rem', fontWeight: 800, fontSize: '1.2rem' }}>🔐 Mark Attendance</h2>
              <FaceScanner
                mode="attendance"
                status={faceStatus}
                onCapture={handleFaceCapture}
                onError={() => setFaceStatus('scanning')}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 0.5rem' : '0 1rem' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.85rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p style={{ color: '#64748b', marginTop: '0.3rem', fontSize: '0.85rem' }}>{nowDisplay}</p>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={openFaceModal}
              style={{ marginTop: '0.75rem', padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
              🧠 Mark Attendance via Face
            </motion.button>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPayslip}
            style={{ padding: '0.65rem 1.1rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, color: '#34d399', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontFamily: 'inherit', width: isMobile ? '100%' : 'auto' }}>
            <Download size={16} /> Download Payslip PDF
          </motion.button>
        </motion.div>

        <div className="r-grid-1-1">
          {/* Punch Card */}
          <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.01} transitionSpeed={2500}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={S.card}>
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

        {/* ── Attendance History Section ────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ ...S.card, marginBottom: '2rem' }}>

          {/* glow blob */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(99,102,241,0.06)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(99,102,241,0.15)', borderRadius: 12 }}>
                <Calendar size={22} color="#818cf8" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>My Attendance History</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>All your face-verified attendance records</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {['all', 'month', 'week'].map(f => (
                <button key={f} onClick={() => setHistoryFilter(f)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit', transition: 'all 0.2s',
                    background: historyFilter === f ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                    color:      historyFilter === f ? '#818cf8' : '#64748b',
                    outline:    historyFilter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {f === 'all' ? 'All Time' : f === 'month' ? 'This Month' : 'This Week'}
                </button>
              ))}
              <motion.button whileTap={{ rotate: 360, transition: { duration: 0.4 } }}
                onClick={fetchAttendanceHistory}
                style={{ padding: '0.45rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <RefreshCw size={16} />
              </motion.button>
            </div>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Days',  value: statsTotal,                           color: '#818cf8' },
              { label: 'Present',     value: statsPresent,                          color: '#34d399' },
              { label: 'Late',        value: statsLate,                             color: '#fbbf24' },
              { label: 'Absent',      value: Math.max(0, statsTotal - statsPresent - statsLate), color: '#f87171' },
            ].map(s => (
              <div key={s.label}
                style={{ flex: '1 1 90px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table / empty state */}
          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#475569' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
                <RefreshCw size={24} />
              </motion.div>
              <p>Loading attendance records…</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#475569' }}>
              <Calendar size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600 }}>No attendance records found</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Mark your attendance using face recognition above!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Day', 'Date', 'Check-in Time', 'Status'].map(h => (
                      <th key={h} style={{
                        padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem',
                        fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em',
                        borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec, i) => (
                    <motion.tr key={rec.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: rec.date === today ? 'rgba(99,102,241,0.06)' : 'transparent',
                      }}>
                      <td style={{ padding: '0.9rem 1rem', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '0.9rem 1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{getDayOfWeek(rec.date)}</td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 600, fontSize: '0.9rem', color: rec.date === today ? '#818cf8' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {formatDate(rec.date)}
                        {rec.date === today && (
                          <span style={{ marginLeft: '0.5rem', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700 }}>TODAY</span>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem' }}>
                          <Clock size={14} color="#818cf8" />
                          {formatTime(rec.time)}
                        </div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={S.statusPill(rec.status || 'Present')}>
                          {rec.status === 'Present' ? '✅ Present' :
                           rec.status === 'Late'    ? '⏰ Late'    :
                           rec.status === 'Absent'  ? '❌ Absent'  :
                           rec.status || '✅ Present'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.78rem', color: '#334155' }}>
                Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </motion.div>

      </div>
    </Layout>
  );
};

export default EmployeeDashboard;
