import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Calendar as CalendarIcon,
  Clock, User, CheckCircle, AlertCircle, Sparkles, Filter
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday
} from 'date-fns';
import { calcHours, getStatus, STATUS_COLORS, isLate, fmtHrs } from '../utils/calc';
import useAppStore from '../store/useAppStore';

/* ── Mobile Hook ── */
const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 900);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

/* ── Day Detail Drawer / Panel ── */
const DayPanel = ({ date, records, employees, onClose, isMobile, settings }) => {
  if (!date) return null;
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayRecs = records.filter(r => r.date === dateStr);

  const RecordRow = ({ rec }) => {
    const emp = employees.find(e => String(e.id) === String(rec.empId) || String(e.employeeId) === String(rec.empId));
    const hrs = calcHours(rec.inTime, rec.outTime);
    const st = getStatus(rec, [], settings);
    const col = STATUS_COLORS[st] || STATUS_COLORS.present;
    const late = isLate(rec.inTime, settings?.shiftStart, settings?.gracePeriod);
    return (
      <div style={{ background: 'rgba(8,14,30,0.85)', border: `1px solid ${col.bg}40`, borderRadius: 16, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: col.bg + '18', filter: 'blur(20px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f8fafc' }}>{emp?.name || `Employee #${rec.empId}`}</span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: col.bgAlpha, color: col.text, border: `1px solid ${col.bg}50` }}>{col.label}</span>
            {late && <span className="badge badge-late">Late Check-In</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            ['Check In', rec.inTime || '—', '#34d399'],
            ['Check Out', rec.outTime || '—', '#fbbf24'],
            ['Total Hours', hrs ? fmtHrs(hrs) : '—', '#38bdf8']
          ].map(([lbl, val, clr]) => (
            <div key={lbl} style={{ background: 'rgba(4,8,20,0.6)', borderRadius: 12, padding: '0.5rem 0.65rem', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: clr }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const contentJSX = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {isMobile && <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 99, margin: '0 auto 0.5rem' }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#f8fafc' }}>
            {format(date, 'EEEE')}
          </h3>
          <p style={{ margin: '0.2rem 0 0', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700 }}>
            {format(date, 'MMMM do, yyyy')}
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 10, padding: '0.4rem', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {dayRecs.length === 0 ? (
        <div style={{ background: 'rgba(8,14,30,0.6)', border: '1px dashed rgba(56,189,248,0.2)', borderRadius: 18, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <CalendarIcon size={32} style={{ color: '#64748b', margin: '0 auto 0.75rem', opacity: 0.5 }} />
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>No punch logs recorded<br />for this date.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {dayRecs.map(rec => <RecordRow key={rec.id || rec.empId} rec={rec} />)}
        </div>
      )}
    </div>
  );

  if (isMobile) return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,17,0.85)', zIndex: 200, backdropFilter: 'blur(8px)' }} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        style={{ background: 'rgba(8,14,30,0.96)', backdropFilter: 'blur(20px)', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, borderRadius: '24px 24px 0 0', padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto', borderTop: '1px solid rgba(56,189,248,0.3)', boxShadow: '0 -20px 60px rgba(0,0,0,0.8)' }}>
        {contentJSX}
      </motion.div>
    </>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      style={{ width: 320, flexShrink: 0, background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 22, padding: '1.5rem', position: 'sticky', top: 12 }}>
      {contentJSX}
    </motion.div>
  );
};

