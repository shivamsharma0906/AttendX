import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Calendar, AlertCircle
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday
} from 'date-fns';
import useAppStore from '../store/useAppStore';

/* ── mobile hook ── */
const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

/* ── status config ── */
const STATUS = {
  full: { label: 'Full Day', color: '#34d399', glow: 'rgba(52,211,153,0.5)', bg: 'rgba(52,211,153,0.1)' },
  half: { label: 'Half Day', color: '#fbbf24', glow: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.1)' },
  short: { label: 'Short', color: '#f87171', glow: 'rgba(248,113,113,0.5)', bg: 'rgba(248,113,113,0.1)' },
  absent: { label: 'Absent', color: '#f43f5e', glow: 'rgba(244,63,94,0.5)', bg: 'rgba(244,63,94,0.1)' },
  active: { label: 'Active', color: '#a78bfa', glow: 'rgba(167,139,250,0.5)', bg: 'rgba(167,139,250,0.1)' },
  weekend: { label: 'Weekend', color: '#334155', glow: 'transparent', bg: 'transparent' },
  future: { label: 'Future', color: '#334155', glow: 'transparent', bg: 'transparent' },
};

const calcStatus = (dateStr, records, empId) => {
  if (!empId) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return { ...STATUS.weekend, key: 'weekend' };
  if (d > new Date()) return { ...STATUS.future, key: 'future' };
  const rec = records.find(r => r.empId === empId && r.date === dateStr);
  if (!rec) return { ...STATUS.absent, key: 'absent', hint: 'No punch recorded' };
  if (rec.inTime && rec.outTime) {
    const [ih, im] = rec.inTime.split(':').map(Number);
    const [oh, om] = rec.outTime.split(':').map(Number);
    let hrs = (oh + om / 60) - (ih + im / 60);
    if (hrs < 0) hrs += 24;
    if (hrs >= 9) return { ...STATUS.full, key: 'full', hrs, rec };
    if (hrs >= 4.5) return { ...STATUS.half, key: 'half', hrs, rec };
    return { ...STATUS.short, key: 'short', hrs, rec };
  }
  return { ...STATUS.active, key: 'active', rec };
};

