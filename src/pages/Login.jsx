/**
 * Login.jsx — Premium glassmorphic admin login page.
 * Replaces the previous hardcoded-credentials version.
 *
 * Features:
 *  - Firebase Auth (email/password + Google)
 *  - Role-based redirect via Firestore users/{uid}.role
 *  - Inline validation, loading spinner, shake on error
 *  - "Remember me" persisted in localStorage
 *  - react-hot-toast for notifications
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from '../services/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  getAuth,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '../services/firebase';
import useStore from '../store/useAppStore';

const db  = getFirestore(app);
const gProvider = new GoogleAuthProvider();

/** Map Firebase error codes to human-friendly messages */
const friendlyError = (code) => {
  const map = {
    'auth/user-not-found':     'No account found with this email.',
    'auth/wrong-password':     'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests':  'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  };
  return map[code] || 'Something went wrong. Please try again.';
};

const REMEMBER_KEY = 'nexuspay_remember_email';

const Login = () => {
  const navigate  = useNavigate();
  const { login } = useStore();

  const [email,       setEmail]       = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [remember,    setRemember]    = useState(!!localStorage.getItem(REMEMBER_KEY));
  const [submitting,  setSubmitting]  = useState(false);
  const [shake,       setShake]       = useState(false);
  const [errors,      setErrors]      = useState({});

  const [isSignUp,    setIsSignUp]    = useState(false);

  /** Validate fields; returns true when clean */
  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (password.length < 6)                         e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** After a successful Firebase sign-in, fetch the role from Firestore */
  const handleRoleRedirect = async (firebaseUser, createdAsAdmin = false) => {
    let role = 'employee';
    if (createdAsAdmin) {
       role = 'admin';
    } else {
       const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
       if (snap.exists()) role = snap.data().role;
    }

    // Sync to local Zustand store so existing UI picks up the user
    login({
      id:    firebaseUser.uid,
      name:  firebaseUser.displayName || firebaseUser.email.split('@')[0],
      email: firebaseUser.email,
      role,
    });

    toast.success(createdAsAdmin ? 'Account Created!' : 'Welcome back!', { icon: createdAsAdmin ? '🎉' : '👋' });
    navigate(role === 'admin' ? '/admin-dashboard' : '/employee-dashboard');
  };

  /** Trigger shake + error toast on auth failure */
  const handleAuthError = (err) => {
    let msg = friendlyError(err.code);
    if (err.code === 'auth/email-already-in-use') msg = 'An account already exists with this email.';
    setErrors({ form: msg });
    toast.error(msg, { duration: 4000 });
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;
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

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { background: '#0d1424', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' } }} />

      <div className="login-bg">
        {/* Animated gradient orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        <motion.div
          className={`login-card ${shake ? 'shake' : ''}`}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo + Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <motion.div className="login-logo-ring"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}>
              <span style={{ fontSize: '2rem' }}>🧠</span>
            </motion.div>
            <h1 style={{ margin: '1rem 0 0.3rem', fontSize: '1.7rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
              Face Recognition System
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.83rem' }}>Sign in to access the HR platform</p>
          </div>

          {/* Global form error */}
          <AnimatePresence>
            {errors.form && (
              <motion.div className="login-error-banner"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                ⚠️ {errors.form}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email / Password form */}
          <form onSubmit={handleEmailLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            {/* Email */}
            <div>
              <label className="login-label">Email</label>
              <div className="login-input-wrap">
                <FiMail className="login-input-icon" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className={`login-input ${errors.email ? 'error' : ''}`}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })); }}
                  disabled={submitting}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="login-field-error">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <FiLock className="login-input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`login-input ${errors.password ? 'error' : ''}`}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })); }}
                  disabled={submitting}
                  autoComplete="current-password"
                />
                <button type="button" className="login-pw-toggle" tabIndex={-1} onClick={() => setShowPw(v => !v)}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <p className="login-field-error">{errors.password}</p>}
            </div>

            {/* Remember me + Forgot password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#94a3b8', userSelect: 'none' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: 15, height: 15 }} />
                Remember me
              </label>
              <button type="button" className="login-link" onClick={() => toast('Coming soon!', { icon: '🔧' })}>
                Forgot password?
              </button>
            </div>

            {/* Submit button */}
            <motion.button type="submit" className="login-submit-btn" disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: submitting ? 1 : 0.98 }}>
              {submitting
                ? <div className="login-spinner" />
                : (isSignUp ? 'Create Admin Account' : 'Sign In')}
            </motion.button>
          </form>

          {/* Toggle Sign Up */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#94a3b8' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setIsSignUp(!isSignUp); setErrors({}); }} className="login-link">
              {isSignUp ? 'Sign In' : 'Create Admin Account'}
            </button>
          </div>

          {/* Divider */}
          <div className="login-divider"><span>OR</span></div>

          {/* Google button */}
          <button className="login-google-btn" onClick={handleGoogleLogin} disabled={submitting}>
            <FcGoogle size={20} />
            Continue with Google
          </button>
        </motion.div>
      </div>
    </>
  );
};

export default Login;
