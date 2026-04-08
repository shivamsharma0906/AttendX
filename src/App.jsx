import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, Scan, Users, BarChart2, Settings2, Plus, Trash2, Clock, Search, ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { format } from 'date-fns';

import useStore from './store/useAppStore';
import { calcHours, calcFinalSalary, fmtHrs, STATUS_COLORS, getStatus } from './utils/calc';
import CalendarView from './calendar/CalendarView';
import OCRUpload from './ocr/OCRUpload';
import Reports from './reports/Reports';

/* ─── Auto admin — no login needed ───────────────────────── */
const ADMIN = { id: 'admin', name: 'Admin', role: 'admin' };

/* ─── Minimal ambient background ─── */
const AmbientBg = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {/* Deep base */}
    <div style={{ position: 'absolute', inset: 0, background: '#07070f' }} />
    {/* Purple orb — top left */}
    <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '55vw', height: '55vw', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
      animation: 'orb1 18s ease-in-out infinite alternate', willChange: 'transform' }} />
    {/* Cyan orb — bottom right */}
    <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '50vw', height: '50vw', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(6,182,212,0.11) 0%, transparent 70%)',
      animation: 'orb2 22s ease-in-out infinite alternate', willChange: 'transform' }} />
    {/* Subtle center glow */}
    <div style={{ position: 'absolute', top: '40%', left: '35%', width: '30vw', height: '30vw', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)' }} />
    <style>{`
      @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(4vw, 5vh) scale(1.08); } }
      @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-4vw, -5vh) scale(1.1); } }
    `}</style>
  </div>
);


/* ─── Stat Card ─── */
const Stat = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} scale={1.02} transitionSpeed={2000} style={{ flex: '1 1 180px' }}>
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass" style={{ borderRadius: 16, padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden', height: '100%' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, background: color + '14', borderRadius: '50%', filter: 'blur(30px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.65rem' }}>
        <div style={{ padding: '0.45rem', background: color + '1a', borderRadius: 9 }}><Icon size={16} color={color} /></div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc' }}>{value}</p>
    </motion.div>
  </Tilt>
);

/* ─── Motivation Carousel ─── */
const QUOTES = [
  "“The only way to do great work is to love what you do.” — Steve Jobs",
  "“Success is not final, failure is not fatal: it is the courage to continue that counts.”",
  "“Don't count the days, make the days count.” — Muhammad Ali",
  "“Hard work beats talent when talent doesn’t work hard.” — Tim Notke",
  "“Your limitation—it's only your imagination.”",
  "“Great things never come from comfort zones.”",
  "“Dream big and dare to fail.” — Norman Vaughan"
];

