import React, { useState, useCallback } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { Clock, CheckCircle, AlertCircle, Fingerprint, X } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { app } from '../services/firebase';
import FaceScanner from '../components/FaceScanner';
import { recognizeFace } from '../services/faceApi';

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
  })
};

const EmployeeDashboard = () => {
  const { user, addRecord } = useAppStore();
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

  /**
   * Called by FaceScanner on each auto-capture tick.
   * Fetches all employee encodings from Firestore, sends to backend for recognition,
   * then writes an attendance record if matched and not already logged today.
   */
  const handleFaceCapture = useCallback(async (base64) => {
    if (faceStatus !== 'scanning') return;
    try {
      // Fetch stored embeddings for current user (employee must be registered)
      const empSnap = await getDocs(query(collection(db, 'employees'), where('uid', '==', user?.id)));
      if (empSnap.empty) { toast.error('Face not registered. Ask admin to register you.'); closeFaceModal(); return; }

      const empData = empSnap.docs[0].data();
      const storedEmbeddings = (empData.faceEmbeddings || []).map(str => {
          try { return typeof str === 'string' ? JSON.parse(str) : str; } catch { return str; }
      });
      const { matched } = await recognizeFace(base64, storedEmbeddings);

      if (!matched) return; // keep scanning silently

      // Check if already logged today
      const existing = await getDocs(query(
        collection(db, 'attendance'),
        where('employeeId', '==', empData.employeeId),
        where('date', '==', today),
      ));

      if (!existing.empty) {
        toast('Already marked for today ✅', { icon: '📋' });
        setFaceStatus('success');
        setTimeout(closeFaceModal, 2000);
        return;
      }

      // Write attendance record
      const now = new Date();
      await addDoc(collection(db, 'attendance'), {
        employeeId: empData.employeeId,
        date:       today,
        time:       now.toTimeString().split(' ')[0],
        status:     'Present',
        markedAt:   serverTimestamp(),
      });

      setFaceStatus('success');
      toast.success('Attendance marked! 🎉', { duration: 3000 });
      setTimeout(closeFaceModal, 2500);
    } catch (err) {
      setFaceStatus('error');
      toast.error(err.message || 'Recognition failed.');
    }
  }, [faceStatus, user, today]);

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
      <Toaster position="top-center" toastOptions={{ style: { background: '#0d1424', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' } }} />

      {/* ── Face Attendance Modal ───────────────────────────────── */}
      <AnimatePresence>
        {faceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              style={{ background: 'rgba(12,16,28,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 480, position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
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

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.3rem' }}>{nowDisplay}</p>

          {/* ── Mark Attendance via Face ── */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={openFaceModal}
            style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', fontFamily: 'inherit' }}>
            🧠 Mark Attendance via Face
          </motion.button>
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

