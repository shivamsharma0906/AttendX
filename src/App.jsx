import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Scan, Users, BarChart2,
  Settings2, ClipboardList, Clock, Search, Plus, Trash2,
  CheckCircle2, ChevronLeft, ChevronRight, Menu, X, Award, History,
} from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { format } from 'date-fns';

import useStore from './store/useAppStore';
import { calcHours, calcFinalSalary, fmtHrs, STATUS_COLORS, getStatus } from './utils/calc';
import CalendarView from './calendar/CalendarView';
import OCRUpload from './ocr/OCRUpload';
import Reports from './reports/Reports';
import FaceRecognitionTab from './components/FaceRecognitionTab';
import AnalogClock from './components/AnalogClock';
import AnalogTimePicker from './components/AnalogTimePicker';

/* ─── Mock admin (no login required for admin view) ───── */
const ADMIN = { id: 'admin', name: 'Admin', role: 'admin' };

/* ═══════════════════════════════════════════════════════
   AMBIENT BACKGROUND
══════════════════════════════════════════════════════════ */
const AmbientBg = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {/* Deep navy base */}
    <div style={{ position: 'absolute', inset: 0, background: '#0B0F1A' }} />
    {/* Gold orb — top right */}
    <div style={{
      position: 'absolute', top: '-8%', right: '-5%', width: '45vw', height: '45vw', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
      animation: 'orb1 20s ease-in-out infinite alternate',
    }} />
    {/* Navy-purple orb — bottom left */}
    <div style={{
      position: 'absolute', bottom: '-12%', left: '-5%', width: '50vw', height: '50vw', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)',
      animation: 'orb2 25s ease-in-out infinite alternate',
    }} />
    {/* Subtle center glow */}
    <div style={{
      position: 'absolute', top: '35%', left: '30%', width: '40vw', height: '40vw', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%)',
    }} />
    <style>{`
      @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-3vw, 4vh) scale(1.07); } }
      @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(3vw, -4vh) scale(1.09); } }
    `}</style>
  </div>
);

/* ═══════════════════════════════════════════════════════
   SHARED UTILS
══════════════════════════════════════════════════════════ */