const QuoteCarousel = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const int = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(int);
  }, []);
  
  return (
    <div className="quote-container">
      <AnimatePresence mode="wait">
        <motion.p key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ margin: 0, color: '#22d3ee', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(6,182,212,0.4)', lineHeight: 1.4 }}>
          {QUOTES[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/* ─── Circular Progress Ring ─── */
const Ring = ({ pct, color, size = 64, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  );
};

/* ─── Overview Tab ─── */
const Overview = () => {
  const { employees, records, settings, user } = useStore();
  const currency   = settings?.currency || '₹';
  const targetHrs  = (settings?.workingDays || 26) * (settings?.hoursPerDay || 9);
  const todayStr   = format(new Date(), 'yyyy-MM-dd');
  const monthStr   = format(new Date(), 'yyyy-MM');
  const now        = new Date();

  const todayRecs  = records.filter(r => r.date === todayStr);
  const monthRecs  = records.filter(r => r.date.startsWith(monthStr));

  /* Payroll enriched */
  const payroll = employees.map(emp => {
    const recs  = records.filter(r => r.empId === emp.id && r.date.startsWith(monthStr));
    const hrs   = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
    const pct   = targetHrs > 0 ? Math.min((hrs / targetHrs) * 100, 100) : 0;
    return { ...emp, days: recs.length, hrs, pct };
  }).sort((a, b) => b.hrs - a.hrs);

  const topPerformer = payroll[0];
  const avgHrsToday  = todayRecs.length > 0
    ? todayRecs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0) / todayRecs.length
    : 0;
  const onTimeToday  = todayRecs.filter(r => {
    if (!r.inTime) return false;
    const [h, m] = r.inTime.split(':').map(Number);
    return h < 9 || (h === 9 && m <= (settings?.lateGraceMins || 15));
  }).length;

  /* KPI cards config */
  const kpis = [
    { icon: Users,     label: 'Employees',       value: employees.length,             sub: 'registered',              color: '#8b5cf6' },
    { icon: Clock,     label: "Today's Punches",  value: todayRecs.length,             sub: `${onTimeToday} on-time`,  color: '#06b6d4' },
    { icon: Calendar,  label: 'Monthly Records',  value: monthRecs.length,             sub: monthStr,                  color: '#f59e0b' },
    { icon: BarChart2, label: 'Avg Hrs Today',    value: avgHrsToday > 0 ? fmtHrs(avgHrsToday) : '—', sub: 'per employee', color: '#10b981' },
  ];


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ══ HERO BANNER ══ */}
      <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: '1px', borderRadius: 24, background: 'linear-gradient(135deg, rgba(139,92,246,0.55), rgba(6,182,212,0.45), rgba(16,185,129,0.3))', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', position: 'relative', zIndex: 2 }}>
        <div className="hero-inner">
          <div style={{ position: 'absolute', top: -40, left: -40, width: 280, height: 280, background: 'rgba(139,92,246,0.2)', filter: 'blur(70px)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 className="hero-title">
              Welcome back, <span className="tg" style={{ filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.7))' }}>{user?.name?.split(' ')[0] || 'Admin'}</span> 👋
            </h1>
            <QuoteCarousel />
          </div>
          <div className="hero-date-block">
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{format(now, 'EEEE')}</p>
            <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', textShadow: '0 0 15px rgba(255,255,255,0.25)' }}>{format(now, 'MMMM do, yyyy')}</p>
          </div>
        </div>
      </motion.div>

      {/* ══ KPI CARDS ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {kpis.map(({ icon: Icon, label, value, sub, color }, i) => (
          <Tilt key={label} tiltMaxAngleX={5} tiltMaxAngleY={5} scale={1.02} transitionSpeed={2000}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="glass" style={{ borderRadius: 18, padding: '1.25rem', position: 'relative', overflow: 'hidden', height: '100%' }}>
              {/* glow orb */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: color + '18', borderRadius: '50%', filter: 'blur(28px)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                <div style={{ padding: '0.5rem', background: color + '1a', borderRadius: 10, border: `1px solid ${color}30` }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '2rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{value}</p>
              <p style={{ margin: '0 0 0.15rem', fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: color, fontWeight: 600 }}>{sub}</p>
            </motion.div>
          </Tilt>
        ))}
      </div>

      {/* ══ TWO-COLUMN AREA ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

        {/* ── Top Performer ── */}
        {topPerformer && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass" style={{ borderRadius: 18, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(6,182,212,0.04) 100%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🏆</span>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Performer</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Ring pct={topPerformer.pct} color="#a78bfa" size={72} stroke={6} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: '#a78bfa' }}>
                  {Math.round(topPerformer.pct)}%
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '1.15rem', color: '#f8fafc' }}>{topPerformer.name}</p>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: '#64748b' }}>{fmtHrs(topPerformer.hrs)} worked · {topPerformer.days} days</p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700 }}>
                  {Math.round(topPerformer.pct)}% of monthly target hours
                </p>
              </div>
            </div>
          </motion.div>
        )}


        {/* ── Monthly Attendance Summary ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass" style={{ borderRadius: 18, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Attendance</h3>
          </div>
          {employees.length === 0 ? (
            <p style={{ color: '#334155', fontSize: '0.85rem' }}>Add employees to see attendance stats.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Total Punches',  value: monthRecs.length,                     color: '#8b5cf6' },
                  { label: 'Days Logged',    value: new Set(monthRecs.map(r => r.date)).size, color: '#06b6d4' },
                  { label: 'Active Staff',   value: new Set(monthRecs.map(r => r.empId)).size, color: '#34d399' },
                  { label: 'Avg Hours/Day',  value: monthRecs.length > 0 ? fmtHrs(monthRecs.reduce((s,r) => s + calcHours(r.inTime,r.outTime),0) / new Set(monthRecs.map(r=>r.date)).size || 0) : '—', color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '0.65rem 0.85rem' }}>
                    <p style={{ margin: '0 0 0.15rem', fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: '#334155' }}>
                💡 Detailed salary report available at month end
              </p>
            </>
          )}
        </motion.div>
      </div>



      {/* ══ TODAY'S LIVE ACTIVITY ══ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)', animation: 'pulse-ring 1.5s ease-out infinite' }} />
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>Today's Live Activity</h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#475569', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.06)' }}>
            {format(now, 'do MMM')}
          </span>
        </div>

        {todayRecs.length === 0 ? (
          <div className="insight-card" style={{ margin: '1rem', padding: '2rem' }}>
            <div className="insight-glow" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)' }} />
            <div className="insight-icon-ring" style={{ width: 56, height: 56, borderColor: 'rgba(6,182,212,0.2)' }}>
              <Clock size={24} color="#06b6d4" />
            </div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 800 }}>No Punches Yet Today</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.8rem' }}>Attendance records for today will appear here in real-time.</p>
          </div>
        ) : (
          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {todayRecs.map((r, i) => {
              const emp = employees.find(e => e.id === r.empId);
              const hrs = calcHours(r.inTime, r.outTime);
              const st  = getStatus(r);
              const col = STATUS_COLORS[st];
              const late = r.inTime ? (() => { const [h, m] = r.inTime.split(':').map(Number); return h > 9 || (h === 9 && m > (settings?.lateGraceMins || 15)); })() : false;
              return (
                <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  style={{ background: col.bgAlpha, border: `1px solid ${col.bg}35`, borderRadius: 14, padding: '0.9rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, background: col.bg + '15', borderRadius: '50%', filter: 'blur(15px)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem' }}>{emp?.name || '—'}</p>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span className="badge" style={{ background: col.bgAlpha, color: col.text, border: `1px solid ${col.bg}40`, fontSize: '0.62rem' }}>{col.label}</span>
                      {late && <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', fontSize: '0.62rem' }}>Late</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {[['In', r.inTime || '—', '#34d399'], ['Out', r.outTime || '…', '#fbbf24']].map(([lbl, val, clr]) => (
                      <div key={lbl} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '0.3rem 0.5rem' }}>
                        <p style={{ margin: '0 0 0.1rem', fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</p>
                        <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 800, color: clr, fontSize: '0.85rem' }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {hrs > 0 && <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: col.text, fontWeight: 700 }}>{fmtHrs(hrs)} worked</p>}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ══ ATTENDANCE LEADERBOARD ══ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart2 size={16} color="#8b5cf6" />
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>Attendance Leaderboard — <span style={{ color: '#475569', fontWeight: 500, fontSize: '0.8rem' }}>{format(now, 'MMMM yyyy')}</span></h3>
        </div>

        {payroll.length === 0 ? (
          <div className="insight-card" style={{ margin: '1rem' }}>
            <div className="insight-glow" />
            <div className="insight-icon-ring"><BarChart2 size={28} color="#8b5cf6" /></div>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 800 }}>No Attendance Data Yet</h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.82rem' }}>Add employees and log attendance to see the leaderboard here.</p>
          </div>
        ) : (
          <div style={{ padding: '0.75rem' }}>
            {payroll.map((emp, i) => (
              <motion.div key={emp.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0.75rem', borderRadius: 14, marginBottom: i < payroll.length - 1 ? '0.4rem' : 0, transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {/* Rank */}
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'rgba(251,191,36,0.15)' : i === 1 ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.3)' : i === 1 ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: i === 0 ? '#fbbf24' : i === 1 ? '#a78bfa' : '#475569', flexShrink: 0 }}>
                  {i + 1}
                </div>
                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 0.1rem', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</p>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: '#475569' }}>{emp.days} days · {fmtHrs(emp.hrs)}</p>
                </div>
                {/* Hours ring + pct */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <div style={{ position: 'relative', width: 36, height: 36 }}>
                    <Ring pct={emp.pct} color={i === 0 ? '#fbbf24' : '#8b5cf6'} size={36} stroke={3} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.48rem', fontWeight: 900, color: i === 0 ? '#fbbf24' : '#a78bfa' }}>
                      {Math.round(emp.pct)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: i === 0 ? '#fbbf24' : '#a78bfa' }}>{fmtHrs(emp.hrs)}</p>
                    <p style={{ margin: 0, fontSize: '0.62rem', color: '#334155' }}>{emp.days} days</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>


    </div>
  );
};


