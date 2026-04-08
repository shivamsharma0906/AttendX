import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const emp  = employees.find(e => e.id === rec.empId);
    const hrs  = calcHours(rec.inTime, rec.outTime);
    const st   = getStatus(rec);
    const col  = STATUS_COLORS[st];
    const late = isLate(rec.inTime);
    return (
      <div style={{ background: col.bgAlpha, border: `1px solid ${col.bg}30`, borderRadius: 14, padding: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{emp?.name || 'Unknown'}</span>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: col.bgAlpha, color: col.text, border: `1px solid ${col.bg}40` }}>{col.label}</span>
            {late && <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>Late</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
          {[['In', rec.inTime || '—', '#34d399'], ['Out', rec.outTime || '—', '#fbbf24'], ['Hrs', hrs ? fmtHrs(hrs) : '—', '#a78bfa']].map(([lbl, val, clr]) => (
            <div key={lbl} style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: '0.45rem 0.6rem' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: clr }}>{val}</p>
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
          <h3 style={{ margin: '0 0 0.2rem', fontWeight: 900, fontSize: '1.1rem' }}>{format(date, 'EEEE')}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>{format(date, 'MMMM do, yyyy')}</p>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem' }}><X size={16} /></button>
      </div>

      {dayRecs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.25 }} />
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>No attendance records for this day</p>
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
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, backdropFilter: 'blur(5px)' }} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="glass"
        style={{ position: 'fixed', bottom: 56, left: 0, right: 0, zIndex: 201, borderRadius: '24px 24px 0 0', padding: '1.25rem', maxHeight: '72vh', overflowY: 'auto', boxShadow: '0 -12px 40px rgba(139,92,246,0.25)', borderTop: '1px solid rgba(139,92,246,0.3)' }}>
        <PanelContent />
      </motion.div>
    </>
  );

  /* Desktop: side panel */
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      className="glass"
      style={{ borderRadius: 20, padding: '1.5rem', width: 290, flexShrink: 0 }}>
      <PanelContent />
    </motion.div>
  );
};

