/**
 * RegisterFace.jsx — Admin page to enroll a new employee's face.
 *
 * Flow:
 *  1. Admin fills Employee Name + Employee ID
 *  2. FaceScanner captures 3 images sequentially (with 1.5s delay between each)
 *  3. POST /register-face → receives 3 embeddings
 *  4. Saves to Firestore employees/{employeeId}
 *  5. Toast on success / failure
 */

import React, { useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { app } from '../services/firebase';
import { registerFace } from '../services/faceApi';
import FaceScanner from '../components/FaceScanner';

const db = getFirestore(app);
const REQUIRED_IMAGES = 3;

/** Progress dots */
const ProgressDots = ({ current, total }) => (
  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.75rem 0' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        width: 10, height: 10, borderRadius: '50%',
        background: i < current ? 'var(--success)' : i === current ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.3s',
        boxShadow: i < current ? '0 0 8px var(--success)' : 'none',
      }} />
    ))}
  </div>
);

const RegisterFace = () => {
  const [empName,   setEmpName]   = useState('');
  const [empId,     setEmpId]     = useState('');
  const [status,    setStatus]    = useState('idle');   // idle | scanning | success | error
  const [phase,     setPhase]     = useState('form');   // form | scanning | done
  const [captured,  setCaptured]  = useState([]);       // collected base64 images

  const startScan = (e) => {
    e.preventDefault();
    if (!empName.trim() || !empId.trim()) return;
    setCaptured([]);
    setStatus('idle');
    setPhase('scanning');
  };

  /** Called by FaceScanner on every auto-capture tick */
  const handleCapture = useCallback(async (base64) => {
    setCaptured(prev => {
      const next = [...prev, base64];

      if (next.length < REQUIRED_IMAGES) {
        // Not enough images yet — keep scanning
        return next;
      }

      // We have all 3; stop the scanner and trigger registration
      setStatus('idle');
      submitRegistration(next);
      return next;
    });
  }, [empName, empId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const submitRegistration = async (images) => {
    setStatus('scanning'); // show spinner while calling API
    try {
      const { embeddings } = await registerFace(images, empId, empName);

      await setDoc(doc(db, 'employees', empId), {
        name:          empName,
        employeeId:    empId,
        faceEmbeddings: embeddings.map(emb => JSON.stringify(emb)),
        registeredAt:  serverTimestamp(),
      }, { merge: true });

      setStatus('success');
      setPhase('done');
      toast.success(`${empName} registered successfully!`, { icon: '✅', duration: 4000 });
    } catch (err) {
      setStatus('error');
      toast.error(err.message || 'Registration failed. Please try again.', { duration: 5000 });
    }
  };

  const reset = () => {
    setEmpName(''); setEmpId('');
    setCaptured([]); setStatus('idle'); setPhase('form');
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { background: '#0d1424', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' } }} />

      <div style={{ maxWidth: 540, margin: '2rem auto', padding: '0 1rem' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '1px', borderRadius: 24, background: 'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(16,185,129,0.3))' }}>
          <div className="glass" style={{ borderRadius: 23, padding: '2.5rem 2rem', position: 'relative' }}>
            {/* Back button */}
            <Link to="/admin-dashboard" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.4rem', display: 'flex', transition: 'background 0.2s', zIndex: 10 }}>
              <ArrowLeft size={20} />
            </Link>
            <h2 style={{ margin: '0 0 0.4rem', fontWeight: 900, fontSize: '1.4rem', paddingRight: '2.5rem', lineHeight: '1.2' }}>
              Register <span className="tg">Employee Face</span>
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.83rem', paddingRight: '2.5rem' }}>
              Capture 3 photos to create a face profile for attendance recognition.
            </p>

            {/* Step 1: Form */}
            <AnimatePresence mode="wait">
              {phase === 'form' && (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onSubmit={startScan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="login-label">Employee Full Name</label>
                    <input className="ipt" placeholder="e.g. Rahul Sharma" value={empName}
                      onChange={e => setEmpName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="login-label">Employee ID</label>
                    <input className="ipt" placeholder="e.g. EMP001" value={empId}
                      onChange={e => setEmpId(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-v" style={{ marginTop: '0.5rem' }}>
                    📸 Begin Face Capture
                  </button>
                </motion.form>
              )}

              {/* Step 2: Scanning */}
              {phase === 'scanning' && (
                <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#c4b5fd' }}>
                      Image {Math.min(captured.length + 1, REQUIRED_IMAGES)} of {REQUIRED_IMAGES}
                    </p>
                    <ProgressDots current={captured.length} total={REQUIRED_IMAGES} />
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      Look directly at the camera. Stay still.
                    </p>
                  </div>
                  <FaceScanner
                    mode="register"
                    status={captured.length < REQUIRED_IMAGES ? 'scanning' : status}
                    onCapture={handleCapture}
                    onError={() => { setCaptured([]); setStatus('scanning'); }}
                  />
                </motion.div>
              )}

              {/* Step 3: Done */}
              {phase === 'done' && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                  <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.2rem', color: '#34d399' }}>
                    Registration Successful
                  </h3>
                  <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <strong>{empName}</strong> (ID: {empId}) is now enrolled.
                  </p>
                  <button className="btn btn-v" onClick={reset}>Register Another Employee</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterFace;