/* ─── Employees Tab ─── */
const EmployeesTab = () => {
  const { employees, records, addEmployee, removeEmployee, settings } = useStore();
  const [name, setName]     = useState('');
  const [salary, setSalary] = useState('');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const currency  = settings?.currency || '₹';
  const targetHrs = (settings?.workingDays || 26) * (settings?.hoursPerDay || 9);
  const monthStr  = format(new Date(), 'yyyy-MM');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !salary) return;
    addEmployee({ id: Date.now().toString(), name: name.trim(), baseSalary: Number(salary) });
    setName(''); setSalary(''); setAddOpen(false);
  };

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ══ Header bar ══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.15rem', fontWeight: 900, fontSize: '1.4rem' }}>Employee <span className="tg">Management</span></h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>{employees.length} team member{employees.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
            <input className="ipt" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', width: 180 }} />
          </div>
          <button className="btn btn-v" onClick={() => setAddOpen(o => !o)}>
            <Plus size={15} /> {addOpen ? 'Cancel' : 'Add Employee'}
          </button>
        </div>
      </div>

      {/* ══ Add Form ══ */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(6,182,212,0.3))' }}>
              <div className="glass" style={{ borderRadius: 17, padding: '1.25rem 1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={16} color="#8b5cf6" /> New Employee
                </h3>
                <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Full Name</label>
                    <input className="ipt" placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Monthly Salary</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>{currency}</span>
                      <input type="number" className="ipt" placeholder="9000" value={salary} onChange={e => setSalary(e.target.value)} style={{ paddingLeft: '1.75rem' }} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-v" style={{ flex: 1 }}>Save Employee</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Employee Grid ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
        {filtered.map((emp, i) => {
          const recs = records.filter(r => r.empId === emp.id && r.date.startsWith(monthStr));
          const hrs  = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
          const pct  = targetHrs > 0 ? Math.min((hrs / targetHrs) * 100, 100) : 0;

          return (
            <Tilt key={emp.id} tiltMaxAngleX={4} tiltMaxAngleY={4} scale={1.01} transitionSpeed={2500}>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
                className="glass" style={{ borderRadius: 18, padding: '1.25rem', position: 'relative', overflow: 'hidden', height: '100%' }}>

                {/* Ambient orb */}
                <div style={{ position: 'absolute', top: -25, right: -25, width: 100, height: 100, background: 'rgba(139,92,246,0.1)', borderRadius: '50%', filter: 'blur(28px)', pointerEvents: 'none' }} />

                {/* ─ Top row ─ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                  {/* Avatar + ring */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring pct={pct} color="#8b5cf6" size={52} stroke={4} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', margin: 5, background: 'linear-gradient(135deg,#7c3aed,#0891b2)', fontWeight: 900, fontSize: '1.1rem' }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 0.1rem', fontWeight: 800, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569' }}>{currency}{emp.baseSalary.toLocaleString('en-IN')}/month</p>
                  </div>
                  <button className="btn btn-red" onClick={() => confirm(`Remove ${emp.name}?`) && removeEmployee(emp.id)}
                    style={{ padding: '0.3rem 0.5rem', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* ─ Stats chips ─ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {[
                    { label: 'Days', value: recs.length, color: '#22d3ee' },
                    { label: 'Hours', value: fmtHrs(hrs), color: '#a78bfa' },
                    { label: 'Avg H/Day', value: recs.length > 0 ? fmtHrs(hrs / recs.length) : '—', color: '#34d399' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0.45rem 0.5rem' }}>
                      <p style={{ margin: '0 0 0.1rem', fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{s.label}</p>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

              </motion.div>
            </Tilt>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            {employees.length === 0 ? (
              <div className="insight-card">
                <div className="insight-glow" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
                <div className="insight-icon-ring" style={{ borderColor: 'rgba(6,182,212,0.2)' }}>
                  <Users size={28} color="#06b6d4" />
                </div>
                <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 800 }}>Workforce is Empty</h3>
                <p style={{ margin: 0, color: '#64748b', maxWidth: 320, fontSize: '0.83rem' }}>Click “Add Employee” above to onboard your first team member.</p>
              </div>
            ) : (
              <p style={{ color: '#475569', textAlign: 'center', padding: '3rem', fontSize: '0.85rem' }}>No results for “{search}”</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


/* ─── Settings Tab ─── */
const SettingsTab = () => {
  const { settings, updateSettings } = useStore();

  const defaults = {
    workingDays: 26, hoursPerDay: 9, overtimeRate: 1.0,
    lateGraceMins: 15, currency: '₹', officeStartTime: '09:00',
    ...settings,
  };

  const [st, setSt]   = useState(defaults);
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

  const sectionStyle = { borderRadius: 18, overflow: 'hidden', marginBottom: '1rem' };
  const sectionHead  = (icon, title, subtitle, color) => (
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
          <h2 style={{ margin: '0 0 0.15rem', fontWeight: 900, fontSize: '1.4rem' }}>Workspace <span className="tg">Settings</span></h2>
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

      {/* Formula info banner */}
      <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 14, padding: '0.85rem 1.25rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <BarChart2 size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
          Salary formula:
          <code style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', padding: '1px 7px', borderRadius: 5, marginLeft: '0.4rem', fontSize: '0.75rem' }}>(Base ÷ Target Hours) × Worked Hours</code>
        </p>
      </div>

      {/* ═ Section 1: Payroll ═ */}
      <div className="glass" style={sectionStyle}>
        {sectionHead(<Clock size={14} color="#8b5cf6" />, 'Payroll & Hours', 'Cycle: 1st to Month End', '#8b5cf6')}
        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.1rem' }}>
          <Field label="Salary Cycle" hint="Applied to all attendance & payroll on the 1st">
            <input type="text" className="ipt" value="1st to Month End" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
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
            <input type="number" className="ipt" min={1} max={31} value={st.workingDays}
              onChange={e => setSt({ ...st, workingDays: Number(e.target.value) })} />
          </Field>
          <Field label="Required Hours / Day">
            <input type="number" className="ipt" min={1} max={24} step={0.5} value={st.hoursPerDay}
              onChange={e => setSt({ ...st, hoursPerDay: Number(e.target.value) })} />
          </Field>
          <Field label="Overtime Multiplier" hint="Applied beyond required daily hours">
            <div style={{ position: 'relative' }}>
              <input type="number" step="0.1" min={1} className="ipt" value={st.overtimeRate}
                onChange={e => setSt({ ...st, overtimeRate: parseFloat(e.target.value) })} style={{ paddingRight: '2.2rem' }} />
              <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 800 }}>x</span>
            </div>
          </Field>
        </div>

        {/* Target load pill */}
        <div style={{ margin: '0 1.25rem 1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700 }}>Monthly Target Load</p>
          <p style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem' }}>
            <span className="tg">{st.workingDays * st.hoursPerDay}h</span>
          </p>
        </div>
      </div>

      {/* ═ Section 2: Office Timing ═ */}
      <div className="glass" style={sectionStyle}>
        {sectionHead(<Calendar size={14} color="#06b6d4" />, 'Office Timing', 'Used to auto-detect late arrivals', '#06b6d4')}
        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.1rem' }}>
          <Field label="Office Opens At (Start Time)" hint="Late detection is based on this time ± grace period">
            <input type="time" className="ipt in-time" value={st.officeStartTime}
              onChange={e => setSt({ ...st, officeStartTime: e.target.value })}
              style={{ fontFamily: 'monospace', fontWeight: 700 }} />
          </Field>
          <Field label="Late Grace Period" hint="Minutes after office start before marked Late">
            <div style={{ position: 'relative' }}>
              <input type="number" className="ipt" min={0} max={120} value={st.lateGraceMins}
                onChange={e => setSt({ ...st, lateGraceMins: parseInt(e.target.value) })}
                style={{ paddingRight: '2.8rem' }} />
              <span style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>min</span>
            </div>
          </Field>
        </div>
        {/* Preview */}
        <div style={{ margin: '0 1.25rem 1.25rem', background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.18)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          🕒 Office hours: <strong style={{ color: '#22d3ee' }}>{st.officeStartTime}</strong> —
          employees arriving after <strong style={{ color: '#fbbf24' }}>{(() => { const [h, m] = st.officeStartTime.split(':').map(Number); const total = h * 60 + m + (st.lateGraceMins || 0); return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`; })()}</strong> will be marked <span style={{ color: '#fbbf24', fontWeight: 700 }}>Late</span>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-v" onClick={handleSave} style={{ padding: '0.8rem 1.8rem', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }}>
          <CheckCircle2 size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
};



/* ─── Attendance Tab ─── */
const AttendanceTab = () => {
  const { employees, records, addRecords, deleteRecord, settings } = useStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [drafts, setDrafts] = useState({});
  const [saved, setSaved]   = useState({});

  const setDraft = (empId, field, val) =>
    setDrafts(d => ({ ...d, [empId]: { ...(d[empId] || {}), [field]: val } }));

  useEffect(() => {
    const initial = {};
    employees.forEach(emp => {
      const rec = records.find(r => r.empId === emp.id && r.date === date);
      initial[emp.id] = rec
        ? { inTime: rec.inTime || '', outTime: rec.outTime || '' }
        : { inTime: '', outTime: '' };
    });
    setDrafts(initial);
    setSaved({});
  }, [date, employees, records]);

  const calcHrs = (inT, outT) => {
    if (!inT || !outT) return 0;
    const [ih, im] = inT.split(':').map(Number);
    const [oh, om] = outT.split(':').map(Number);
    return Math.max(0, (oh + om / 60) - (ih + im / 60));
  };

  const getStatus = (inT, outT) => {
    if (!inT) return { key: 'empty',   label: 'Not Set',  color: '#334155', bg: 'rgba(51,65,85,0.15)',    glow: 'transparent' };
    if (!outT) return { key: 'partial', label: 'Active',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.3)' };
    const hrs = calcHrs(inT, outT);
    if (hrs >= 9)   return { key: 'overtime', label: 'Overtime', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  glow: 'rgba(34,211,238,0.4)' };
    if (hrs >= 4.5) return { key: 'full',     label: 'Full Day', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  glow: 'rgba(52,211,153,0.4)' };
    return             { key: 'half',         label: 'Half Day', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  glow: 'rgba(251,191,36,0.4)' };
  };

  const isLate = (inT) => {
    if (!inT) return false;
    const [h, m] = inT.split(':').map(Number);
    const grace = settings?.lateGraceMins || 15;
    return h > 9 || (h === 9 && m > grace);
  };

  const saveRow = (emp) => {
    const d = drafts[emp.id] || {};
    if (!d.inTime || !d.outTime) return;
    addRecords([{ id: `${emp.id}-${date}`, empId: emp.id, date, inTime: d.inTime, outTime: d.outTime, source: 'manual' }]);
    setSaved(s => ({ ...s, [emp.id]: true }));
    setTimeout(() => setSaved(s => { const n = { ...s }; delete n[emp.id]; return n; }), 2500);
  };

  const clearRow = (empId) => {
    const rec = records.find(r => r.empId === empId && r.date === date);
    if (rec) deleteRecord(rec.id);
    setDrafts(d => ({ ...d, [empId]: { inTime: '', outTime: '' } }));
  };

  const saveAll = () => employees.forEach(emp => {
    const d = drafts[emp.id] || {};
    if (d.inTime && d.outTime) saveRow(emp);
  });

  const prevDay = () => setDate(d => format(new Date(new Date(d).getTime() - 86400000), 'yyyy-MM-dd'));
  const nextDay = () => setDate(d => format(new Date(new Date(d).getTime() + 86400000), 'yyyy-MM-dd'));

  const filledCount = employees.filter(e => { const d = drafts[e.id] || {}; return d.inTime && d.outTime; }).length;
  const fillPct = employees.length > 0 ? (filledCount / employees.length) * 100 : 0;
  const dateObj = new Date(date + 'T00:00:00');
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const currency = settings?.currency || '₹';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: '0 0 0.15rem', fontWeight: 900, fontSize: '1.4rem' }}>
            Daily <span className="tg">Attendance</span>
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
            Tap a card · Set In & Out time · Save
          </p>
        </div>

        {/* Date Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={prevDay} style={{ padding: '0.45rem' }}><ChevronLeft size={16} /></button>
          <input type="date" className="ipt" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: 148, textAlign: 'center', fontWeight: 700 }} />
          <button className="btn btn-ghost" onClick={nextDay} style={{ padding: '0.45rem' }}><ChevronRight size={16} /></button>
          {date === today && <span className="badge" style={{ background: 'rgba(139,92,246,0.18)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>Today</span>}
        </div>
      </div>

      {/* ══ DATE SUMMARY BAR ══ */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: '1px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(6,182,212,0.3))' }}>
        <div className="glass" style={{ borderRadius: 17, padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 0.1rem', fontWeight: 900, fontSize: '1.05rem', color: '#f8fafc' }}>
              {format(dateObj, 'EEEE, MMMM do')}
            </p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
              {isWeekend ? '🌴 Weekend' : `${filledCount} of ${employees.length} filled`}
              {isWeekend ? '' : ` · Cycle: 1st – Month End`}
            </p>
          </div>
          {!isWeekend && employees.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Fill progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${fillPct}%` }} transition={{ duration: 0.8 }}
                    style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', whiteSpace: 'nowrap' }}>{Math.round(fillPct)}%</span>
              </div>
              <button className="btn btn-v" onClick={saveAll} style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: 800 }}>
                <CheckCircle2 size={14} /> Save All
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ══ EMPLOYEE CARDS / EMPTY STATE ══ */}
      {employees.length === 0 ? (
        <div className="insight-card">
          <div className="insight-glow" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
          <div className="insight-icon-ring" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
            <ClipboardList size={30} color="#10b981" />
          </div>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 800 }}>Attendance Locked</h3>
          <p style={{ margin: 0, color: '#64748b', maxWidth: 320, fontSize: '0.83rem' }}>
            Add at least one employee via the Employees tab to begin logging attendance.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
          {employees.map((emp, i) => {
            const d    = drafts[emp.id] || {};
            const inT  = d.inTime  || '';
            const outT = d.outTime || '';
            const hrs  = calcHrs(inT, outT);
            const st   = getStatus(inT, outT);
            const late = isLate(inT);
            const isSv = saved[emp.id];
            const pct  = Math.min((hrs / (settings?.hoursPerDay || 9)) * 100, 100);

            return (
              <motion.div key={emp.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{
                  borderRadius: 18,
                  background: isSv ? 'rgba(52,211,153,0.06)' : st.bg,
                  border: `1px solid ${isSv ? 'rgba(52,211,153,0.3)' : st.color + '30'}`,
                  padding: '1.1rem',
                  position: 'relative', overflow: 'hidden',
                  transition: 'background 0.35s, border-color 0.35s',
                  boxShadow: st.key !== 'empty' ? `0 4px 20px -8px ${st.glow}` : 'none',
                }}>

                {/* Ambient corner glow */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: st.color + '18', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }} />

                {/* ── Top row: avatar + name + status ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
                  {/* Avatar with progress ring */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring pct={pct} color={st.color} size={44} stroke={3} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '0.9rem',
                      background: 'linear-gradient(135deg,#6d28d9,#0e7490)',
                      borderRadius: '50%', margin: 4 }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 0.15rem', fontWeight: 800, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40`, fontSize: '0.6rem', boxShadow: `0 0 6px ${st.glow}` }}>
                        {st.key === 'full' && hrs > 9 ? 'Overtime' : st.label}
                      </span>
                      {late && <span className="badge" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', fontSize: '0.6rem' }}>Late</span>}
                      {isSv  && <span className="badge" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', fontSize: '0.6rem' }}>✓ Saved</span>}
                    </div>
                  </div>
                  {/* Hours chip */}
                  {hrs > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: st.color, lineHeight: 1 }}>{Math.floor(hrs)}h</p>
                      <p style={{ margin: 0, fontSize: '0.62rem', color: '#475569' }}>{Math.round((hrs % 1) * 60)}m</p>
                    </div>
                  )}
                </div>

                {/* ── Time inputs ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.7rem' }}>
                  {[
                    { label: 'In Time ✦',  field: 'inTime',  cls: 'in-time',  val: inT  },
                    { label: 'Out Time',   field: 'outTime', cls: 'out-time', val: outT },
                  ].map(({ label, field, cls, val }) => (
                    <div key={field}>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.07em' }}>{label}</p>
                      <input type="time" value={val}
                        onChange={e => setDraft(emp.id, field, e.target.value)}
                        className={`ipt ${cls}`}
                        style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', padding: '0.5rem 0.6rem' }} />
                    </div>
                  ))}
                </div>

                {/* ── Action row ── */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="btn btn-v" onClick={() => saveRow(emp)} disabled={!inT || !outT}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 800 }}>
                    <CheckCircle2 size={13} /> {isSv ? '✓ Saved' : 'Save'}
                  </button>
                  {(inT || outT) && (
                    <button className="btn btn-red" onClick={() => clearRow(emp.id)}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};


const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'calendar',   label: 'Calendar',   icon: Calendar },
  { id: 'ocr',        label: 'OCR Upload', icon: Scan },
  { id: 'employees',  label: 'Employees',  icon: Users },
  { id: 'reports',    label: 'Reports',    icon: BarChart2 },
  { id: 'settings',   label: 'Settings',   icon: Settings2 },
];

/* ─── Mobile-responsive Dashboard ─── */
const Dashboard = () => {
  const [tab, setTab] = useState('attendance');
  const [sideOpen, setSideOpen] = useState(false);

  const closeSide = () => setSideOpen(false);

  const SidebarContent = () => (
    <>
      <div style={{ padding: '0 0.5rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="tg" style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>NexusPay</h1>
          <p style={{ fontSize: '0.6rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '2px 0 0' }}>HR Platform</p>
        </div>
        <button onClick={closeSide} className="btn btn-ghost sidebar-close" style={{ padding: '0.4rem' }}><X size={16} /></button>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); closeSide(); }}
              className={`navlink ${on ? 'on' : ''}`}>
              <Icon size={15} style={{ color: on ? '#c4b5fd' : '#475569', flexShrink: 0 }} />
              {t.label}
            </button>
          );
        })}
      </nav>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.25rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>A</div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700 }}>Admin</p>
            <p style={{ margin: 0, fontSize: '0.62rem', color: '#475569' }}>NexusPay HR</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-layout">
      {/* ── Desktop sidebar ── */}
      <motion.aside
        initial={{ x: -250, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        className="glass desktop-sidebar"
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile overlay sidebar ── */}
      <AnimatePresence>
        {sideOpen && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeSide}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }} />
            <motion.aside key="mobile-side" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="glass mobile-sidebar">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <div className="app-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button onClick={() => setSideOpen(true)} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
            <Menu size={20} />
          </button>
          <h1 className="tg" style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>NexusPay</h1>
          <div style={{ width: 36 }} />{/* spacer */}
        </div>

        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {tab === 'overview'   && <Overview />}
              {tab === 'attendance' && <AttendanceTab />}
              {tab === 'calendar'   && <CalendarView />}
              {tab === 'ocr'        && <OCRUpload />}
              {tab === 'employees'  && <EmployeesTab />}
              {tab === 'reports'    && <Reports />}
              {tab === 'settings'   && <SettingsTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile bottom nav */}
        <nav className="mobile-bottom-nav">
          {TABS.slice(0, 5).map(t => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.6rem 0.2rem', color: on ? '#c4b5fd' : '#475569', fontFamily: 'inherit', fontSize: '0.6rem', fontWeight: on ? 700 : 400, transition: 'color 0.15s' }}>
                <Icon size={18} style={{ color: on ? '#c4b5fd' : '#475569' }} />
                {t.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

/* ─── Root — no login, direct to dashboard ─── */
const App = () => {
  const { user, login } = useStore();

  // Auto-login as admin on mount
  useEffect(() => {
    if (!user) login(ADMIN);
  }, []);

  return (
    <BrowserRouter>
      <AmbientBg />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </motion.div>
      </div>
    </BrowserRouter>
  );
};

export default App;
