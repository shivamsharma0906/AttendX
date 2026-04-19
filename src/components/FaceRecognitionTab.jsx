/**
 * FaceRecognitionTab.jsx — Premium 1:N Face Recognition Kiosk
 *
 * Modes:
 *  REGISTRATION:
 *    1. Ask for employee name
 *    2. Capture 3 images from different angles
 *    3. Send to backend for encoding
 *    4. Store in Firestore
 *
 *  ATTENDANCE:
 *    1. Auto-capture every ~2.5s
 *    2. Send to /recognize-face with all encodings
 *    3. On match → fetch employee name → mark attendance
 *    4. Auto-reset after 5s
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Scan, CheckCircle2, XCircle, Wifi, WifiOff,
  RefreshCw, Users, Star, Clock, Shield, Plus, Camera, Upload, ArrowRight,
} from 'lucide-react';
import FaceScanner from './FaceScanner';
import { recognizeFace, checkBackendHealth, registerFace } from '../services/faceApi';
import {
  fetchAllEmployeeEncodings,
  getEmployeeById,
  markAttendanceFirestore,
} from '../services/firestoreService';
import useStore from '../store/useAppStore';

// ── Constants ─────────────────────────────────────────────────────────────────
const GREETING_DISPLAY_MS = 5000;
const RESET_DELAY_MS = 5500;
const SCAN_COOLDOWN_MS = 2500;
const ANGLES = ['Front', 'Left Turn', 'Right Turn'];

// ── Registration Form ─────────────────────────────────────────────────────────
const RegistrationForm = ({ onSubmit, loading }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
        borderRadius: 20,
        padding: '2rem',
        border: '1px solid rgba(99,102,241,0.2)',
      }}
    >
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
        📝 Employee Registration
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Enter your full name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          autoFocus
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={!name.trim() || loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
          }}
        >
          {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={16} />}
          {loading ? 'Processing...' : 'Next'}
        </button>
      </form>
    </motion.div>
  );
};

// ── Image Capture Step ────────────────────────────────────────────────────────
const CaptureStepper = ({ currentStep, angles }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem' }}>
    {angles.map((angle, idx) => (
      <motion.div
        key={idx}
        style={{
          flex: 1,
          padding: '1rem',
          borderRadius: '12px',
          background: idx < currentStep ? '#10b981' : idx === currentStep ? '#f59e0b' : 'rgba(255,255,255,0.05)',
          border: idx === currentStep ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 700,
        }}
        animate={{
          scale: idx === currentStep ? 1.05 : 1,
          boxShadow: idx === currentStep ? '0 0 20px rgba(245,158,11,0.4)' : 'none',
        }}
      >
        {idx < currentStep ? '✓' : `${idx + 1}`}
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem' }}>{angle}</p>
      </motion.div>
    ))}
  </div>
);

// ── Confidence Bar ────────────────────────────────────────────────────────────
const ConfidenceBar = ({ value }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#D4AF37' : pct >= 60 ? '#10b981' : '#f59e0b';
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          Match Confidence
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          style={{
            height: '100%',
            borderRadius: 99,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      </div>
    </div>
  );
};

// ── Greeting Card ─────────────────────────────────────────────────────────────
const GreetingCard = ({ name, confidence, time, isRegistration, particleRandoms }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.85, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: -20 }}
    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    style={{
      padding: '1px',
      borderRadius: 24,
      background: 'linear-gradient(135deg, #D4AF37, #B8962E, #D4AF3766)',
      boxShadow: '0 30px 80px -15px rgba(212,175,55,0.45), 0 0 0 1px rgba(212,175,55,0.15)',
    }}
  >
    <div
      style={{
        background: 'rgba(11,15,26,0.92)',
        backdropFilter: 'blur(40px)',
        borderRadius: 23,
        padding: '3rem 2.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gold ambient glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(30px)',
      }} />

      {/* Success ring */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: 88, height: 88,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
          border: '2px solid #D4AF37',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 30px rgba(212,175,55,0.4), inset 0 0 20px rgba(212,175,55,0.1)',
          position: 'relative', zIndex: 1,
        }}
      >
        <CheckCircle2 size={40} color="#D4AF37" strokeWidth={1.8} />
      </motion.div>

      {/* Greeting text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <p style={{
          margin: '0 0 0.35rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#D4AF37',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}>
          {isRegistration ? '✅ Face Registered' : '✅ Attendance Marked'}
        </p>
        <h2 style={{
          margin: '0 0 0.5rem',
          fontSize: '2rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #fff 40%, #D4AF37)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Welcome, {name}!
        </h2>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
          <Clock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: '#94a3b8' }} />
          {isRegistration ? 'Registration complete' : `Checked in at ${time}`}
        </p>

        {!isRegistration && <ConfidenceBar value={confidence} />}

        <p style={{ margin: '1.25rem 0 0', fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
          Resetting in a moment…
        </p>
      </motion.div>

      {/* Particle sparkles */}
      {[...Array(6)].map((_, i) => {
        const rand = particleRandoms?.[i] || { x: 0, y: 0 };
        return (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: rand.x, y: rand.y }}
            transition={{ delay: 0.3 + i * 0.08, duration: 1.2 }}
            style={{
              position: 'absolute',
              top: '45%', left: '50%',
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#D4AF37',
              boxShadow: '0 0 8px #D4AF37',
              zIndex: 1,
            }}
          />
        );
      })}
    </div>
  </motion.div>
);