/* ── Month Stat Chips ── */
const MonthStats = ({ empId, records, currentDate, settings }) => {
  const stats = useMemo(() => {
    if (!empId) return null;
    const monthStr = format(currentDate, 'yyyy-MM');
    const recs = records.filter(r => r.empId === empId && r.date.startsWith(monthStr));
    let total = 0, full = 0, half = 0, absent = 0;
    const start = startOfMonth(currentDate);
    const end = new Date(Math.min(endOfMonth(currentDate).getTime(), Date.now()));
    eachDayOfInterval({ start, end }).forEach(d => {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return;
      const ds = format(d, 'yyyy-MM-dd');
      const rec = recs.find(r => r.date === ds);
      if (!rec) { absent++; return; }
      if (rec.inTime && rec.outTime) {
        const [ih, im] = rec.inTime.split(':').map(Number);
        const [oh, om] = rec.outTime.split(':').map(Number);
        let hrs = (oh + om / 60) - (ih + im / 60);
        if (hrs < 0) hrs += 24;
        total += hrs;
        if (hrs >= 9) full++;
        else if (hrs >= 4.5) half++;
      }
    });
    return { total, full, half, absent };
  }, [empId, records, currentDate]);

  if (!stats) return null;
  const chips = [
    { label: 'Full', value: stats.full, color: STATUS.full.color },
    { label: 'Half', value: stats.half, color: STATUS.half.color },
    { label: 'Absent', value: stats.absent, color: STATUS.absent.color },
    { label: 'Hours', value: `${stats.total.toFixed(0)}h`, color: '#a78bfa' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {chips.map(c => (
        <div key={c.label} className="glass" style={{ borderRadius: 14, padding: '0.65rem 0.5rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: c.color }}>{c.value}</p>
          <p style={{ margin: 0, fontSize: '0.58rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{c.label}</p>
        </div>
      ))}
    </motion.div>
  );
};

/* ── Day Detail Panel content ── */
const DetailContent = ({ info, onClose, pullHandle }) => {
  const st = info?.statusData;
  const isWknd = st?.key === 'weekend';
  const isFut = st?.key === 'future';

  return (
    <>
      {pullHandle && <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, margin: '0 auto 1.25rem' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '1.15rem' }}>{format(info.date, 'EEEE')}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>{format(info.date, 'MMMM do, yyyy')}</p>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}><X size={16} /></button>
      </div>

      {isWknd || isFut ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{isWknd ? '🌴' : '🔮'}</div>
          <p style={{ color: '#475569', margin: 0, fontSize: '0.9rem' }}>{isWknd ? 'Weekend — Rest Day' : 'Future date'}</p>
        </div>
      ) : !st ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#475569' }}>
          <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Select an employee to see status</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: st.bg, border: `1px solid ${st.color}30`, borderRadius: 14, padding: '0.85rem 1rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, boxShadow: `0 0 8px ${st.glow}`, flexShrink: 0 }} />
            <span style={{ fontWeight: 800, color: st.color, fontSize: '0.95rem' }}>{st.label}</span>
          </div>

          {/* Times */}
          {st.rec && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[['In Time', st.rec.inTime || '—', '#34d399'], ['Out Time', st.rec.outTime || '—', '#fbbf24']].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '0.7rem 0.9rem' }}>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</p>
                  <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', color: clr }}>{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Hours */}
          {st.hrs != null && (
            <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(6,182,212,0.08))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: '0.9rem', textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg,#a78bfa,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {st.hrs.toFixed(1)}h
              </p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hours Logged</p>
            </div>
          )}

          {/* Absent */}
          {st.key === 'absent' && (
            <div style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={15} color="#f43f5e" />
              <p style={{ margin: 0, color: '#f87171', fontSize: '0.82rem' }}>{st.hint}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

/* ══════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════ */
const CalendarSystem = () => {
  const { employees, records, role, user, settings } = useAppStore();
  const isMobile = useIsMobile();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmp, setSelectedEmp] = useState(role === 'admin' ? '' : (user?.id || ''));
  const [selectedInfo, setSelectedInfo] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  const prev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleDay = (day) => {
    if (!isSameMonth(day, currentDate)) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const statusData = calcStatus(dateStr, records, selectedEmp);
    if (selectedInfo && isSameDay(selectedInfo.date, day)) { setSelectedInfo(null); return; }
    setSelectedInfo({ date: day, dateStr, statusData });
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

      {/* ── Calendar Column ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button className="btn btn-ghost" onClick={prev} style={{ padding: '0.4rem' }}><ChevronLeft size={18} /></button>
            <h2 className="tg" style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '1.05rem' : '1.45rem', whiteSpace: 'nowrap' }}>
              {format(currentDate, isMobile ? 'MMM yyyy' : 'MMMM yyyy')}
            </h2>
            <button className="btn btn-ghost" onClick={next} style={{ padding: '0.4rem' }}><ChevronRight size={18} /></button>
          </div>

          {role === 'admin' && (
            <select className="ipt" value={selectedEmp}
              onChange={e => { setSelectedEmp(e.target.value); setSelectedInfo(null); }}
              style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? '100%' : 210 }}>
              <option value="">— All / No Filter —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {[['full', 'Full'], ['half', 'Half'], ['absent', 'Absent'], ['active', 'Active'], ['short', 'Short']].map(([k, lbl]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#94a3b8' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS[k].color, boxShadow: `0 0 4px ${STATUS[k].glow}` }} />
              {lbl}
            </div>
          ))}
        </div>

        {/* ── Stats ── */}
        {selectedEmp && <MonthStats empId={selectedEmp} records={records} currentDate={currentDate} settings={settings} />}

        {/* ── Grid ── */}
        <motion.div className="glass" layout style={{ borderRadius: 20, padding: isMobile ? '0.85rem' : '1.2rem', overflow: 'hidden' }}>
          {/* Weekday labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.2rem', marginBottom: '0.4rem' }}>
            {(isMobile
              ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
              : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            ).map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? '0.6rem' : '0.65rem', fontWeight: 800, color: (i === 0 || i === 6) ? '#2d3748' : '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.25rem' }}>
            {days.map((day, idx) => {
              const inMon = isSameMonth(day, currentDate);
              const today = isToday(day);
              const sel = selectedInfo && isSameDay(day, selectedInfo.date);
              const dateStr = format(day, 'yyyy-MM-dd');
              const st = selectedEmp && inMon ? calcStatus(dateStr, records, selectedEmp) : null;
              const isWknd = day.getDay() === 0 || day.getDay() === 6;

              return (
                <motion.div key={idx}
                  whileHover={inMon ? { scale: 1.1 } : {}}
                  whileTap={inMon ? { scale: 0.92 } : {}}
                  onClick={() => handleDay(day)}
                  style={{
                    aspectRatio: 1, borderRadius: isMobile ? 8 : 12,
                    border: sel ? '1.5px solid rgba(139,92,246,0.85)'
                      : today ? '1.5px solid rgba(139,92,246,0.45)'
                        : '1px solid rgba(255,255,255,0.04)',
                    background: sel ? 'rgba(139,92,246,0.22)'
                      : today ? 'rgba(139,92,246,0.1)'
                        : (st && !isWknd && st.key !== 'future' && st.key !== 'weekend') ? st.bg
                          : isWknd && inMon ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
                    opacity: inMon ? 1 : 0.12,
                    cursor: inMon ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                    transition: 'all 0.18s',
                  }}>
                  <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: today ? 900 : 500, color: today ? '#c4b5fd' : sel ? '#e2d9f3' : '#94a3b8', lineHeight: 1 }}>
                    {format(day, 'd')}
                  </span>

                  {st && inMon && !isWknd && st.key !== 'future' && st.key !== 'weekend' && (
                    <div style={{ position: 'absolute', bottom: isMobile ? 2 : 4, right: isMobile ? 2 : 4, width: isMobile ? 5 : 7, height: isMobile ? 5 : 7, borderRadius: '50%', background: st.color, boxShadow: `0 0 6px ${st.glow}` }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {!selectedInfo && !isMobile && (
          <p style={{ color: '#2d3748', fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>Click any date to view attendance details</p>
        )}
      </div>

      {/* ── Desktop side panel ── */}
      {!isMobile && (
        <AnimatePresence>
          {selectedInfo ? (
            <motion.div key={selectedInfo.dateStr} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="glass" style={{ borderRadius: 20, padding: '1.5rem', width: 290, flexShrink: 0 }}>
              <DetailContent info={selectedInfo} onClose={() => setSelectedInfo(null)} pullHandle={false} />
            </motion.div>
          ) : (
            <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass"
              style={{ borderRadius: 20, padding: '2rem 1.5rem', width: 290, flexShrink: 0, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', minHeight: 200 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={22} color="#334155" />
              </div>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.85rem', lineHeight: 1.6 }}>Click any date<br />to view details</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Mobile bottom sheet ── */}
      {isMobile && (
        <AnimatePresence>
          {selectedInfo && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedInfo(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, backdropFilter: 'blur(5px)' }} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="glass"
                style={{ position: 'fixed', bottom: 56, left: 0, right: 0, zIndex: 201, borderRadius: '24px 24px 0 0', padding: '1.25rem', maxHeight: '72vh', overflowY: 'auto', boxShadow: '0 -12px 40px rgba(139,92,246,0.25)', borderTop: '1px solid rgba(139,92,246,0.3)' }}>
                <DetailContent key={selectedInfo.dateStr} info={selectedInfo} onClose={() => setSelectedInfo(null)} pullHandle={true} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default CalendarSystem;
