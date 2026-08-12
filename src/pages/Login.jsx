/**
 * Login.jsx — Clean Enterprise SaaS Login Page for AttendX.
 * Standardized Firebase Authentication & Firestore User Role Lookup.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUserCheck, FiKey, FiUser } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from '../services/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '../services/firebase';
import useStore from '../store/useAppStore';

const db = getFirestore(app);
const gProvider = new GoogleAuthProvider();

const friendlyError = (code) => {
  const map = {
    'auth/user-not-found':     'No account found with this email.',
    'auth/wrong-password':     'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests':  'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  };
  return map[code] || 'Authentication failed. Please check your credentials.';
};

const REMEMBER_KEY = 'attendx_remember_email';

const Login = () => {
  const navigate  = useNavigate();
  const { login } = useStore();

  const [email,       setEmail]       = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [remember,    setRemember]    = useState(!!localStorage.getItem(REMEMBER_KEY));
  const [submitting,  setSubmitting]  = useState(false);
  const [shake,       setShake]       = useState(false);
  const [isSignUp,    setIsSignUp]    = useState(false);
  const [loginMode,   setLoginMode]   = useState('email'); // 'email' | 'employeeId'
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [employeeNameInput, setEmployeeNameInput] = useState('');

  const validateEmailForm = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleRoleRedirect = async (firebaseUser, createdAsAdmin = false) => {
    let role = 'employee';
    let employeeId = null;

    if (createdAsAdmin) {
       role = 'admin';
    } else {
       const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
       if (snap.exists()) {
         const data = snap.data();
         role = data.role || 'employee';
         employeeId = data.employeeId || null;
       }
    }

    login({
      id:         firebaseUser.uid,
      employeeId: employeeId || firebaseUser.uid,
      name:       firebaseUser.displayName || firebaseUser.email.split('@')[0],
      email:      firebaseUser.email,
      role,
    });

    toast.success(createdAsAdmin ? 'Account Created!' : `Welcome back! (${role.toUpperCase()})`, { icon: '👋' });
    navigate(role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
  };

  const handleAuthError = (err) => {
    let msg = friendlyError(err.code);
    if (err.code === 'auth/email-already-in-use') msg = 'An account already exists with this email.';
    toast.error(msg, { duration: 4000 });
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!validateEmailForm()) return;
    setSubmitting(true);
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email);
      else          localStorage.removeItem(REMEMBER_KEY);

      if (isSignUp) {
         const { user } = await createUserWithEmailAndPassword(auth, email, password);
         await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: 'admin',
            createdAt: serverTimestamp()
         });
         await handleRoleRedirect(user, true);
      } else {
         const { user } = await signInWithEmailAndPassword(auth, email, password);
         await handleRoleRedirect(user);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeIdLogin = async (e) => {
    e.preventDefault();
    if (!employeeIdInput.trim() || !employeeNameInput.trim()) {
      toast.error('Please enter both Employee ID and Employee Name.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    setSubmitting(true);
    try {
      const docSnap = await getDoc(doc(db, 'employeeFaces', employeeIdInput.trim()));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.name.trim().toLowerCase() === employeeNameInput.trim().toLowerCase()) {
          login({
            id: employeeIdInput.trim(),
            employeeId: employeeIdInput.trim(),
            name: data.name,
            email: `${employeeIdInput.trim()}@attendx.local`,
            role: 'employee',
          });
          toast.success(`Welcome back, ${data.name}! 👋`);
          navigate('/employee/dashboard');
        } else {
          toast.error("Employee Name does not match this Employee ID.");
          setShake(true);
          setTimeout(() => setShake(false), 600);
        }
      } else {
        toast.error("Employee ID not found in directory. Please contact your admin.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      console.error(err);
      toast.error("Database lookup failed. Please check network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      const { user } = await signInWithPopup(auth, gProvider);
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
             email: user.email,
             role: 'admin',
             createdAt: serverTimestamp()
          });
          await handleRoleRedirect(user, true);
      } else {
          await handleRoleRedirect(user);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const loginAsDemoAdmin = () => {
    login({
      id: 'demo-admin-id',
      name: 'Admin User',
      email: 'admin@attendx.com',
      role: 'admin',
    });
    toast.success('Logged in as Admin 🛡️');
    navigate('/admin/dashboard');
  };

  const loginAsDemoEmployee = () => {
    login({
      id: 'demo-emp-id',
      employeeId: 'EMP001',
      name: 'Sarah Connor',
      email: 'sarah@attendx.com',
      role: 'employee',
    });
    toast.success('Logged in as Employee 👤');
    navigate('/employee/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#040711', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#080d1a', color: '#f8fafc', border: '1px solid rgba(56,189,248,0.2)' } }} />

      {/* Subtle Background Glows */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      {/* Main Centered Enterprise Login Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <motion.div animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.5 }}
          className="login-card" style={{ maxWidth: 440, width: '100%' }}>

          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div className="login-logo-ring" style={{ marginBottom: '1rem' }}>
              <img src="/logo.png" alt="AttendX Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              Welcome to <span className="text-gradient">AttendX</span>
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.35rem 0 0' }}>
              Enterprise Workforce & Biometric Management Portal
            </p>
          </div>

          {/* Auth Method Selector */}
          <div style={{ display: 'flex', background: 'rgba(4,8,20,0.8)', padding: '0.3rem', borderRadius: 14, border: '1px solid rgba(56,189,248,0.15)', marginBottom: '1.5rem' }}>
            <button type="button" className={`login-tab-btn ${loginMode === 'email' ? 'active' : ''}`} onClick={() => setLoginMode('email')}>
              <FiMail style={{ verticalAlign: 'middle', marginRight: 6 }} /> Email Auth
            </button>
            <button type="button" className={`login-tab-btn ${loginMode === 'employeeId' ? 'active' : ''}`} onClick={() => setLoginMode('employeeId')}>
              <FiUserCheck style={{ verticalAlign: 'middle', marginRight: 6 }} /> Employee ID
            </button>
          </div>

          {/* Email / Firebase Auth Form */}
          {loginMode === 'email' ? (
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="login-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <FiMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="login-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input type={showPw ? 'text' : 'password'} className="input-field" style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                    {showPw ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me
                </label>
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }}>
                  {isSignUp ? 'Back to Sign In' : 'Create Admin Account'}
                </button>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={submitting} type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
                {submitting ? 'Authenticating…' : isSignUp ? 'Create Admin Account →' : 'Sign In to Portal →'}
              </motion.button>
              <button type="button" onClick={handleGoogleLogin} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <FcGoogle size={18} /> Sign in with Google
              </button>
            </form>
          ) : (
            /* Employee ID Direct Portal Lookup */
            <form onSubmit={handleEmployeeIdLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="login-label">Employee ID</label>
                <div style={{ position: 'relative' }}>
                  <FiKey style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="e.g. EMP001" value={employeeIdInput} onChange={e => setEmployeeIdInput(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="login-label">Employee Name</label>
                <div style={{ position: 'relative' }}>
                  <FiUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input className="input-field" style={{ paddingLeft: '2.5rem' }} placeholder="e.g. Sarah Connor" value={employeeNameInput} onChange={e => setEmployeeNameInput(e.target.value)} />
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={submitting} type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {submitting ? 'Authenticating…' : 'Access Employee Workspace →'}
              </motion.button>
            </form>
          )}

          {/* Quick Demo Access Bar */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={loginAsDemoAdmin} style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', borderRadius: 10, padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              🛡️ Demo Admin
            </button>
            <button onClick={loginAsDemoEmployee} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 10, padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              👤 Demo Employee
            </button>
          </div>

        </motion.div>
      </motion.div>

      {/* Enterprise Footer */}
      <footer style={{ marginTop: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
        <p style={{ margin: 0 }}>AttendX Enterprise Workforce System © 2026. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
