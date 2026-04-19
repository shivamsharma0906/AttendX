/**
 * FaceScanner.jsx — Reusable webcam component with animated scan overlay.
 *
 * Props:
 *   mode        "register" | "attendance"
 *   onCapture   (base64: string) => void   Called every auto-capture tick
 *   onSuccess   () => void                 Called when parent signals success
 *   onError     () => void                 Called when parent signals error
 *   status      "idle" | "scanning" | "success" | "error"   Controlled from parent
 */

import React, { useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';

const CAPTURE_INTERVAL_MS = 2500;

const MESSAGES = {
  idle: { text: 'Position your face in the frame', emoji: '👤' },
  scanning: { text: 'Scanning…', emoji: '🔍' },
  success: { text: 'Face Recognized ✅', emoji: '✅' },
  error: { text: 'Not Recognized ❌', emoji: '❌' },
};

const STATUS_COLORS = {
  idle: '#6366f1',
  scanning: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
};

/**
 * FaceScanner component — renders a webcam feed inside a styled rounded card
 * with an animated CSS scan overlay ring and status messages.
 */
const FaceScanner = ({ mode = 'attendance', onCapture, status = 'idle', onError }) => {
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);

  /** Capture one frame and hand it up to the parent */
  const capture = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot && onCapture) onCapture(screenshot);
  }, [onCapture]);

  /** Start/stop the auto-capture interval based on status */
  useEffect(() => {
    if ((mode === 'attendance' || mode === 'register') && status === 'scanning') {
      intervalRef.current = setInterval(capture, CAPTURE_INTERVAL_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [status, capture, mode]);

  const ringColor = STATUS_COLORS[status] || STATUS_COLORS.idle;
  const message = MESSAGES[status] || MESSAGES.idle;

  return (
    <div className="face-scanner-wrap">
      {/* Webcam feed */}
      <div className="face-scanner-viewport" style={{ '--ring-color': ringColor }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user', width: 480, height: 360 }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '1rem', display: 'block' }}
          mirrored
        />

        {/* Scan ring overlay — CSS-only animation */}
        <div className={`scan-ring ${status === 'scanning' ? 'scanning' : ''}`} />

        {/* Corner guides */}
        {['tl', 'tr', 'bl', 'br'].map(pos => (
          <div key={pos} className={`corner-guide corner-${pos}`} style={{ borderColor: ringColor }} />
        ))}

        {/* Status overlay badge */}
        <div className="scanner-badge" style={{ background: ringColor + '22', borderColor: ringColor + '55', color: ringColor }}>
          {status === 'scanning' && <div className="scan-spinner" />}
          <span>{message.text}</span>
        </div>
      </div>

      {/* Mode label */}
      <p style={{ textAlign: 'center', margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {mode === 'register' ? '📸 Registration Mode' : '🔐 Attendance Mode'}
      </p>

      {/* Manual capture button for Registration Mode */}
      {mode === 'register' && status === 'idle' && (
        <button type="button" onClick={capture}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.9rem auto 0', padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)', fontFamily: 'inherit', transition: 'transform 0.1s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          📸 Capture Photo
        </button>
      )}

      {/* Retry button on error */}
      {status === 'error' && onError && (
        <button onClick={onError}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', margin: '0.75rem auto 0', fontSize: '0.82rem', fontWeight: 600, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
};

export default FaceScanner;