/* Circular progress ring */
const Ring = ({ pct, color, size = 64, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 5px ${color}99)` }} />
    </svg>
  );
};

/* Motivation quotes carousel */
const QUOTES = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"Success is not final, failure is not fatal: it is the courage to continue that counts."',
  '"Don\'t count the days, make the days count." — Muhammad Ali',
  '"Hard work beats talent when talent doesn\'t work hard." — Tim Notke',
  '"Your limitation—it\'s only your imagination."',
  '"Great things never come from comfort zones."',
  '"Dream big and dare to fail." — Norman Vaughan',
];
const QuoteCarousel = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="quote-container">
      <AnimatePresence mode="wait">
        <motion.p key={idx}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            margin: 0, color: '#D4AF37', fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 500,
            letterSpacing: '0.02em', textShadow: '0 0 16px rgba(212,175,55,0.35)', lineHeight: 1.4
          }}>
          {QUOTES[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   OVERVIEW TAB (INSANE LEVEL REDESIGN)
══════════════════════════════════════════════════════════ */
const Overview = () => {
  const { employees, records, settings, user } = useStore();
  const targetHrs = (settings?.workingDays || 26) * (settings?.hoursPerDay || 9);
  const monthStr = format(new Date(), 'yyyy-MM');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  const todayRecs = records.filter(r => r.date === todayStr);
  const monthRecs = records.filter(r => r.date.startsWith(monthStr));

  const payroll = employees.map(emp => {
    const recs = records.filter(r => r.empId === emp.id && r.date.startsWith(monthStr));
    const hrs = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
    const pct = targetHrs > 0 ? Math.min((hrs / targetHrs) * 100, 100) : 0;
    return { ...emp, days: recs.length, hrs, pct };
  }).sort((a, b) => b.hrs - a.hrs);

  const topPerformer = payroll[0];
  const avgHrsToday = todayRecs.length > 0 ? todayRecs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0) / todayRecs.length : 0;
  const onTimeToday = todayRecs.filter(r => { if (!r.inTime) return false; const [h, m] = r.inTime.split(':').map(Number); return h < 9 || (h === 9 && m <= (settings?.lateGraceMins || 15)); }).length;

  const kpis = [
    { icon: Users, label: 'Active Staff', value: employees.length, sub: 'Registered', color: '#8b5cf6', bg: 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.05))' },
    { icon: Clock, label: "Live Punches", value: todayRecs.length, sub: `${onTimeToday} On-Time`, color: '#34d399', bg: 'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(52,211,153,0.05))' },
    { icon: Calendar, label: 'Month Logs', value: monthRecs.length, sub: format(now, 'MMM'), color: '#06b6d4', bg: 'linear-gradient(135deg,rgba(6,182,212,0.2),rgba(6,182,212,0.05))' },
    { icon: BarChart2, label: 'Avg Hrs (Day)', value: avgHrsToday > 0 ? fmtHrs(avgHrsToday) : '—', sub: 'Per Emp', color: '#D4AF37', bg: 'linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))' },
  ];

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Stagger Animations */
  const containerVars = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 30, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  return (
    <motion.div variants={containerVars} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative' }}>

      {/* ── 1. The Holographic Hero Billboard ── */}
      <motion.div variants={itemVars} style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', padding: isMobile ? '1.5rem 1.25rem' : 'clamp(1.25rem, 3vw, 3rem) clamp(1rem, 2vw, 2rem)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 30px 60px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.02)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #090e17, #0B0F1A)', zIndex: 0 }} />
        {/* Animated Nebulas */}
        <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', top: '-50%', right: '-20%', width: '80%', height: '200%', background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0 }} />
        <motion.div animate={{ rotate: -360, scale: [1, 1.3, 1] }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', bottom: '-50%', left: '-10%', width: '70%', height: '150%', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 60%)', filter: 'blur(70px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', zIndex: 1 }} />

        <div style={{ 
          position: isMobile ? 'relative' : 'relative', 
          zIndex: 2, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'column', 
          gap: '1rem', 
          height: '100%',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '2.25rem' : 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff' }}>
              Welcome back, <br />
              <span style={{ background: 'linear-gradient(to right, #D4AF37, #F5D070, #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 10px 30px rgba(212,175,55,0.4)' }}>
                {user?.role === 'admin' ? 'Admin' : user?.name?.split(' ')[0] || 'Operator'}
              </span>
            </h1>
            <div style={{ marginTop: '0.5rem', opacity: 0.9 }}>
              <QuoteCarousel />
            </div>
          </div>

          <div style={{ 
            alignSelf: 'center',
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            alignItems: isMobile ? 'center' : 'flex-end',
            gap: isMobile ? '1.25rem' : '1rem',
            textAlign: isMobile ? 'left' : 'right',
            marginTop: isMobile ? '1.5rem' : '0'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
              <p style={{ margin: 0, fontSize: isMobile ? '0.7rem' : '0.85rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{format(now, 'EEEE')}</p>
              <p style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 900, color: '#f8fafc', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{format(now, 'MMMM do')}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
              <AnalogClock size={isMobile ? 80 : 120} />
            </div>
          </div>
        </div>
      </motion.div>


      {/* ── 2. Holographic KPI Modules ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '0.75rem' : '1.25rem' }}>
        {kpis.map((kpi, idx) => (
          <Tilt key={kpi.label} tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.03} transitionSpeed={1500} style={{ height: '100%' }}>
            <motion.div variants={itemVars} style={{ background: 'rgba(13,18,32,0.6)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: isMobile ? '1rem' : '1.5rem', border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden', height: '100%', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${kpi.color}, transparent)` }} />
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: kpi.color, opacity: 0.1, filter: 'blur(30px)', borderRadius: '50%' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.6rem' : '1rem', marginBottom: isMobile ? '0.75rem' : '1rem' }}>
                <div style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: isMobile ? 10 : 14, background: kpi.bg, border: `1px solid ${kpi.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 0 10px ${kpi.color}20, 0 5px 15px rgba(0,0,0,0.3)`, flexShrink: 0 }}>
                  <kpi.icon size={isMobile ? 18 : 22} color={kpi.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{kpi.sub}</p>
                  <p style={{ margin: 0, fontSize: isMobile ? '0.75rem' : '0.95rem', fontWeight: 700, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.label}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1, letterSpacing: '-0.03em', textShadow: `0 0 20px ${kpi.color}40` }}>{kpi.value}</h3>
              </div>
            </motion.div>
          </Tilt>
        ))}
      </div>


      {/* ── 3. Split Command View ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

        {/* VIP Top Performer Podium */}
        <motion.div variants={itemVars} style={{ background: 'linear-gradient(180deg, rgba(13,18,32,0.8) 0%, rgba(13,18,32,0.95) 100%)', backdropFilter: 'blur(24px)', borderRadius: 24, padding: isMobile ? '1.5rem' : '2rem', position: 'relative', overflow: 'hidden', border: '1px solid rgba(212,175,55,0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(212,175,55,0.05)' }}>
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 60%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1.5rem' : '2rem', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,175,55,0.3)' }}>
                <Award size={18} color="#D4AF37" />
              </div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1.1rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Operator of the Month</h3>
            </div>
          </div>

          {topPerformer ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{ position: 'relative', marginBottom: isMobile ? '1rem' : '1.5rem' }}>
                <Ring pct={topPerformer.pct} color="#D4AF37" size={isMobile ? 110 : 140} stroke={isMobile ? 6 : 8} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{Math.round(topPerformer.pct)}<span style={{ fontSize: '0.9rem', color: '#D4AF37' }}>%</span></span>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginTop: '0.1rem' }}>Target</span>
                </div>
              </div>

              <h2 style={{ margin: '0 0 0.25rem', fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 900, color: '#f8fafc', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{topPerformer.name}</h2>
              <p style={{ margin: 0, fontSize: isMobile ? '0.75rem' : '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>{fmtHrs(topPerformer.hrs)} Total Output · Active {topPerformer.days} Days</p>
            </div>
          ) : (
            <p style={{ color: '#475569', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>Awaiting initial telemetry data...</p>
          )}
        </motion.div>

      </div>

      {/* ── 4. Mainframe Leaderboard ── */}
      <motion.div variants={itemVars} style={{ background: 'linear-gradient(90deg, rgba(13,18,32,0.8), rgba(9,14,23,0.9))', backdropFilter: 'blur(20px)', borderRadius: 24, padding: isMobile ? '1.25rem' : '2rem', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isMobile ? '1.5rem' : '2rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <BarChart2 size={20} color="#f8fafc" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '1rem' : '1.2rem', color: '#f8fafc', letterSpacing: '0.05em' }}>Ranking Matrix</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Network efficiency for {format(now, 'MMM yyyy')}</p>
          </div>
        </div>

        {payroll.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.6 }}>
            <BarChart2 size={40} color="#475569" style={{ marginBottom: '1rem' }} />
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Matrix empty... awaiting operator data.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <AnimatePresence>
              {payroll.map((emp, i) => {
                const isFirst = i === 0;
                const isSecond = i === 1;
                const isThird = i === 2;
                const rankColor = isFirst ? '#D4AF37' : isSecond ? '#94a3b8' : isThird ? '#b45309' : '#475569';
                const rankBg = isFirst ? 'rgba(212,175,55,0.15)' : isSecond ? 'rgba(148,163,184,0.15)' : isThird ? 'rgba(180,83,9,0.15)' : 'rgba(255,255,255,0.03)';

                return (
                  <motion.div key={emp.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '0.75rem' : '1.25rem',
                      padding: isMobile ? '0.75rem 0.9rem' : '1rem 1.25rem',
                      background: isFirst ? 'linear-gradient(90deg, rgba(212,175,55,0.08), transparent)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 16,
                      border: `1px solid ${isFirst ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.03)'}`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                    {isFirst && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 4, background: '#D4AF37', boxShadow: '0 0 10px #D4AF37' }} />}

                    <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: rankBg, border: `1px solid ${rankColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: 900, color: rankColor, flexShrink: 0, boxShadow: isFirst ? '0 0 15px rgba(212,175,55,0.3)' : 'none' }}>
                      {i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.1rem', fontWeight: 800, fontSize: isMobile ? '0.85rem' : '1rem', color: isFirst ? '#D4AF37' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</p>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>{emp.days} Days</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      {!isMobile && (
                        <div style={{ width: 150, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${emp.pct}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} style={{ height: '100%', background: isFirst ? '#D4AF37' : '#8b5cf6', borderRadius: 99, boxShadow: `0 0 10px ${isFirst ? '#D4AF37' : '#8b5cf6'}` }} />
                        </div>
                      )}
                      <div style={{ textAlign: 'right', minWidth: isMobile ? 50 : 60 }}>
                        <p style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1.1rem', color: isFirst ? '#D4AF37' : '#f8fafc' }}>{fmtHrs(emp.hrs)}</p>
                        <p style={{ margin: 0, fontSize: '0.6rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>Output</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div >
  );
};

/* ═══════════════════════════════════════════════════════
   EMPLOYEES TAB
══════════════════════════════════════════════════════════ */
const EmployeesTab = () => {
  const { employees, records, addEmployee, removeEmployee, settings } = useStore();
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const currency = settings?.currency || '₹';
  const targetHrs = (settings?.workingDays || 26) * (settings?.hoursPerDay || 9);
  const monthStr = format(new Date(), 'yyyy-MM');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !salary) return;
    addEmployee({ id: Date.now().toString(), name: name.trim(), baseSalary: Number(salary), joinDate: format(new Date(), 'yyyy-MM-dd') });
    setName(''); setSalary(''); setAddOpen(false);
  };

  const getHistoryStatus = (r) => {
    if (r.isAbsent) return { label: 'Absent', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' };
    if (!r.inTime || !r.outTime) return { label: 'Incomplete', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
    const hrs = calcHours(r.inTime, r.outTime);
    if (hrs >= 9) return { label: 'Overtime', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' };
    if (hrs >= 4.5) return { label: 'Full Day', color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
    return { label: 'Half Day', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  // Analytics
  const estPayroll = employees.reduce((acc, e) => acc + (e.baseSalary || 0), 0);
  const totalMonthRecs = records.filter(r => r.date.startsWith(monthStr));
  const totalMonthHrs = totalMonthRecs.reduce((acc, r) => acc + calcHours(r.inTime, r.outTime), 0);

  const KPICard = ({ title, value, icon: Icon, color, delay }) => (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ background: 'rgba(10,14,28,0.6)', borderRadius: 24, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '1.25rem', backdropFilter: 'blur(16px)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: `${color}15`, borderRadius: '50%', filter: 'blur(25px)', pointerEvents: 'none' }} />
      <div style={{ padding: '0.8rem', borderRadius: 16, background: `${color}15`, border: `1px solid ${color}30`, boxShadow: `0 0 20px ${color}10` }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>{value}</p>
      </div>
    </motion.div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Premium Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: isMobile ? '1.4rem' : '1.75rem' }}>
            Workforce <span style={{ background: 'linear-gradient(135deg,#D4AF37,#fef08a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Command Center</span>
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.75rem' : '0.88rem', fontWeight: 600 }}>Manage organizational personnel, salaries, and historic logs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ position: 'relative', flex: isMobile ? 1 : 'unset' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input className="ipt" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem', width: '100%', minWidth: isMobile ? 'auto' : 200, background: 'rgba(0,0,0,0.4)', borderRadius: 12, fontSize: '0.85rem' }} />
          </div>
          <button className="btn btn-v" onClick={() => setAddOpen(o => !o)} style={{ borderRadius: 12, padding: isMobile ? '0 0.8rem' : '0 1.4rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
            <Plus size={15} /> {isMobile ? '' : (addOpen ? 'Cancel' : 'Onboard')}
          </button>
        </div>
      </div>


      {/* ── Analytics Ribbon ── */}
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        gridTemplateColumns: isMobile ? 'none' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        overflowX: isMobile ? 'auto' : 'visible',
        paddingBottom: isMobile ? '0.5rem' : 0,
        marginInline: isMobile ? '-1.5rem' : 0,
        paddingInline: isMobile ? '1.5rem' : 0
      }} className="custom-scrollbar">
        <div style={{ flexShrink: 0, width: isMobile ? '240px' : 'auto' }}>
          <KPICard title="Total Roster" value={employees.length} icon={Users} color="#06b6d4" delay={0.1} />
        </div>
        <div style={{ flexShrink: 0, width: isMobile ? '240px' : 'auto' }}>
          <KPICard title="Gross Run Rate" value={`${currency}${estPayroll.toLocaleString('en-IN')}`} icon={ClipboardList} color="#D4AF37" delay={0.2} />
        </div>
        <div style={{ flexShrink: 0, width: isMobile ? '240px' : 'auto' }}>
          <KPICard title="Total Output" value={fmtHrs(totalMonthHrs)} icon={Clock} color="#8b5cf6" delay={0.3} />
        </div>
      </div>

      {/* ── Add Form ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1px', borderRadius: 20, background: 'linear-gradient(135deg, rgba(212,175,55,0.45), rgba(99,102,241,0.3))', marginBottom: '0.5rem' }}>
              <div className="glass" style={{ borderRadius: 19, padding: isMobile ? '1.25rem' : '1.75rem' }}>
                <h3 style={{ margin: '0 0 1.25rem', fontWeight: 900, fontSize: isMobile ? '1rem' : '1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Users size={18} color="#D4AF37" /> New Staff
                </h3>
                <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Full Name</label>
                    <input className="ipt" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required autoFocus style={{ borderRadius: 10, padding: '0.7rem 1rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Monthly Base</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem', fontWeight: 900 }}>{currency}</span>
                      <input type="number" className="ipt" placeholder="0.00" value={salary} onChange={e => setSalary(e.target.value)} style={{ paddingLeft: '2rem', borderRadius: 10, padding: '0.7rem 1rem 0.7rem 2rem' }} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-v" style={{ flex: 1, padding: '0.7rem', borderRadius: 10, fontWeight: 800 }}>Save</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)} style={{ borderRadius: 10, padding: '0 1rem' }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Directory Roster ── */}
      <div>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.2rem', fontWeight: 900, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={18} color="#D4AF37" /> Corporate Directory
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '0.75rem' : '1.5rem', alignItems: 'start' }}>
          {filtered.map((emp, i) => {
            const recs = records.filter(r => r.empId === emp.id && r.date.startsWith(monthStr));
            const hrs = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
            const isExpanded = expandedId === emp.id;

            if (isMobile) {
              return (
                <motion.div key={emp.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
                  className="glass" style={{ borderRadius: 16, padding: '0.85rem', background: 'rgba(10,14,28,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #f5d070, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', flexShrink: 0 }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.1rem', fontSize: '0.9rem', fontWeight: 850, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</p>
                      <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: '#D4AF37' }}>{currency}{emp.baseSalary.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-v" onClick={() => setExpandedId(isExpanded ? null : emp.id)} style={{ padding: '0.4rem', borderRadius: 8, background: isExpanded ? '#D4AF37' : 'rgba(255,255,255,0.05)', color: isExpanded ? '#000' : '#fff' }}>
                        <History size={13} />
                      </button>
                      <button className="btn btn-red" onClick={() => confirm(`Remove ${emp.name}?`) && removeEmployee(emp.id)} style={{ padding: '0.4rem', borderRadius: 8 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '0.5rem' }}>
                    {[
                      { label: 'Days', value: recs.length, color: '#06b6d4' },
                      { label: 'Hrs', value: fmtHrs(hrs), color: '#D4AF37' },
                      { label: 'Avg', value: recs.length > 0 ? fmtHrs(hrs / recs.length) : '—', color: '#34d399' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.52rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>{s.label}</p>
                        <p style={{ margin: 0, fontWeight: 900, fontSize: '0.72rem', color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><History size={10} /> Recent Audit</p>
                          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }} className="custom-scrollbar">
                            {records.filter(r => r.empId === emp.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(r => {
                              const st = getHistoryStatus(r);
                              return (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: '0.65rem' }}>
                                  <div style={{ fontWeight: 800, color: '#cbd5e1' }}>{format(new Date(r.date + 'T00:00:00'), 'MMM dd')}</div>
                                  <div style={{ color: st.color, fontWeight: 900, fontSize: '0.6rem' }}>{st.label}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }

            return (
              <Tilt key={emp.id} tiltMaxAngleX={isExpanded ? 0 : 3} tiltMaxAngleY={isExpanded ? 0 : 3} scale={1.01} transitionSpeed={2500}>
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}
                  className="glass" style={{ borderRadius: 24, position: 'relative', overflow: 'hidden', height: '100%', background: 'rgba(10,14,28,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>

                  {/* Banner Header */}
                  <div style={{ height: 95, background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(99,102,241,0.15))', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Cg%3E%3C/svg%3E")' }} />

                    <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-v" onClick={() => setExpandedId(isExpanded ? null : emp.id)} style={{ padding: '0.45rem', borderRadius: 12, background: isExpanded ? '#D4AF37' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', color: isExpanded ? '#000' : '#fff' }}>
                        <History size={14} />
                      </button>
                      <button className="btn btn-red" onClick={() => confirm(`Terminate ${emp.name}?`) && removeEmployee(emp.id)} style={{ padding: '0.45rem', borderRadius: 12, background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(10px)' }}>
                        <Trash2 size={14} color="#fca5a5" />
                      </button>
                    </div>
                  </div>

                  {/* ID Profile Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-45px', padding: '0 1.5rem 1.5rem' }}>
                    <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
                      <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#0B0F1A', padding: 5, boxShadow: '0 8px 25px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #f5d070, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 900, color: '#f8fafc', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 0.15rem', fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc', textAlign: 'center', letterSpacing: '-0.01em' }}>{emp.name}</h3>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.7rem', fontWeight: 800, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(212,175,55,0.1)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>Badge ID: {emp.id.slice(-5)}</p>

                    {/* Stats Container */}
                    <div style={{ background: 'rgba(0,0,0,0.4)', width: '100%', borderRadius: 20, padding: '1.1rem', border: '1px solid rgba(255,255,255,0.03)', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Comp</span>
                        <span style={{ color: '#f8fafc', fontSize: '0.9rem', fontWeight: 900 }}>{currency}{emp.baseSalary.toLocaleString('en-IN')}/mo</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                          { label: 'Days Active', value: recs.length, color: '#06b6d4' },
                          { label: 'Billed Hrs', value: fmtHrs(hrs), color: '#D4AF37' },
                          { label: 'Pace/Day', value: recs.length > 0 ? fmtHrs(hrs / recs.length) : '—', color: '#34d399' },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{s.label}</p>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: '0.85rem', color: s.color }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Action Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden', padding: '0 1.5rem 1.5rem' }}>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                            <History size={12} color="#D4AF37" /> Audit Trail (Recent)
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto', paddingRight: '0.2rem' }} className="custom-scrollbar">
                            {(() => {
                              const empRecs = records.filter(r => r.empId === emp.id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

                              if (empRecs.length === 0) {
                                return <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', margin: '1rem 0', fontWeight: 600 }}>No auditable logs discovered.</p>;
                              }

                              return empRecs.map(r => {
                                const st = getHistoryStatus(r);
                                return (
                                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.35)', borderRadius: 12, borderLeft: `3px solid ${st.color}`, border: '1px solid rgba(255,255,255,0.02)' }}>
                                    <div>
                                      <p style={{ margin: '0 0 0.1rem', fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc' }}>{format(new Date(r.date + 'T00:00:00'), 'MMM dd, yyyy')}</p>
                                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 600, fontFamily: 'monospace' }}>
                                        {r.isAbsent ? 'System Tag: ABSENT' : `${r.inTime} -> ${r.outTime || '---'}`}
                                      </p>
                                    </div>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '0.25rem 0.5rem', background: st.bg, color: st.color, borderRadius: 6, border: `1px solid ${st.color}40`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      {st.label}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              </Tilt>
            );
          })}

          {/* Empty States */}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              {employees.length === 0 ? (
                <div className="insight-card" style={{ padding: isMobile ? '2.5rem' : '4rem', background: 'rgba(0,0,0,0.2)' }}>
                  <div className="insight-glow" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)' }} />
                  <div className="insight-icon-ring" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
                    <Users size={isMobile ? 24 : 32} color="#D4AF37" />
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 900 }}>Directory is Empty</h3>
                  <p style={{ margin: 0, color: '#64748b', maxWidth: 350, marginInline: 'auto', fontSize: isMobile ? '0.8rem' : '0.9rem', lineHeight: 1.5 }}>Onboard your first staff member to begin.</p>
                </div>
              ) : (
                <p style={{ color: '#475569', textAlign: 'center', padding: '4rem', fontSize: '0.9rem', fontWeight: 600 }}>No matching operative.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   SETTINGS TAB
══════════════════════════════════════════════════════════ */
const SettingsTab = () => {
  const { settings, updateSettings } = useStore();
  const defaults = { workingDays: 26, hoursPerDay: 9, overtimeRate: 1.0, lateGraceMins: 15, currency: '₹', officeStartTime: '09:00', ...settings };
  const [st, setSt] = useState(defaults);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(st);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Field = ({ label, hint, children }) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '0.35rem 0 0', fontSize: '0.62rem', color: '#334155' }}>{hint}</p>}
    </div>
  );

  const sHead = (icon, title, subtitle, color) => (
    <div style={{ padding: '0.85rem 1.25rem', background: `${color}08`, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ padding: '0.4rem', background: `${color}18`, borderRadius: 9, border: `1px solid ${color}30` }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem' }}>{title}</p>
        {subtitle && <p style={{ margin: 0, fontSize: '0.65rem', color: '#475569' }}>{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 740 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.15rem', fontWeight: 900, fontSize: '1.4rem' }}>
            Workspace <span style={{ background: 'linear-gradient(135deg,#D4AF37,#F5D070)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Settings</span>
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>Configure payroll formula, attendance rules, and office hours</p>
        </div>
        <AnimatePresence>
          {saved && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ color: '#34d399', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(52,211,153,0.1)', padding: '0.4rem 0.85rem', borderRadius: 99, border: '1px solid rgba(52,211,153,0.25)' }}>
              <CheckCircle2 size={14} /> Saved Successfully
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Formula banner */}
      <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 14, padding: '0.85rem 1.25rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <BarChart2 size={16} color="#D4AF37" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
          Salary formula:
          <code style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', padding: '1px 7px', borderRadius: 5, marginLeft: '0.4rem', fontSize: '0.75rem' }}>(Base ÷ Target Hours) × Worked Hours</code>
        </p>
      </div>

      {/* Payroll section */}
      <div className="glass" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: '1rem' }}>
        {sHead(<Clock size={14} color="#D4AF37" />, 'Payroll & Hours', 'Cycle: starting month', '#D4AF37')}
        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.1rem' }}>
          <Field label="Salary Cycle" hint="Applied to all attendance & payroll on the 1st">
            <input type="text" className="ipt" value="starting month" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </Field>
          <Field label="Currency Symbol">
            <select className="ipt" value={st.currency} onChange={e => setSt({ ...st, currency: e.target.value })}>
              <option value="₹">₹ (INR)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
              <option value="£">£ (GBP)</option>
            </select>
          </Field>
          <Field label="Working Days / Month">
            <input type="number" className="ipt" min={1} max={31} value={st.workingDays} onChange={e => setSt({ ...st, workingDays: Number(e.target.value) })} />
          </Field>
          <Field label="Required Hours / Day">
            <input type="number" className="ipt" min={1} max={24} step={0.5} value={st.hoursPerDay} onChange={e => setSt({ ...st, hoursPerDay: Number(e.target.value) })} />
          </Field>
          <Field label="Overtime Multiplier" hint="Applied beyond required daily hours">
            <div style={{ position: 'relative' }}>
              <input type="number" step="0.1" min={1} className="ipt" value={st.overtimeRate} onChange={e => setSt({ ...st, overtimeRate: parseFloat(e.target.value) })} style={{ paddingRight: '2.2rem' }} />
              <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 800 }}>x</span>
            </div>
          </Field>
        </div>
        <div style={{ margin: '0 1.25rem 1.25rem', background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#D4AF37', fontWeight: 700 }}>Monthly Target Load</p>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem' }}>
            <span style={{ background: 'linear-gradient(135deg,#D4AF37,#F5D070)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{st.workingDays * st.hoursPerDay}h</span>
          </p>
        </div>
      </div>

      {/* Office timing */}
      <div className="glass" style={{ borderRadius: 18, overflow: 'hidden', marginBottom: '1rem' }}>
        {sHead(<Calendar size={14} color="#06b6d4" />, 'Office Timing', 'Used to auto-detect late arrivals', '#06b6d4')}
        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.1rem' }}>
          <Field label="Office Opens At" hint="Late detection is based on this time ± grace period">
            <AnalogTimePicker value={st.officeStartTime} onChange={val => setSt({ ...st, officeStartTime: val })} color="#06b6d4" />
          </Field>
          <Field label="Late Grace Period" hint="Minutes after office start before marked Late">
            <div style={{ position: 'relative' }}>
              <input type="number" className="ipt" min={0} max={120} value={st.lateGraceMins} onChange={e => setSt({ ...st, lateGraceMins: parseInt(e.target.value) })} style={{ paddingRight: '2.8rem' }} />
              <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>min</span>
            </div>
          </Field>
        </div>
        <div style={{ margin: '0 1.25rem 1.25rem', background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          🕒 Office hours: <strong style={{ color: '#22d3ee' }}>{st.officeStartTime}</strong> — employees arriving after
          <strong style={{ color: '#fbbf24' }}>{' '}{(() => { const [h, m] = st.officeStartTime.split(':').map(Number); const total = h * 60 + m + (st.lateGraceMins || 0); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; })()}</strong> will be marked <span style={{ color: '#fbbf24', fontWeight: 700 }}>Late</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-v" onClick={handleSave} style={{ padding: '0.8rem 1.8rem', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 6px 24px rgba(212,175,55,0.3)' }}>
          <CheckCircle2 size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   ATTENDANCE TAB
══════════════════════════════════════════════════════════ */
const AttendanceTab = () => {
  const { employees, records, addRecords, deleteRecord, settings } = useStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [drafts, setDrafts] = useState({});
  const [saved, setSaved] = useState({});
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [localEditing, setLocalEditing] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  const setDraft = (empId, field, val) => setDrafts(d => ({ ...d, [empId]: { ...(d[empId] || {}), [field]: val } }));

  const dateObj = new Date(date + 'T00:00:00');
  const visibleEmployees = useMemo(() => employees.filter(emp => !emp.joinDate || date >= emp.joinDate), [employees, date]);

  useEffect(() => {
    const initial = {};
    visibleEmployees.forEach(emp => {
      const rec = records.find(r => r.empId === emp.id && r.date === date);
      initial[emp.id] = rec ? { inTime: rec.inTime || '09:00', outTime: rec.outTime || '18:00' } : { inTime: '09:00', outTime: '18:00' };
    });
    setDrafts(initial);
  }, [date, visibleEmployees, records]);

  useEffect(() => {
    setSaved({});
  }, [date]);

  const calcHrs = (inT, outT) => {
    if (!inT || !outT) return 0;
    const [ih, im] = inT.split(':').map(Number);
    const [oh, om] = outT.split(':').map(Number);
    return Math.max(0, (oh + om / 60) - (ih + im / 60));
  };

  const getStatusLocal = (inT, outT, isAbsent) => {
    if (isAbsent) return { key: 'absent', label: 'Absent', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', glow: 'rgba(244,63,94,0.3)' };
    if (!inT) return { key: 'empty', label: 'Not Set', color: '#64748b', bg: 'rgba(51,65,85,0.15)', glow: 'transparent' };
    if (!outT) return { key: 'partial', label: 'Active', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.2)' };
    const hrs = calcHrs(inT, outT);
    if (hrs >= 9) return { key: 'overtime', label: 'Overtime', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', glow: 'rgba(34,211,238,0.3)' };
    if (hrs >= 4.5) return { key: 'full', label: 'Full Day', color: '#34d399', bg: 'rgba(52,211,153,0.1)', glow: 'rgba(52,211,153,0.3)' };
    return { key: 'half', label: 'Half Day', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', glow: 'rgba(251,191,36,0.3)' };
  };

  const isLate = (inT) => {
    if (!inT) return false;
    const [h, m] = inT.split(':').map(Number);
    const grace = settings?.lateGraceMins || 15;
    return h > 9 || (h === 9 && m > grace);
  };

  const saveRow = (emp, markAbsent = false) => {
    const d = drafts[emp.id] || {};
    if (!markAbsent && (!d.inTime || !d.outTime)) return;
    if (emp.joinDate && date < emp.joinDate) { alert(`Cannot log attendance before joining date (${emp.joinDate}).`); return; }

    if (markAbsent) {
      addRecords([{ id: `${emp.id}-${date}`, empId: emp.id, date, inTime: '', outTime: '', source: 'manual', isAbsent: true }]);
    } else {
      addRecords([{ id: `${emp.id}-${date}`, empId: emp.id, date, inTime: d.inTime, outTime: d.outTime, source: 'manual', isAbsent: false }]);
    }

    setSaved(s => ({ ...s, [emp.id]: true }));
    setTimeout(() => setSaved(s => { const n = { ...s }; delete n[emp.id]; return n; }), 2500);
  };

  const clearRow = (empId) => {
    const rec = records.find(r => r.empId === empId && r.date === date);
    if (rec) deleteRecord(rec.id);
    setDrafts(d => ({ ...d, [empId]: { inTime: '', outTime: '' } }));
  };

  // Bulk save valid patterns
  const saveAll = () => visibleEmployees.forEach(emp => { const d = drafts[emp.id] || {}; if (d.inTime && d.outTime) saveRow(emp, false); });

  const prevDay = () => setDate(d => format(new Date(new Date(d).getTime() - 86400000), 'yyyy-MM-dd'));
  const nextDay = () => setDate(d => format(new Date(new Date(d).getTime() + 86400000), 'yyyy-MM-dd'));

  const filledRecs = records.filter(r => r.date === date && visibleEmployees.some(e => e.id === r.empId));
  const filledCount = filledRecs.length;
  const fillPct = visibleEmployees.length > 0 ? (filledCount / visibleEmployees.length) * 100 : 0;
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Premium Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,14,28,0.5)', padding: '1rem 1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '1.6rem', background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Daily <span style={{ background: 'linear-gradient(to right, #D4AF37, #fef08a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Attendance</span>
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Effortlessly log and manage daily time tracking.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
          <button className="btn btn-ghost" onClick={prevDay} style={{ padding: '0.5rem', borderRadius: 12 }}><ChevronLeft size={18} /></button>
          <input type="date" className="ipt" value={date} onChange={e => setDate(e.target.value)} style={{ width: 155, textAlign: 'center', fontWeight: 800, background: 'transparent', border: 'none', padding: '0.5rem 0', color: '#f8fafc', fontSize: '0.95rem' }} />
          <button className="btn btn-ghost" onClick={nextDay} style={{ padding: '0.5rem', borderRadius: 12 }}><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* ── Progress & Date Summary ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ padding: '1px', borderRadius: 24, background: 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(99,102,241,0.2))', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
        <div style={{ background: 'rgba(10,12,22,0.85)', backdropFilter: 'blur(30px)', borderRadius: 23, padding: '1.25rem 1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, left: -30, width: 150, height: 150, background: 'rgba(212,175,55,0.1)', filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div>
            <p style={{ margin: '0 0 0.15rem', fontWeight: 900, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#D4AF37" />
              {format(dateObj, 'EEEE, MMMM do')}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              {isWeekend ? <span style={{ color: '#f43f5e' }}>🌴 Weekend Auto-detect</span> : <span style={{ color: '#34d399' }}>{filledCount} of {visibleEmployees.length} Records Documented</span>}
            </p>
          </div>

          {!isWeekend && visibleEmployees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 140, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${fillPct}%` }} transition={{ duration: 1, type: "spring" }}
                    style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #6366f1, #D4AF37)', boxShadow: '0 0 10px rgba(212,175,55,0.5)' }} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: fillPct === 100 ? '#D4AF37' : '#94a3b8', width: '38px', textAlign: 'right' }}>
                  {Math.round(fillPct)}%
                </span>
              </div>
              <button className="btn btn-v" onClick={saveAll} disabled={fillPct === 0} style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', boxShadow: '0 8px 20px rgba(99,102,241,0.3)', opacity: fillPct === 0 ? 0.5 : 1 }}>
                <CheckCircle2 size={16} /> Save All Entries
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Employee Cards Grid ── */}
      {visibleEmployees.length === 0 ? (
        <div className="insight-card" style={{ padding: '4rem 2rem' }}>
          <div className="insight-glow" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 60%)' }} />
          <div className="insight-icon-ring" style={{ width: 72, height: 72, borderColor: 'rgba(212,175,55,0.2)', marginBottom: '1.5rem' }}>
            <ClipboardList size={34} color="#D4AF37" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 900 }}>No Employees Found For This Date</h3>
          <p style={{ margin: 0, color: '#64748b', maxWidth: 400, marginInline: 'auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Employees are only shown based on their join date.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {visibleEmployees.map((emp, i) => {
            const d = drafts[emp.id] || {};
            const rec = records.find(r => r.empId === emp.id && r.date === date);
            const officiallyAbsent = rec?.isAbsent || false;

            const inT = d.inTime || '';
            const outT = d.outTime || '';
            const hrs = calcHrs(inT, outT);
            const st = getStatusLocal(inT, outT, officiallyAbsent);
            const late = isLate(inT);
            const isSv = saved[emp.id];
            const pct = Math.min((hrs / (settings?.hoursPerDay || 9)) * 100, 100);

            return (
              <Tilt key={emp.id} tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.01} transitionSpeed={2500}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => { setSelectedEmpId(emp.id); setLocalEditing(false); }}
                  style={{
                    borderRadius: 24, padding: '1.25rem', position: 'relative', overflow: 'hidden',
                    background: isSv ? 'rgba(52,211,153,0.08)' : 'rgba(10,14,28,0.7)',
                    border: `1px solid ${isSv ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: isSv ? '0 0 30px rgba(52,211,153,0.15)' : '0 10px 30px -10px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                  whileHover={{ y: -5, background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(212,175,55,0.2)' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Ring pct={pct} color={st.color} size={50} stroke={4} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', background: '#0f172a', borderRadius: '50%', margin: 4 }}>
                        <span style={{ color: st.color }}>{emp.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: st.color, background: st.bg, padding: '0.1rem 0.5rem', borderRadius: 6, border: `1px solid ${st.color}30` }}>
                          {st.label}
                        </span>
                        {late && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '0.1rem 0.5rem', borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)' }}>Late</span>}
                      </div>
                    </div>
                    {(hrs > 0 || isSv) && (
                      <div style={{ textAlign: 'right' }}>
                        {isSv ? (
                          <CheckCircle2 size={20} color="#34d399" />
                        ) : (
                          <p style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: st.color, lineHeight: 1 }}>
                            {Math.floor(hrs)}<span style={{ fontSize: '0.7rem', opacity: 0.7 }}>h</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Tilt>
            );
          })}
        </div>
      )}

      {/* ── Immersive Attendance Focus Modal ── */}
      <AnimatePresence>
        {selectedEmp && (() => {
          const d = drafts[selectedEmp.id] || {};
          const rec = records.find(r => r.empId === selectedEmp.id && r.date === date);
          const officiallyAbsent = rec?.isAbsent || false;
          const inT = d.inTime || '';
          const outT = d.outTime || '';
          const hrs = calcHrs(inT, outT);
          const st = getStatusLocal(inT, outT, officiallyAbsent);
          const late = isLate(inT);
          const isSv = saved[selectedEmp.id];
          const pct = Math.min((hrs / (settings?.hoursPerDay || 9)) * 100, 100);

          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedEmpId(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(6px)', padding: isMobile ? '0.75rem' : '1rem' }}>
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', maxWidth: isMobile ? 440 : 700, borderRadius: isMobile ? 24 : 32, padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem', position: 'relative', overflow: 'hidden',
                  background: 'rgba(15,23,42,0.95)', border: `2px solid ${st.color}40`,
                  boxShadow: `0 30px 60px -12px rgba(0,0,0,0.5), 0 0 40px ${st.glow}`,
                  maxHeight: '96vh', overflowY: 'auto'
                }}>
                <div style={{ position: 'absolute', top: -100, right: -100, width: 250, height: 250, background: `${st.color}15`, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

                {/* Close Button */}
                <button onClick={() => setSelectedEmpId(null)} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                  <X size={20} />
                </button>

                {/* Modal Content */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ position: 'relative', marginBottom: isMobile ? '0.5rem' : '0.75rem' }}>
                    <Ring pct={pct} color={st.color} size={isMobile ? 60 : 80} stroke={isMobile ? 4 : 6} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: isMobile ? '1.4rem' : '1.8rem', background: '#0f172a', borderRadius: '50%', margin: isMobile ? 4 : 6, border: `1px solid ${st.color}20` }}>
                      <span style={{ color: st.color, textShadow: `0 0 15px ${st.color}50` }}>{selectedEmp.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>

                  <h2 style={{ margin: '0 0 0.15rem', fontSize: isMobile ? '1.1rem' : '1.35rem', fontWeight: 900, color: '#f8fafc' }}>{selectedEmp.name}</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: isMobile ? '1rem' : '1.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: st.color, background: `${st.color}15`, padding: '0.3rem 0.8rem', borderRadius: 99, border: `1px solid ${st.color}30`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{st.label}</span>
                    {late && <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '0.3rem 0.8rem', borderRadius: 99, border: '1px solid rgba(251,191,36,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Late Arrival</span>}
                  </div>

                  {((rec || isSv) && !localEditing) ? (
                    /* ── Attendance Success Screen ── */
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                      style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(52,211,153,0.2)' }}>
                          <CheckCircle2 size={32} color="#34d399" />
                        </div>
                        <h3 style={{ margin: 0, color: '#34d399', fontWeight: 900, fontSize: '1.25rem' }}>Attendance Marked Successfully</h3>
                      </div>

                      <div style={{ borderRadius: 20, padding: '1rem', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                          <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>In Time</p>
                          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#f8fafc' }}>{inT || '--:--'}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Out Time</p>
                          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#f8fafc' }}>{outT || '--:--'}</p>
                        </div>
                      </div>

                      <button onClick={() => setLocalEditing(true)} 
                        className="btn btn-ghost" style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', fontWeight: 800, color: '#cbd5e1', borderRadius: 16 }}>
                        Edit Attendance
                      </button>
                      <button onClick={() => setSelectedEmpId(null)} 
                        className="btn btn-v" style={{ width: '100%', padding: '0.8rem', fontWeight: 800, borderRadius: 16 }}>
                        Close View
                      </button>
                    </motion.div>
                  ) : (
                    /* ── Full Interaction View (Clocks) ── */
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {/* Analog Time Focus */}
                      <div style={{ 
                        width: '100%', 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row', 
                        gap: isMobile ? '1.25rem' : '1.5rem', 
                        marginBottom: isMobile ? '1.25rem' : '1.75rem', 
                        opacity: officiallyAbsent ? 0.3 : 1, 
                        pointerEvents: officiallyAbsent ? 'none' : 'auto',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        borderRadius: 20
                      }}>
                        {[
                          { label: 'Clock In', field: 'inTime', val: inT, col: '#34d399' },
                          { label: 'Clock Out', field: 'outTime', val: outT, col: '#fbbf24' },
                        ].map(({ label, field, val, col }) => (
                          <div key={field} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 850, letterSpacing: '0.1em' }}>{label}</p>
                            <AnalogTimePicker value={val} onChange={newVal => setDraft(selectedEmp.id, field, newVal)} color={col} size={isMobile ? 140 : 160} />
                          </div>
                        ))}
                      </div>

                      {/* Output Focus */}
                      {hrs > 0 && !officiallyAbsent && (
                        <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem', animation: 'fadeIn 0.5s ease' }}>
                          <p style={{ margin: '0 0 0.1rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Current Output</p>
                          <h3 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.85rem', fontWeight: 900, color: st.color }}>{fmtHrs(hrs)}</h3>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button className="btn btn-v" onClick={() => { saveRow(selectedEmp, false); setTimeout(() => setSelectedEmpId(null), 500); }} disabled={officiallyAbsent || (!inT || !outT)}
                            style={{ flex: 1, padding: isMobile ? '0.8rem' : '1rem', borderRadius: 16, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, background: (officiallyAbsent || !inT || !outT) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${st.color}, ${st.color}dd)`, color: (officiallyAbsent || !inT || !outT) ? '#64748b' : '#000', border: 'none', boxShadow: (officiallyAbsent || !inT || !outT) ? 'none' : `0 8px 20px ${st.color}40`, transition: 'all 0.3s' }}>
                            Save Record
                          </button>
                          <button className="btn btn-red" onClick={() => { saveRow(selectedEmp, true); setTimeout(() => setSelectedEmpId(null), 500); }} disabled={officiallyAbsent}
                            style={{ flex: 0.6, padding: isMobile ? '0.8rem' : '1rem', borderRadius: 16, fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 900, background: officiallyAbsent ? 'rgba(244,63,94,0.05)' : 'rgba(244,63,94,0.12)', color: officiallyAbsent ? '#64748b' : '#f43f5e', border: officiallyAbsent ? 'none' : '1px solid rgba(244,63,94,0.4)' }}>
                            {officiallyAbsent ? 'Absent' : 'Mark Absent'}
                          </button>
                        </div>

                        {rec && (
                          <button onClick={() => { if(confirm('Clear this log?')) { clearRow(selectedEmp.id); setSelectedEmpId(null); } }} style={{ background: 'transparent', border: 'none', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem', cursor: 'pointer' }}>
                            Clear Permanent Record
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════
   TAB DEFINITIONS
══════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'ocr', label: 'OCR Upload', icon: Scan },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'face', label: 'Face Recognition', icon: Scan },
];

/* ═══════════════════════════════════════════════════════
   DASHBOARD (MAIN SHELL)
══════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const [tab, setTab] = useState('overview');
  const [sideOpen, setSideOpen] = useState(false);

  const closeSide = () => setSideOpen(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: '0 0.5rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            {/* Brand mark */}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #D4AF37, #B8962E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#0B0F1A', boxShadow: '0 4px 12px rgba(212,175,55,0.4)', flexShrink: 0 }}>A</div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg, #D4AF37, #F5D070)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em' }}>AttendX</h1>
              <p style={{ fontSize: '0.58rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '1px 0 0' }}>HR Platform</p>
            </div>
          </div>
        </div>
        <button onClick={closeSide} className="btn btn-ghost sidebar-close" style={{ padding: '0.4rem' }}><X size={16} /></button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {/* Section label */}
        <p style={{ fontSize: '0.58rem', fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.14em', padding: '0 0.5rem', margin: '0 0 0.5rem' }}>Navigation</p>
        {TABS.slice(0, 7).map(t => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => { window.scrollTo(0, 0); setTab(t.id); closeSide(); }}
              className={`navlink ${on ? 'on' : ''}`}>
              <Icon size={15} style={{ color: on ? '#D4AF37' : '#475569', flexShrink: 0 }} />
              {t.label}
            </button>
          );
        })}
        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0.5rem 0.5rem' }} />
        <p style={{ fontSize: '0.58rem', fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.14em', padding: '0 0.5rem', margin: '0 0 0.5rem' }}>Biometrics</p>
        {/* Face Recognition tab with gold highlight */}
        {TABS.slice(7).map(t => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => { window.scrollTo(0, 0); setTab(t.id); closeSide(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.65rem 0.95rem', borderRadius: 12, cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem', border: 'none',
                background: on
                  ? 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))'
                  : 'rgba(212,175,55,0.05)',
                color: on ? '#D4AF37' : '#94a3b8',
                fontFamily: 'inherit', width: '100%', transition: 'all 0.18s',
                letterSpacing: '0.01em', position: 'relative',
                border: on
                  ? '1px solid rgba(212,175,55,0.3)'
                  : '1px solid rgba(212,175,55,0.1)',
                boxShadow: on ? '0 4px 16px rgba(212,175,55,0.15)' : 'none',
              }}>
              {on && <div style={{ position: 'absolute', left: -0.5, top: '50%', transform: 'translateY(-50%)', width: 3, height: '60%', borderRadius: '0 3px 3px 0', background: 'linear-gradient(180deg, #D4AF37, #B8962E)' }} />}
              <Icon size={15} style={{ color: on ? '#D4AF37' : '#94a3b8', flexShrink: 0 }} />
              {t.label}
              {!on && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', padding: '1px 6px', borderRadius: 99, fontWeight: 800 }}>NEW</span>}
            </button>
          );
        })}
      </nav>

      {/* User chip */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #D4AF37, #B8962E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#0B0F1A', flexShrink: 0, boxShadow: '0 0 10px rgba(212,175,55,0.3)' }}>A</div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Admin</p>
            <p style={{ margin: 0, fontSize: '0.62rem', color: '#475569' }}>AttendX HR</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <motion.aside
        initial={{ x: -250, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        className="glass desktop-sidebar"
        style={{ borderRight: '1px solid rgba(212,175,55,0.06)' }}>
        <SidebarContent />
      </motion.aside>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSide}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
            <motion.aside key="mobile-side" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="glass mobile-sidebar" style={{ borderRight: '1px solid rgba(212,175,55,0.08)' }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="app-main">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button onClick={() => setSideOpen(true)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><Menu size={20} /></button>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#D4AF37,#F5D070)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AttendX</h1>
          <div style={{ width: 36 }} />
        </div>

        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {tab === 'overview' && <Overview />}
              {tab === 'attendance' && <AttendanceTab />}
              {tab === 'calendar' && <CalendarView />}
              {tab === 'ocr' && <OCRUpload />}
              {tab === 'employees' && <EmployeesTab />}
              {tab === 'reports' && <Reports />}
              {tab === 'settings' && <SettingsTab />}
              {tab === 'face' && <FaceRecognitionTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom nav */}
        <nav className="mobile-bottom-nav">
          {TABS.slice(0, 5).map(t => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => { window.scrollTo(0, 0); setTab(t.id); }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.6rem 0.2rem', color: on ? '#D4AF37' : '#475569', fontFamily: 'inherit', fontSize: '0.6rem', fontWeight: on ? 700 : 400, transition: 'color 0.15s' }}>
                <Icon size={18} style={{ color: on ? '#D4AF37' : '#475569' }} />
                {t.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   ROOT APP — renders Dashboard directly, no routing
══════════════════════════════════════════════════════════ */
const App = () => {
  const { user, login } = useStore();

  useEffect(() => {
    if (!user) {
      login({ id: 'mock-admin', name: 'Admin', email: 'admin@admin.com', role: 'admin' });
    }
  }, [user, login]);

  return (
    <>
      <AmbientBg />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
          <Dashboard />
        </motion.div>
      </div>
    </>
  );
};

export default App;
