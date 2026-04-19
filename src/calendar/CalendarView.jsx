import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { ChevronLeft, ChevronRight, X, UserCheck, Clock, Calendar, AlertCircle } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday
} from 'date-fns';
import { calcHours, getStatus, STATUS_COLORS, isLate, fmtHrs } from '../utils/calc';
import useStore from '../store/useAppStore';

/* ── mobile hook ── */
const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 900);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

/* ──────────────────────────────────────
   Day Detail Bottom Sheet / Side Panel
────────────────────────────────────── */
const DayPanel = ({ date, records, employees, onClose, isMobile }) => {
  if (!date) return null;
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayRecs = records.filter(r => r.date === dateStr);

  const RecordRow = ({ rec }) => {
    const emp = employees.find(e => e.id === rec.empId);
    const hrs = calcHours(rec.inTime, rec.outTime);
    const st = getStatus(rec);
    const col = STATUS_COLORS[st];
    const late = isLate(rec.inTime);
    return (
      <div style={{ background: col.bgAlpha, border: `1px solid ${col.bg}30`, borderRadius: 14, padding: '0.9rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: col.bg + '15', filter: 'blur(15px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>{emp?.name || 'Unknown'}</span>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: col.bgAlpha, color: col.text, border: `1px solid ${col.bg}40`, boxShadow: `0 0 6px ${col.bg}40` }}>{col.label}</span>
            {late && <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 0 6px rgba(251,191,36,0.2)' }}>Late</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
          {[['In', rec.inTime || '—', '#34d399'], ['Out', rec.outTime || '—', '#fbbf24'], ['Hrs', hrs ? fmtHrs(hrs) : '—', '#c084fc']].map(([lbl, val, clr]) => (
            <div key={lbl} style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: '0.45rem 0.6rem', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: clr, textShadow: `0 0 8px ${clr}40` }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PanelContent = () => (
    <>
      {isMobile && <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 1.25rem' }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '1.1rem', WebkitTextFillColor: 'transparent', background: 'linear-gradient(to right, #f8fafc, #cbd5e1)', WebkitBackgroundClip: 'text' }}>
            {format(date, 'EEEE')}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>{format(date, 'MMMM do, yyyy')}</p>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}><X size={16} /></button>
      </div>

      {dayRecs.length === 0 ? (
        <div className="insight-card" style={{ padding: '2rem 1rem' }}>
          <div className="insight-icon-ring" style={{ width: 48, height: 48, marginBottom: '1rem', borderColor: 'rgba(255,255,255,0.1)' }}>
            <Calendar size={20} style={{ opacity: 0.5 }} color="#94a3b8" />
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>No attendance records<br />for this day</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dayRecs.map(rec => <RecordRow key={rec.id} rec={rec} />)}
        </div>
      )}
    </>
  );

  /* Mobile: bottom sheet */
  if (isMobile) return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(2,9,23,0.85)', zIndex: 200, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{ background: 'rgba(13,18,32,0.95)', backdropFilter: 'blur(20px)', position: 'fixed', bottom: 56, left: 0, right: 0, zIndex: 201, borderRadius: '24px 24px 0 0', padding: '1.25rem', maxHeight: '76vh', overflowY: 'auto', boxShadow: '0 -20px 60px rgba(99,102,241,0.2)', borderTop: '1px solid rgba(99,102,241,0.3)' }}>
        <PanelContent />
      </motion.div>
    </>
  );

  /* Desktop: side panel */
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      className="glass"
      style={{ borderRadius: 24, padding: '1.75rem', width: 310, flexShrink: 0, position: 'sticky', top: 12, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.03)' }}>
      <PanelContent />
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN: CalendarView
═══════════════════════════════════════════════════════ */
const CalendarView = () => {
  const { employees, records, settings } = useStore();
  const isMobile = useIsMobile();

  const [current, setCurrent] = useState(new Date());
  const [selectedEmp, setSelectedEmp] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStr = format(current, 'yyyy-MM');
  const monthStart = startOfMonth(current);
  const monthEndStr = format(endOfMonth(monthStart), 'yyyy-MM-dd');
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  const prev = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const visibleEmployees = useMemo(() => {
    return employees.filter(emp => !emp.joinDate || emp.joinDate <= monthEndStr);
  }, [employees, monthEndStr]);

  /* Filtered records */
  const visibleRecs = useMemo(() =>
    records.filter(r => {
      if (!r.date.startsWith(monthStr)) return false;
      if (selectedEmp !== 'all' && r.empId !== selectedEmp) return false;
      const emp = employees.find(e => e.id === r.empId);
      if (!emp) return false;
      if (emp.joinDate && r.date < emp.joinDate) return false;
      return true;
    }),
    [records, monthStr, selectedEmp, employees]
  );

  const dateMap = useMemo(() => {
    const m = {};
    visibleRecs.forEach(r => { m[r.date] = m[r.date] || []; m[r.date].push(r); });
    return m;
  }, [visibleRecs]);

  /* Per-employee month stats */
  const empStats = useMemo(() => {
    if (selectedEmp === 'all') return null;
    const emp = employees.find(e => e.id === selectedEmp);
    if (!emp) return null;
    const recs = records.filter(r => r.empId === selectedEmp && r.date.startsWith(monthStr));
    const totalHrs = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
    const targetHrs = (settings?.workingDays || 26) * (settings?.hoursPerDay || 9);
    const earned = ((emp.baseSalary / targetHrs) * totalHrs).toFixed(0);
    return { emp, count: recs.length, totalHrs, targetHrs, earned, currency: settings?.currency || '₹' };
  }, [selectedEmp, records, monthStr, employees, settings]);

  const handleDayClick = (day) => {
    if (!isSameMonth(day, current)) return;
    setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day);
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── Top Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(10,14,28,0.5)', padding: '1rem 1.5rem', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button className="btn btn-ghost" onClick={prev} style={{ padding: '0.4rem 0.6rem', borderRadius: 10 }}><ChevronLeft size={20} /></button>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '1.25rem' : '1.75rem', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {format(current, isMobile ? 'MMM yyyy' : 'MMMM yyyy')}
            </h2>
            <button className="btn btn-ghost" onClick={next} style={{ padding: '0.4rem 0.6rem', borderRadius: 10 }}><ChevronRight size={20} /></button>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
              <select className="ipt" value={selectedEmp}
                onChange={e => { setSelectedEmp(e.target.value); setSelectedDay(null); }}
                style={{ paddingLeft: '1.25rem', appearance: 'none', background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(212,175,55,0.2)' }}>
                <option value="all">👁️ All Employees Overview</option>
                {visibleEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#D4AF37' }}>
                <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.03)' }}>
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'present').map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.bg, boxShadow: `0 0 8px ${v.bg}aa` }} />
              {v.label}
            </div>
          ))}
        </div>

        {/* ── Per-employee stats ── */}
        <AnimatePresence>
          {empStats && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '0.85rem', paddingTop: '0.2rem' }}>
                {[
                  { label: 'Present', value: empStats.count, color: '#34d399', icon: '🏃' },
                  { label: 'Hours', value: fmtHrs(empStats.totalHrs), color: '#a78bfa', icon: '⏱️' },
                  { label: 'Target', value: `${empStats.targetHrs}h`, color: '#64748b', icon: '🎯' },
                  { label: 'Est. Earned', value: `${empStats.currency}${Number(empStats.earned).toLocaleString('en-IN')}`, color: '#fbbf24', icon: '💰' },
                ].map((s, i) => (
                  <Tilt key={s.label} tiltMaxAngleX={8} tiltMaxAngleY={8} scale={1.03}>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="glass" style={{ borderRadius: 16, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: '50%', background: s.color + '20', filter: 'blur(20px)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>{s.icon}</span>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.06em' }}>{s.label}</p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: s.color, textShadow: `0 0 10px ${s.color}60` }}>{s.value}</p>
                    </motion.div>
                  </Tilt>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendar Grid ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(2,9,23,0.8) 100%)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: isMobile ? '1rem' : '1.75rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: 850, margin: '0 auto', width: '100%' }}>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.3rem', marginBottom: '0.6rem' }}>
            {(isMobile
              ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            ).map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 800, color: (i === 0 || i === 6) ? '#f43f5e' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.4rem', opacity: (i === 0 || i === 6) ? 0.8 : 1 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.35rem' }}>
            {days.map((day, i) => {
              const inMon = isSameMonth(day, current);
              const today = isToday(day);
              const sel = selectedDay && isSameDay(day, selectedDay);
              const dateStr = format(day, 'yyyy-MM-dd');
              const recs = dateMap[dateStr] || [];
              const isWknd = day.getDay() === 0 || day.getDay() === 6;
              const dots = recs.slice(0, 3).map(r => STATUS_COLORS[getStatus(r)]?.bg || '#fff');

              return (
                <motion.div key={i}
                  whileHover={inMon ? { scale: 1.05, y: -2 } : {}}
                  whileTap={inMon ? { scale: 0.95 } : {}}
                  onClick={() => handleDayClick(day)}
                  style={{
                    minHeight: isMobile ? 55 : 85, borderRadius: isMobile ? 10 : 14,
                    border: sel ? '2px solid rgba(212,175,55,0.9)'
                      : today ? '2px solid rgba(99,102,241,0.6)'
                        : '1px solid rgba(255,255,255,0.03)',
                    background: sel ? 'rgba(212,175,55,0.15)'
                      : today ? 'rgba(99,102,241,0.15)'
                        : isWknd && inMon ? 'rgba(244,63,94,0.03)' : 'rgba(255,255,255,0.02)',
                    opacity: inMon ? 1 : 0.08,
                    cursor: inMon ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0.35rem', position: 'relative',
                    boxShadow: sel ? '0 0 20px rgba(212,175,55,0.2)' : today ? 'inset 0 0 15px rgba(99,102,241,0.2)' : 'none',
                  }}>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '0.9rem', fontWeight: today || sel ? 900 : 600, color: sel ? '#D4AF37' : today ? '#818cf8' : '#e2e8f0', lineHeight: 1, zIndex: 2 }}>
                    {format(day, 'd')}
                  </span>

                  {/* Dots */}
                  {inMon && dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 'auto', paddingTop: 4, zIndex: 2 }}>
                      {dots.map((c, di) => (
                        <div key={di} style={{ width: isMobile ? 5 : 6, height: isMobile ? 5 : 6, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />
                      ))}
                      {recs.length > 3 && <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>+{recs.length - 3}</span>}
                    </div>
                  )}
                  {/* Absent dot (single employee) */}
                  {inMon && selectedEmp !== 'all' && !isWknd && day <= new Date() && recs.length === 0 && (
                    <div style={{ width: isMobile ? 5 : 6, height: isMobile ? 5 : 6, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.8)', marginTop: 'auto', zIndex: 2 }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </div>

      {/* ── Desktop Side Panel ── */}
      {!isMobile && (
        <AnimatePresence>
          {selectedDay ? (
            <DayPanel key={format(selectedDay, 'yyyy-MM-dd')} date={selectedDay} records={visibleRecs} employees={employees} onClose={() => setSelectedDay(null)} isMobile={false} />
          ) : (
            <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass"
              style={{ borderRadius: 24, padding: '2.5rem 1.5rem', width: 310, flexShrink: 0, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', justifyContent: 'center', minHeight: 250, position: 'sticky', top: 12 }}>
              <div className="insight-icon-ring" style={{ width: 64, height: 64, borderColor: 'rgba(212,175,55,0.2)', marginBottom: '0.5rem' }}>
                <Calendar size={28} color="#D4AF37" />
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 600 }}>Click any specific date<br />to view detailed attendance</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Mobile Bottom Sheet ── */}
      {isMobile && (
        <AnimatePresence>
          {selectedDay && (
            <DayPanel key={format(selectedDay, 'yyyy-MM-dd')} date={selectedDay} records={visibleRecs} employees={employees} onClose={() => setSelectedDay(null)} isMobile={true} />
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default CalendarView;
