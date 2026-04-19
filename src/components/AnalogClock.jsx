import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * AnalogClock Display Component
 * A premium, glassmorphic analog clock with gold accents.
 * 
 * @param {Date} date - The date/time to display. If not provided, it ticks live.
 * @param {number} size - The diameter of the clock.
 * @param {string} color - The accent color for markers/hands (default: Gold).
 */
const AnalogClock = ({ date, size = 200, color = "#D4AF37" }) => {
  const [now, setNow] = useState(date || new Date());

  useEffect(() => {
    if (date) {
      setNow(date);
    } else {
      const t = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(t);
    }
  }, [date]);

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const hDeg = (h % 12) * 30 + m * 0.5;
  const mDeg = m * 6 + s * 0.1;
  const sDeg = s * 6;

  const center = size / 2;

  return (
    <div style={{ 
      width: size, 
      height: size, 
      position: 'relative', 
      borderRadius: '50%', 
      background: 'rgba(15,23,42,0.4)',
      boxShadow: `0 20px 50px rgba(0,0,0,0.3), inset 0 0 40px rgba(0,0,0,0.5)`,
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Dynamic Glow */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at center, ${color}10 0%, transparent 70%)`, filter: 'blur(20px)' }} />

      {/* Surface Grain */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', opacity: 0.03, background: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />

      {/* Dial Markers */}
      {[...Array(12)].map((_, i) => {
        const deg = i * 30;
        const isMajor = i % 3 === 0;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: isMajor ? 3 : 1,
            height: isMajor ? 12 : 6,
            background: isMajor ? color : 'rgba(148,163,184,0.4)',
            top: 10,
            left: '50%',
            transformOrigin: `0 ${center - 10}px`,
            transform: `translateX(-50%) rotate(${deg}deg)`,
            borderRadius: 99,
            boxShadow: isMajor ? `0 0 8px ${color}60` : 'none'
          }} />
        );
      })}

      {/* Hands Container */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        
        {/* Hour Hand */}
        <motion.div 
          animate={{ rotate: hDeg }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          style={{
            position: 'absolute',
            width: 5,
            height: size * 0.25,
            background: `linear-gradient(to top, ${color}, #fff)`,
            borderRadius: 99,
            bottom: '50%',
            left: '50%',
            transformOrigin: 'bottom',
            translateX: '-50%',
            zIndex: 3,
            boxShadow: `0 0 10px rgba(0,0,0,0.5)`
          }}
        />

        {/* Minute Hand */}
        <motion.div 
          animate={{ rotate: mDeg }}
          transition={{ type: 'spring', stiffness: 50, damping: 25 }}
          style={{
            position: 'absolute',
            width: 3,
            height: size * 0.35,
            background: '#f8fafc',
            borderRadius: 99,
            bottom: '50%',
            left: '50%',
            transformOrigin: 'bottom',
            translateX: '-50%',
            zIndex: 4,
            boxShadow: `0 0 10px rgba(0,0,0,0.5)`
          }}
        />

        {/* Second Hand */}
        <motion.div 
          animate={{ rotate: sDeg }}
          transition={{ type: 'tween', ease: 'linear', duration: date ? 0.3 : 1 }}
          style={{
            position: 'absolute',
            width: 1.5,
            height: size * 0.42,
            background: '#f43f5e',
            borderRadius: 99,
            bottom: '50%',
            left: '50%',
            transformOrigin: 'bottom',
            translateX: '-50%',
            zIndex: 5,
            boxShadow: '0 0 8px rgba(244,63,94,0.4)'
          }}
        >
          {/* Tail */}
          <div style={{ position: 'absolute', bottom: -12, left: '50%', width: 1.5, height: 12, background: '#f43f5e', transform: 'translateX(-50%)' }} />
        </motion.div>

        {/* Center Nut */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#0f172a',
          border: `2px solid ${color}`,
          transform: 'translate(-50%,-50%)',
          zIndex: 10,
          boxShadow: `0 4px 10px rgba(0,0,0,0.8)`
        }} />
      </div>

      {/* Decorative Brand Text */}
      <div style={{ 
        position: 'absolute', 
        top: '65%', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        fontSize: '0.5rem', 
        fontWeight: 900, 
        color: color, 
        textTransform: 'uppercase', 
        letterSpacing: '0.2em', 
        opacity: 0.5 
      }}>
        AttendX
      </div>
    </div>
  );
};

export default AnalogClock;
