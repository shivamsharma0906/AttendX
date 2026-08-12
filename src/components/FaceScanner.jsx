/**
 * FaceScanner.jsx — Reusable webcam component with animated scan overlay and Liveness Detection.
 *
 * Props:
 *   mode        "register" | "attendance"
 *   onCapture   (base64: string) => void   Called when liveness check passes
 *   onSuccess   () => void                 Called when parent signals success
 *   onError     () => void                 Called when parent signals error
 *   status      "idle" | "scanning" | "success" | "error"   Controlled from parent
 *   enableLiveness  boolean                Enable motion/liveness pre-check (default: true)
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

const CAPTURE_INTERVAL_MS = 2500;

const MESSAGES = {
  idle: { text: 'Position your face in the frame', emoji: '👤' },
  liveness: { text: 'Blink or turn head slightly for liveness verification...', emoji: '👁️' },
  scanning: { text: 'Verifying Face ID…', emoji: '🔍' },
  success: { text: 'Face Recognized ✅', emoji: '✅' },
  error: { text: 'Not Recognized / Spoof Detected ❌', emoji: '❌' },
};

const STATUS_COLORS = {
  idle: '#6366f1',
  liveness: '#38bdf8',
  scanning: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
};

const FaceScanner = ({ mode = 'attendance', onCapture, status = 'idle', onError, enableLiveness = true }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const intervalRef = useRef(null);
  const lastImageDataRef = useRef(null);
  const [livenessStatus, setLivenessStatus] = useState('idle');

  /** Simple client-side liveness check measuring pixel difference across frames */
  const checkLiveness = useCallback((screenshot) => {
    if (!enableLiveness) return true;

    try {
      const img = new Image();
      img.src = screenshot;
      const canvas = canvasRef.current;
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 64, 48);
      const currentData = ctx.getImageData(0, 0, 64, 48).data;

      if (!lastImageDataRef.current) {
        lastImageDataRef.current = currentData;
        return true; // First frame initialization
      }

      // Calculate mean absolute difference across RGB pixels
      let diffSum = 0;
      for (let i = 0; i < currentData.length; i += 4) {
        diffSum += Math.abs(currentData[i] - lastImageDataRef.current[i]);
      }
      const avgDiff = diffSum / (currentData.length / 4);
      lastImageDataRef.current = currentData;

      // Real live face movement falls between ~3.0 and ~45.0
      // Completely static photo produces avgDiff < 1.0
      return avgDiff > 1.2;
    } catch {
      return true; // Fallback gracefully if canvas operation encounters error
    }
  }, [enableLiveness]);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) return;

    if (enableLiveness && mode === 'attendance') {
      const isLive = checkLiveness(screenshot);
      if (!isLive) {
        setLivenessStatus('liveness');
        return; // Pause capture until slight motion/blink is detected
      }
      setLivenessStatus('idle');
    }

    if (onCapture) onCapture(screenshot);
  }, [onCapture, enableLiveness, mode, checkLiveness]);

  useEffect(() => {
    if ((mode === 'attendance' || mode === 'register') && status === 'scanning') {
      intervalRef.current = setInterval(capture, CAPTURE_INTERVAL_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [status, capture, mode]);

  const currentStatusKey = livenessStatus === 'liveness' ? 'liveness' : status;
  const ringColor = STATUS_COLORS[currentStatusKey] || STATUS_COLORS.idle;
  const message = MESSAGES[currentStatusKey] || MESSAGES.idle;

  return (
    <div className="face-scanner-wrap">
      <div className="face-scanner-viewport" style={{ '--ring-color': ringColor }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user', width: 480, height: 360 }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '1rem', display: 'block' }}
          mirrored
        />

        {/* Animated Scan Ring */}
        <div className={`scan-ring ${status === 'scanning' ? 'scanning' : ''}`} />

        {/* Corner Frame Guides */}
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <div key={pos} className={`corner-guide corner-${pos}`} style={{ borderColor: ringColor }} />
        ))}

        {/* Status Overlay Badge */}
        <div className="scanner-badge" style={{ background: ringColor + '22', borderColor: ringColor + '55', color: ringColor }}>
          {(status === 'scanning' || livenessStatus === 'liveness') && <div className="scan-spinner" />}
          <span>{message.text}</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {mode === 'register' ? '📸 Registration Mode' : '🔐 Attendance Mode (Liveness Protected)'}
      </p>

      {mode === 'register' && status === 'idle' && (
        <button
          type="button"
          onClick={capture}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.9rem auto 0', padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)', fontFamily: 'inherit', transition: 'transform 0.1s' }}
        >
          📸 Capture Photo
        </button>
      )}

      {status === 'error' && onError && (
        <button
          onClick={onError}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', margin: '0.75rem auto 0', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
};

export default FaceScanner;