// ── No Match Card ─────────────────────────────────────────────────────────────
const NoMatchCard = ({ onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    style={{
      padding: '1px',
      borderRadius: 20,
      background: 'linear-gradient(135deg, rgba(239,68,68,0.5), rgba(239,68,68,0.2))',
    }}
  >
    <div style={{
      background: 'rgba(11,15,26,0.9)',
      backdropFilter: 'blur(30px)',
      borderRadius: 19,
      padding: '2rem',
      textAlign: 'center',
    }}>
      <XCircle size={44} color="#ef4444" style={{ margin: '0 auto 1rem', display: 'block' }} />
      <h3 style={{ margin: '0 0 0.4rem', fontWeight: 800, color: '#f8fafc' }}>Face Not Recognized</h3>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
        Please ensure good lighting and face the camera directly.
      </p>
      <button onClick={onRetry} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
        <RefreshCw size={15} /> Try Again
      </button>
    </div>
  </motion.div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const FaceRecognitionTab = () => {
  const { employees: localEmployees, addRecord } = useStore();

  // ── Registration States ──────────────────────────────────────────────────────
  const [regStep, setRegStep] = useState(0);              // 0=form, 1-3=capture steps
  const [regName, setRegName] = useState('');             // Employee name being registered
  const [regImages, setRegImages] = useState([]);         // Captured images
  const [regLoading, setRegLoading] = useState(false);    // Registration in progress
  const [regError, setRegError] = useState('');           // Registration error

  // ── Attendance States ────────────────────────────────────────────────────────
  const [scanStatus, setScanStatus] = useState('idle');   // idle | scanning | success | error
  const [greeting, setGreeting] = useState(null);         // { name, confidence, time, isReg }
  const [mode, setMode] = useState('attendance');         // 'attendance' | 'registration'
  const [backendOnline, setBackendOnline] = useState(null); // null=checking, true, false
  const [encodings, setEncodings] = useState([]);         // [{employeeId, encoding}]
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [lastError, setLastError] = useState('');
  const isProcessingRef = useRef(false);
  const resetTimerRef = useRef(null);
  const particleRandomsRef = useRef(null);  // Pre-generated random values for particles

  // ── Initialize backend ───────────────────────────────────────────────────────
  useEffect(() => {
    // Generate random values for particles once on mount
    if (!particleRandomsRef.current) {
      particleRandomsRef.current = [...Array(6)].map(() => ({
        x: (Math.random() - 0.5) * 120,
        y: (Math.random() - 0.5) * 120,
      }));
    }

    let mounted = true;
    const init = async () => {
      const health = await checkBackendHealth();
      if (!mounted) return;
      setBackendOnline(health.status === 'ok');

      if (health.status === 'ok') {
        const encs = await fetchAllEmployeeEncodings();
        if (!mounted) return;
        setEncodings(encs);
        setTotalEmployees(encs.length);
        if (mode === 'attendance') setScanStatus('scanning');
      }
    };
    init();
    return () => { mounted = false; clearTimeout(resetTimerRef.current); };
  }, [mode]);

  // ── Registration: Handle form submission ──────────────────────────────────
  const handleRegistrationSubmit = (name) => {
    setRegName(name);
    setRegStep(1);
    setRegImages([]);
    setRegError('');
  };

  // ── Registration: Handle image capture ────────────────────────────────────
  const handleRegistrationCapture = (base64Image) => {
    if (regStep < 1 || regStep > 3) return;

    const newImages = [...regImages, base64Image];
    setRegImages(newImages);

    if (regStep === 3) {
      // All 3 images captured, send to backend
      submitRegistration(newImages);
    } else {
      // Move to next step
      setRegStep(regStep + 1);
    }
  };

  // ── Registration: Submit to backend ──────────────────────────────────────
  const submitRegistration = async (images) => {
    setRegLoading(true);
    setRegError('');

    try {
      const employeeId = `emp-${Date.now()}`;
      const result = await registerFace(images, employeeId, regName);

      if (result.success) {
        // Show success message
        setGreeting({
          name: regName,
          confidence: 1.0,
          time: format(new Date(), 'HH:mm'),
          isReg: true,
        });

        // Reset registration form after 3 seconds
        setTimeout(() => {
          setRegStep(0);
          setRegName('');
          setRegImages([]);
          setRegError('');
          setGreeting(null);
          setMode('attendance');
          handleReloadEncodings();
        }, 3000);
      }
    } catch (err) {
      console.error('[Registration Error]', err);
      setRegError(err.message || 'Registration failed. Please try again.');
      setRegStep(0);
      setRegImages([]);
    } finally {
      setRegLoading(false);
    }
  };

  // ── Attendance: Handle auto-capture ──────────────────────────────────────
  const handleCapture = useCallback(async (base64Image) => {
    if (isProcessingRef.current || scanStatus !== 'scanning') return;

    // Increment scan count regardless of encodings
    setScanCount(c => c + 1);

    // Only process if we have registered faces
    if (encodings.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;

    try {
      const result = await recognizeFace(base64Image, encodings);

      if (result.matched && result.employeeId) {
        setScanStatus('success');

        let empName = 'Employee';
        const fireEmp = await getEmployeeById(result.employeeId);
        if (fireEmp?.name) {
          empName = fireEmp.name;
        } else {
          const localEmp = localEmployees.find(e => e.id === result.employeeId);
          if (localEmp) empName = localEmp.name;
        }

        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const timeStr = format(now, 'HH:mm');

        setGreeting({ name: empName, confidence: result.confidence, time: timeStr, isReg: false });

        addRecord({
          id: `${result.employeeId}-${todayStr}`,
          empId: result.employeeId,
          date: todayStr,
          inTime: timeStr,
          outTime: '',
          source: 'face-recognition',
        });

        markAttendanceFirestore(result.employeeId, todayStr, timeStr).catch(console.warn);

        resetTimerRef.current = setTimeout(() => {
          setGreeting(null);
          setScanStatus('scanning');
          isProcessingRef.current = false;
        }, RESET_DELAY_MS);
      } else {
        setTimeout(() => { isProcessingRef.current = false; }, SCAN_COOLDOWN_MS);
      }
    } catch (err) {
      console.error('[FaceRecognitionTab] recognition error:', err);
      setLastError(err.message || 'Network error');
      isProcessingRef.current = false;
    }
  }, [scanStatus, encodings, localEmployees, addRecord]);

  const handleReloadEncodings = async () => {
    const encs = await fetchAllEmployeeEncodings();
    setEncodings(encs);
    setTotalEmployees(encs.length);
    setScanStatus('scanning');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1000, margin: '0 auto' }}>

      {/* ══ HEADER ══ */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '1.5rem' }}>
              Face{' '}
              <span style={{
                background: 'linear-gradient(135deg, #D4AF37, #F5D070)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Recognition
              </span>{' '}
              Kiosk
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
              {mode === 'registration' ? 'Enroll new employees with face capture' : 'Automated 1:N face identification · Attendance auto-marked on recognition'}
            </p>
          </div>

          {/* Mode switcher */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setMode('attendance'); handleReloadEncodings(); }}
              style={{
                padding: '0.5rem 1rem',
                background: mode === 'attendance' ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Scan size={15} /> Attendance
            </button>
            <button
              onClick={() => setMode('registration')}
              style={{
                padding: '0.5rem 1rem',
                background: mode === 'registration' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plus size={15} /> Register
            </button>
          </div>
        </div>
      </motion.div>

      {/* ══ MAIN CONTENT ══ */}
      <AnimatePresence mode="wait">
        {mode === 'registration' ? (
          <motion.div key="registration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {greeting ? (
              <GreetingCard {...greeting} particleRandoms={particleRandomsRef.current} />
            ) : regStep === 0 ? (
              <RegistrationForm onSubmit={handleRegistrationSubmit} loading={regLoading} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CaptureStepper currentStep={regStep - 1} angles={ANGLES} />
                <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ margin: 0, color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>
                    📸 Step {regStep}/3: <span style={{ color: '#D4AF37' }}>{ANGLES[regStep - 1]}</span>
                  </p>
                  <FaceScanner
                    mode="register"
                    onCapture={handleRegistrationCapture}
                    status="scanning"
                  />
                  {regError && (
                    <p style={{ margin: '1rem 0 0', color: '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>{regError}</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {greeting ? (
              <GreetingCard {...greeting} particleRandoms={particleRandomsRef.current} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Webcam */}
                <FaceScanner
                  mode="attendance"
                  onCapture={handleCapture}
                  status={scanStatus}
                />

                {/* Session Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
                    borderRadius: 16,
                    padding: '1.25rem',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Scans Taken</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#D4AF37' }}>{scanCount}</p>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
                    borderRadius: 16,
                    padding: '1.25rem',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Registered Faces</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{totalEmployees}</p>
                  </div>
                  <div style={{
                    background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    borderRadius: 16,
                    padding: '1.25rem',
                    border: backendOnline ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Backend Status</p>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: backendOnline ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {backendOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                      {backendOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Error message */}
                {lastError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      borderRadius: 12,
                      padding: '1rem',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#fca5a5',
                      fontSize: '0.9rem',
                    }}
                  >
                    {lastError}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FaceRecognitionTab;