/* ══════════════════════════════════════
   MAIN: CalendarView
══════════════════════════════════════ */
const CalendarView = () => {
  const { employees, records, settings } = useStore();
  const isMobile = useIsMobile();

  const [current,     setCurrent]     = useState(new Date());
  const [selectedEmp, setSelectedEmp] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStr   = format(current, 'yyyy-MM');
  const monthStart = startOfMonth(current);
  const days       = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  const prev = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  /* Filtered records */
  const visibleRecs = useMemo(() =>
    records.filter(r => r.date.startsWith(monthStr) && (selectedEmp === 'all' || r.empId === selectedEmp)),
    [records, monthStr, selectedEmp]
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

  /* Quick punch state */
  const { addRecord } = useStore();
  const [punch, setPunch] = useState({ empId: '', date: format(new Date(), 'yyyy-MM-dd'), inTime: '', outTime: '' });
  const [punchMsg, setPunchMsg] = useState('');

  const savePunch = e => {
    e.preventDefault();
    if (!punch.empId || !punch.inTime || !punch.outTime) return;
    addRecord({ id: Date.now().toString(), ...punch, source: 'manual' });
    setPunchMsg('Saved!');
    setPunch(p => ({ ...p, inTime: '', outTime: '' }));
    setTimeout(() => setPunchMsg(''), 2500);
  };

  const handleDayClick = (day) => {
    if (!isSameMonth(day, current)) return;
    setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day);
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── Top Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button className="btn btn-ghost" onClick={prev} style={{ padding: '0.4rem' }}><ChevronLeft size={18} /></button>
            <h2 className="tg" style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '1.05rem' : '1.45rem', whiteSpace: 'nowrap' }}>
              {format(current, isMobile ? 'MMM yyyy' : 'MMMM yyyy')}
            </h2>
            <button className="btn btn-ghost" onClick={next} style={{ padding: '0.4rem' }}><ChevronRight size={18} /></button>
          </div>

          <select className="ipt" value={selectedEmp}
            onChange={e => { setSelectedEmp(e.target.value); setSelectedDay(null); }}
            style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? '100%' : 220 }}>
            <option value="all">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'present').map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#94a3b8' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: v.bg, boxShadow: `0 0 4px ${v.bg}80` }} />
              {v.label}
            </div>
          ))}
        </div>

        {/* ── Per-employee stats ── */}
        {empStats && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: '0.5rem' }}>
            {[
              { label: 'Present', value: empStats.count, color: '#34d399' },
              { label: 'Hours', value: fmtHrs(empStats.totalHrs), color: '#a78bfa' },
              { label: 'Target', value: `${empStats.targetHrs}h`, color: '#64748b' },
              { label: 'Earned', value: `${empStats.currency}${Number(empStats.earned).toLocaleString('en-IN')}`, color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="glass" style={{ borderRadius: 12, padding: '0.65rem 0.75rem' }}>
                <p style={{ margin: 0, fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{s.label}</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Calendar Grid ── */}
        <motion.div className="glass" layout style={{ borderRadius: 20, padding: isMobile ? '0.85rem' : '1.2rem', overflow: 'hidden' }}>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.2rem', marginBottom: '0.4rem' }}>
            {(isMobile
              ? ['S','M','T','W','T','F','S']
              : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
            ).map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? '0.6rem' : '0.65rem', fontWeight: 800, color: (i===0||i===6) ? '#2d3748' : '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.25rem' }}>
            {days.map((day, i) => {
              const inMon   = isSameMonth(day, current);
              const today   = isToday(day);
              const sel     = selectedDay && isSameDay(day, selectedDay);
              const dateStr = format(day, 'yyyy-MM-dd');
              const recs    = dateMap[dateStr] || [];
              const isWknd  = day.getDay() === 0 || day.getDay() === 6;
              const dots    = recs.slice(0, 3).map(r => STATUS_COLORS[getStatus(r)]?.bg || '#fff');

              return (
                <motion.div key={i}
                  whileHover={inMon ? { scale: 1.1 } : {}}
                  whileTap={inMon ? { scale: 0.9 } : {}}
                  onClick={() => handleDayClick(day)}
                  style={{
                    aspectRatio: 1, borderRadius: isMobile ? 8 : 12,
                    border: sel   ? '1.5px solid rgba(139,92,246,0.85)'
                          : today ? '1.5px solid rgba(139,92,246,0.45)'
                          : '1px solid rgba(255,255,255,0.04)',
                    background: sel   ? 'rgba(139,92,246,0.22)'
                              : today ? 'rgba(139,92,246,0.1)'
                              : isWknd && inMon ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
                    opacity: inMon ? 1 : 0.12,
                    cursor: inMon ? 'pointer' : 'default',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0.25rem', position: 'relative',
                    transition: 'all 0.18s',
                  }}>
                  <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: today ? 900 : 500, color: today ? '#c4b5fd' : sel ? '#e2d9f3' : '#94a3b8', lineHeight: 1 }}>
                    {format(day, 'd')}
                  </span>
                  {/* Dots */}
                  {inMon && dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 'auto', paddingTop: 2 }}>
                      {dots.map((c, di) => (
                        <div key={di} style={{ width: isMobile ? 4 : 5, height: isMobile ? 4 : 5, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}` }} />
                      ))}
                      {recs.length > 3 && <span style={{ fontSize: '0.5rem', color: '#475569' }}>+{recs.length - 3}</span>}
                    </div>
                  )}
                  {/* Absent dot (single employee) */}
                  {inMon && selectedEmp !== 'all' && !isWknd && day <= new Date() && recs.length === 0 && (
                    <div style={{ width: isMobile ? 4 : 5, height: isMobile ? 4 : 5, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 5px rgba(244,63,94,0.6)', marginTop: 'auto' }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Quick Punch Form ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass" style={{ borderRadius: 18, padding: isMobile ? '1rem' : '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={16} color="#8b5cf6" /> Quick Attendance Entry
          </h3>
          {employees.length === 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} color="#f87171" />
              <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0 }}>Add employees first via the Employees tab.</p>
            </div>
          ) : (
            <form onSubmit={savePunch}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.7rem', alignItems: 'end' }}>
              {[
                { label: 'Employee', type: 'select' },
                { label: 'Date', type: 'date', field: 'date' },
                { label: 'In Time *', type: 'time', field: 'inTime', cls: 'in-time' },
                { label: 'Out Time *', type: 'time', field: 'outTime', cls: 'out-time' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="ipt" value={punch.empId} onChange={e => setPunch(p => ({ ...p, empId: e.target.value }))} required>
                      <option value="">Select...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} className={`ipt ${f.cls || ''}`} value={punch[f.field]}
                      onChange={e => setPunch(p => ({ ...p, [f.field]: e.target.value }))}
                      style={{ fontFamily: f.type === 'time' ? 'monospace' : 'inherit' }} required />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button type="submit" className="btn btn-v" style={{ whiteSpace: 'nowrap' }}>
                  <Clock size={14} /> Save
                </button>
                {punchMsg && (
                  <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 700 }}>
                    ✓ {punchMsg}
                  </motion.span>
                )}
              </div>
            </form>
          )}
        </motion.div>
      </div>

      {/* ── Desktop Side Panel ── */}
      {!isMobile && (
        <AnimatePresence>
          {selectedDay ? (
            <DayPanel key={format(selectedDay, 'yyyy-MM-dd')} date={selectedDay} records={records} employees={employees} onClose={() => setSelectedDay(null)} isMobile={false} />
          ) : (
            <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass"
              style={{ borderRadius: 20, padding: '2rem 1.5rem', width: 290, flexShrink: 0, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', minHeight: 200 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={22} color="#334155" />
              </div>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.85rem', lineHeight: 1.6 }}>Click any date<br />to view attendance</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Mobile Bottom Sheet ── */}
      {isMobile && (
        <AnimatePresence>
          {selectedDay && (
            <DayPanel key={format(selectedDay, 'yyyy-MM-dd')} date={selectedDay} records={records} employees={employees} onClose={() => setSelectedDay(null)} isMobile={true} />
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default CalendarView;