/* ── Main CalendarView Component ── */
const CalendarView = () => {
  const isMobile = useIsMobile();
  const { employees, records, user, settings } = useAppStore();

  const isAdmin = user?.role === 'admin';
  const currentEmpId = user?.employeeId || user?.id;

  const [current, setCurrent] = useState(() => new Date());
  const [selectedEmp, setSelectedEmp] = useState(isAdmin ? 'all' : (currentEmpId || 'all'));
  const [selectedDay, setSelectedDay] = useState(null);

  const effectiveSelectedEmp = !isAdmin && currentEmpId ? currentEmpId : selectedEmp;

  const visibleEmployees = useMemo(() => {
    if (!isAdmin) {
      return employees.filter(e => String(e.id) === String(currentEmpId) || String(e.employeeId) === String(currentEmpId));
    }
    return employees;
  }, [isAdmin, employees, currentEmpId]);

  const visibleRecs = useMemo(() => {
    if (effectiveSelectedEmp === 'all') return records;
    return records.filter(r => String(r.empId) === String(effectiveSelectedEmp));
  }, [records, effectiveSelectedEmp]);

  const dateMap = useMemo(() => {
    const map = {};
    visibleRecs.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [visibleRecs]);

  /* Stats calculation for single selected employee */
  const empStats = useMemo(() => {
    if (effectiveSelectedEmp === 'all') return null;
    const emp = employees.find(e => String(e.id) === String(effectiveSelectedEmp) || String(e.employeeId) === String(effectiveSelectedEmp));
    if (!emp) return null;
    const monthStr = format(current, 'yyyy-MM');
    const recs = records.filter(r => (String(r.empId) === String(effectiveSelectedEmp)) && r.date.startsWith(monthStr));
    const totalHrs = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
    const targetHrs = (settings?.workingDays || 26) * (settings?.hoursPerDay || 9);
    const earned = ((emp.baseSalary / targetHrs) * totalHrs).toFixed(0);
    return { emp, count: recs.length, totalHrs, targetHrs, earned, currency: settings?.currency || '₹' };
  }, [effectiveSelectedEmp, employees, records, current, settings]);

  const handleDayClick = (day) => {
    if (!isSameMonth(day, current)) return;
    setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day);
  };

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days       = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end:   endOfWeek(monthEnd)
  });

  const prevMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { setCurrent(new Date()); setSelectedDay(new Date()); };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Attendance <span className="text-gradient">Calendar</span> 📅
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              {isAdmin ? 'Monitor complete workforce punch logs, monthly hours, and status.' : 'View your monthly attendance, hours logged, and shift status.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={goToday} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8' }}>
              Today
            </button>
          </div>
        </div>

        {/* Calendar Main Grid Container */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Control Bar: Month Navigation & Employee Filter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)', padding: '1rem 1.5rem', borderRadius: 20, border: '1px solid rgba(56,189,248,0.15)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 12, cursor: 'pointer', display: 'flex' }}>
                  <ChevronLeft size={18} />
                </button>
                <h2 style={{ margin: 0, fontWeight: 900, fontSize: isMobile ? '1.2rem' : '1.5rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                  {format(current, 'MMMM yyyy')}
                </h2>
                <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: 12, cursor: 'pointer', display: 'flex' }}>
                  <ChevronRight size={18} />
                </button>
              </div>

              {isAdmin && (
                <div style={{ position: 'relative', minWidth: 240 }}>
                  <Filter size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#38bdf8' }} />
                  <select className="input-field" value={effectiveSelectedEmp}
                    onChange={e => { setSelectedEmp(e.target.value); setSelectedDay(null); }}
                    style={{ paddingLeft: '2.4rem' }}>
                    <option value="all">👁️ All Employees Overview</option>
                    {visibleEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Status Legend Bar */}
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(4,8,20,0.6)', padding: '0.75rem 1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { label: 'Full Day', color: '#34d399' },
                { label: 'Half Day', color: '#fbbf24' },
                { label: 'Short', color: '#f87171' },
                { label: 'Late', color: '#a78bfa' },
                { label: 'Absent', color: '#f43f5e' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}aa` }} />
                  {s.label}
                </div>
              ))}
            </div>

            {/* Per-Employee Stats Row */}
            {empStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Days Present', value: empStats.count, color: '#34d399', icon: CheckCircle },
                  { label: 'Hours Logged', value: fmtHrs(empStats.totalHrs), color: '#38bdf8', icon: Clock },
                  { label: 'Target Hours', value: `${empStats.targetHrs}h`, color: '#a78bfa', icon: Sparkles },
                  { label: 'Est. Payroll', value: `${empStats.currency}${Number(empStats.earned).toLocaleString('en-IN')}`, color: '#fbbf24', icon: User },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} style={{ background: 'rgba(8,14,30,0.85)', border: `1px solid ${s.color}25`, borderRadius: 16, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        <Icon size={15} color={s.color} />
                        <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>{s.label}</p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: '1.35rem', color: s.color }}>{s.value}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Calendar Grid Container */}
            <div style={{ background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 22, padding: isMobile ? '1rem' : '1.5rem', overflow: 'hidden' }}>
              
              {/* Day Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                {(isMobile ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: (i === 0 || i === 6) ? '#f43f5e' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.35rem 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.4rem' }}>
                {days.map((day, i) => {
                  const inMon = isSameMonth(day, current);
                  const today = isToday(day);
                  const sel = selectedDay && isSameDay(day, selectedDay);
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const recs = dateMap[dateStr] || [];
                  const isWknd = day.getDay() === 0 || day.getDay() === 6;
                  const dots = recs.slice(0, 3).map(r => STATUS_COLORS[getStatus(r, [], settings)]?.bg || '#38bdf8');

                  return (
                    <motion.div key={i}
                      whileHover={inMon ? { scale: 1.04, y: -2 } : {}}
                      whileTap={inMon ? { scale: 0.96 } : {}}
                      onClick={() => handleDayClick(day)}
                      style={{
                        minHeight: isMobile ? 55 : 82,
                        borderRadius: 14,
                        border: sel ? '2px solid #38bdf8' : today ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.04)',
                        background: sel ? 'rgba(56,189,248,0.18)' : today ? 'rgba(37,99,235,0.2)' : isWknd && inMon ? 'rgba(244,63,94,0.04)' : 'rgba(4,8,20,0.5)',
                        opacity: inMon ? 1 : 0.12,
                        cursor: inMon ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 0.35rem', position: 'relative',
                        boxShadow: sel ? '0 0 18px rgba(56,189,248,0.3)' : 'none'
                      }}>
                      <span style={{ fontSize: isMobile ? '0.78rem' : '0.92rem', fontWeight: today || sel ? 900 : 700, color: sel ? '#38bdf8' : today ? '#60a5fa' : '#f8fafc', lineHeight: 1 }}>
                        {format(day, 'd')}
                      </span>

                      {/* Dots Indicator */}
                      {inMon && dots.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, marginTop: 'auto', paddingTop: 4 }}>
                          {dots.map((c, di) => (
                            <div key={di} style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
                          ))}
                          {recs.length > 3 && <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>+{recs.length - 3}</span>}
                        </div>
                      )}
                      {/* Absent indicator */}
                      {inMon && effectiveSelectedEmp !== 'all' && !isWknd && day <= new Date() && recs.length === 0 && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 6px rgba(244,63,94,0.8)' }} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Desktop Side Detail Panel */}
          {!isMobile && (
            <AnimatePresence>
              {selectedDay ? (
                <DayPanel key={format(selectedDay, 'yyyy-MM-dd')} date={selectedDay} records={visibleRecs} employees={employees} onClose={() => setSelectedDay(null)} isMobile={false} settings={settings} />
              ) : (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ borderRadius: 22, padding: '2.5rem 1.5rem', width: 310, flexShrink: 0, textAlign: 'center', background: 'rgba(8,14,30,0.85)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', justifyContent: 'center', minHeight: 300, position: 'sticky', top: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                    <CalendarIcon size={26} />
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, fontWeight: 600 }}>Click any date in the calendar<br />to inspect punch details & hours.</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Mobile Bottom Sheet */}
          {isMobile && (
            <AnimatePresence>
              {selectedDay && (
                <DayPanel key={format(selectedDay, 'yyyy-MM-dd')} date={selectedDay} records={visibleRecs} employees={employees} onClose={() => setSelectedDay(null)} isMobile={true} settings={settings} />
              )}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  );
};

export default CalendarView;
