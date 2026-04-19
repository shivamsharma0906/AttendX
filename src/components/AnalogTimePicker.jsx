import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AnalogTimePicker Component
 * An interactive analog clock for picking time (Hours/Minutes).
 * 
 * @param {string} value - Current time string "HH:MM"
 * @param {Function} onChange - Callback with new "HH:MM"
 * @param {string} color - Accent color (default: Gold)
 */
const AnalogTimePicker = ({ value, onChange, color = "#D4AF37", size = 200 }) => {
  const [mode, setMode] = useState('hour'); // 'hour' | 'minute'
  
  // Parse initial value
  const [hStr, mStr] = (value || "09:00").split(':');
  let h = parseInt(hStr);
  let m = parseInt(mStr);
  
  const isPM = h >= 12;
  const displayH = h % 12 || 12;

  const handleSetTime = (val) => {
    let finalH = h;
    let finalM = m;

    if (mode === 'hour') {
      const selectedH = val === 12 ? 0 : val;
      finalH = isPM ? selectedH + 12 : selectedH;
      setMode('minute');
    } else {
      finalM = val;
    }

    const fmt = (n) => String(n).padStart(2, '0');
    onChange(`${fmt(finalH)}:${fmt(finalM)}`);
  };

  const toggleAMPM = () => {
    let newH = isPM ? h - 12 : h + 12;
    const fmt = (n) => String(n).padStart(2, '0');
    onChange(`${fmt(newH)}:${fmt(m)}`);
  };

  const center = size / 2;
  const numSize = size * 0.15;
  const dialRadius = center - (size * 0.13);
  const fontSize = size * 0.08;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', userSelect: 'none' }}>
      
      {/* Clock Head (Digital Preview & Toggle) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.4)', padding: `${size * 0.03}rem ${size * 0.05}rem`, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'baseline' }}>
          <span 
            onClick={() => setMode('hour')}
            style={{ fontSize: `${size * 0.008}rem`, fontSize: '1.5rem', fontWeight: 900, color: mode === 'hour' ? color : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}>
            {String(displayH).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#475569' }}>:</span>
          <span 
            onClick={() => setMode('minute')}
            style={{ fontSize: '1.5rem', fontWeight: 900, color: mode === 'minute' ? color : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}>
            {String(m).padStart(2, '0')}
          </span>
        </div>
        <div 
          onClick={toggleAMPM}
          style={{ width: size * 0.15, height: size * 0.15, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: color, cursor: 'pointer', border: `1px solid ${color}30`, transition: 'all 0.3s' }}>
          {isPM ? 'PM' : 'AM'}
        </div>
      </div>

      {/* Analog Face */}
      <div style={{ 
        width: size, 
        height: size, 
        position: 'relative', 
        borderRadius: '50%', 
        background: 'rgba(15,23,42,0.5)', 
        border: `1px solid ${color}30`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)`
      }}>
        
        {/* Selection Glow */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at center, ${color}05 0%, transparent 70%)` }} />

        {/* Center Point */}
        <div style={{ position: 'absolute', width: 8, height: 8, background: color, borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, boxShadow: `0 0 10px ${color}` }} />

        {/* Hands */}
        <motion.div 
          animate={{ rotate: mode === 'hour' ? (h % 12) * 30 : m * 6 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            position: 'absolute',
            width: 3,
            height: mode === 'hour' ? '30%' : '40%',
            background: `linear-gradient(to top, ${color}, ${color}55)`,
            borderRadius: 99,
            bottom: '50%',
            left: '50%',
            transformOrigin: 'bottom',
            translateX: '-50%',
            zIndex: 5,
            pointerEvents: 'none'
          }}>
          <div style={{ position: 'absolute', top: -5, left: '50%', width: 12, height: 12, borderRadius: '50%', background: color, transform: 'translateX(-50%)', border: '3px solid #0f172a' }} />
        </motion.div>

        {/* Numbers/Dots Ring */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={mode}
            initial={{ opacity: 0, scale: 0.9, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.1, rotate: 30 }}
            style={{ position: 'absolute', inset: 0 }}>
            {[...Array(12)].map((_, i) => {
              const val = mode === 'hour' ? (i === 0 ? 12 : i) : i * 5;
              const angle = (i * 30) * (Math.PI / 180);
              const x = center + dialRadius * Math.sin(angle);
              const y = center - dialRadius * Math.cos(angle);
              
              const isSelected = mode === 'hour' ? (h % 12 === i % 12) : (m === (i * 5) % 60);

              return (
                <div 
                  key={i}
                  onClick={() => handleSetTime(val)}
                  style={{
                    position: 'absolute',
                    width: numSize,
                    height: numSize,
                    top: y,
                    left: x,
                    transform: 'translate(-50%,-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: fontSize,
                    fontWeight: 900,
                    color: isSelected ? '#000' : '#94a3b8',
                    background: isSelected ? color : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: 15,
                    border: isSelected ? 'none' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => { if(!isSelected) e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { if(!isSelected) e.target.style.background = 'transparent'; }}
                >
                  {val}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Minute dots for high precision */}
        {mode === 'minute' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {[...Array(60)].map((_, i) => {
              if (i % 5 === 0) return null;
              const angle = (i * 6) * (Math.PI / 180);
              const x = center + dialRadius * Math.sin(angle);
              const y = center - dialRadius * Math.cos(angle);
              return (
                <div 
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 4,
                    height: 4,
                    top: y,
                    left: x,
                    transform: 'translate(-50%,-50%)',
                    borderRadius: '50%',
                    background: m === i ? color : 'rgba(255,255,255,0.1)',
                    boxShadow: m === i ? `0 0 5px ${color}` : 'none'
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Select {mode} · Click center to toggle AM/PM
      </p>
    </div>
  );
};

export default AnalogTimePicker;
