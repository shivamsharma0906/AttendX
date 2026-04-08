import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, Calendar, BarChart2, Settings2, LogOut,
  Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle, Search, Download, FileText
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay
} from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Tilt from 'react-parallax-tilt';

/* ── Motivation Carousel ──────────────────────────────────── */
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
  React.useEffect(() => {
    const int = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), 6000);
    return () => clearInterval(int);
  }, []);
  
  return (
    <div style={{ position: 'relative', height: 26, overflow: 'hidden', marginTop: '0.4rem' }}>
      <AnimatePresence mode="wait">
        <motion.p key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ margin: 0, color: '#22d3ee', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(6,182,212,0.4)' }}>
          {QUOTES[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/* ── Helpers ─────────────────────────────────────────────── */
const calcHours = (inTime, outTime) => {
  if (!inTime || !outTime) return 0;
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  let diff = (oh + om / 60) - (ih + im / 60);
  if (diff < 0) diff += 24;
  return diff;
};

const getDayStatus = (record) => {
  if (!record) return null;
  const hrs = calcHours(record.inTime, record.outTime);
  // Only inTime recorded
  if (record.inTime && !record.outTime) return { status: 'Active', color: '#06b6d4', hrs: 0 };

  const [ih, im] = record.inTime.split(':').map(Number);
  const isLate = ih > 9 || (ih === 9 && im > 15);

  if (hrs >= 9) return { status: isLate ? 'Overtime (Late)' : 'Full Day', color: isLate ? '#a78bfa' : '#34d399', hrs };
  if (hrs >= 4.5) return { status: 'Half Day', color: '#fbbf24', hrs };
  return { status: 'Short', color: '#f87171', hrs };
};

/* ── Sub-components ────────────────────────────────────────── */

// Stat Card
const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} scale={1.02} transitionSpeed={2000} style={{ flex: 1 }}>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)',
        border: `1px solid ${color}22`, borderRadius: 16, padding: '1.25rem 1.5rem',
        position: 'relative', overflow: 'hidden', height: '100%'
      }}
    >
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: color + '14', borderRadius: '50%', filter: 'blur(35px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <div style={{ padding: '0.45rem', background: color + '1a', borderRadius: 9 }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc' }}>{value}</p>
    </motion.div>
  </Tilt>
);

/* ── TABS ──────────────────────────────────────────────────── */

// Tab: Overview / Payroll table
const OverviewTab = ({ employees, records, settings }) => {
  const targetHrs = settings.workingDays * settings.hoursPerDay;
  const todayStr = new Date().toISOString().split('T')[0];

  const payroll = useMemo(() => employees.map(emp => {
    const empRec = records.filter(r => r.empId === emp.id);
    const hrs = empRec.reduce((acc, r) => acc + calcHours(r.inTime, r.outTime), 0);
    const finalSalary = ((emp.baseSalary / targetHrs) * hrs).toFixed(0);
    return { ...emp, days: empRec.length, hrs: hrs.toFixed(1), finalSalary };
  }), [employees, records, targetHrs]);

  const todayPunches = records.filter(r => r.date === todayStr).length;

  const chartData = [...payroll].sort((a, b) => b.hrs - a.hrs).map(e => ({ name: e.name.split(' ')[0], hours: Number(e.hrs) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <StatCard icon={Users} label="Employees" value={employees.length} color="#8b5cf6" delay={0.05} />
        <StatCard icon={Clock} label="Today's Punches" value={todayPunches} color="#06b6d4" delay={0.1} />
        <StatCard icon={Calendar} label="Target Hrs/Month" value={`${targetHrs}h`} color="#f59e0b" delay={0.15} />
        <StatCard icon={BarChart2} label="Total Logs" value={records.length} color="#10b981" delay={0.2} />
      </div>

      <div className="r-grid-2-1">
        {/* Payroll Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', overflow: 'auto' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem' }}>Payroll Summary</h2>
          {payroll.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>No employees added yet. Use the "Employees" tab.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Name', 'Base Salary', 'Days', 'Hours', 'Final Pay'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 0.8rem', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '0.75rem 0.8rem', color: '#94a3b8' }}>₹{d.baseSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.75rem 0.8rem' }}>
                      <span style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{d.days}/{settings.workingDays}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.8rem', color: Number(d.hrs) >= targetHrs ? '#34d399' : '#f8fafc' }}>{d.hrs}h</td>
                    <td style={{ padding: '0.75rem 0.8rem' }}>
                      <span className="text-gradient" style={{ fontWeight: 800, fontSize: '1rem' }}>₹{Number(d.finalSalary).toLocaleString('en-IN')}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* Bar chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem' }}>Leaderboard</h2>
          {chartData.length === 0 ? (
            <p style={{ color: '#475569', fontSize: '0.85rem' }}>No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#12121a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f8fafc', fontSize: 12 }} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="hours" fill="url(#grad)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Tab: Attendance Log (universal punch)
const AttendanceTab = ({ employees, records, addRecord }) => {
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [msg, setMsg] = useState('');
  const { deleteRecord } = useAppStore();

  const [search, setSearch] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (!empId || !date || !inTime || !outTime) return;
    addRecord({ id: Date.now().toString(), empId, date, inTime, outTime });
    setMsg('Attendance saved!'); setInTime(''); setOutTime('');
    setTimeout(() => setMsg(''), 3000);
  };

  const filtered = [...records]
    .filter(r => {
      const emp = employees.find(e => e.id === r.empId);
      return !search || emp?.name.toLowerCase().includes(search.toLowerCase());
    })
    .reverse()
    .slice(0, 40);

  return (
    <div className="r-grid-sidebar">
      {/* Form */}
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
        style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem' }}>Add Attendance</h2>
        {msg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', padding: '0.65rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.8rem' }}>
            <CheckCircle size={14} /> {msg}
          </div>
        )}
        {employees.length === 0 ? (
          <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Add employees first from the Employees tab.</p>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem' }}>Employee Name</label>
              <select className="input-field" value={empId} onChange={e => setEmpId(e.target.value)} required style={{ appearance: 'none' }}>
                <option value="">Select employee...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem' }}>Date</label>
              <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="r-grid-1-1-xs">
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem' }}>In Time <span style={{ color: '#f43f5e', fontSize: '0.7rem', fontWeight: 700 }}>*</span></label>
                <input type="time" className="input-field in-time" value={inTime} onChange={e => setInTime(e.target.value)} required style={{ fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem' }}>Out Time <span style={{ color: '#f43f5e', fontSize: '0.7rem', fontWeight: 700 }}>*</span></label>
                <input type="time" className="input-field out-time" value={outTime} onChange={e => setOutTime(e.target.value)} style={{ fontFamily: 'monospace' }} required />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Clock size={15} /> Save Record
            </button>
          </form>
        )}
      </motion.div>

      {/* All Logs table */}
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
        style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>All Attendance Logs</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: 9, outline: 'none', fontSize: '0.8rem', fontFamily: 'inherit', width: 200 }} />
          </div>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'rgba(18,18,26,0.95)', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Employee', 'Date', 'In', 'Out', 'Hours', ''].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>No records found.</td></tr>
              ) : filtered.map(r => {
                const emp = employees.find(e => e.id === r.empId);
                const hrs = calcHours(r.inTime, r.outTime);
                const st = getDayStatus(r);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{emp?.name || '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8' }}>{r.date}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#34d399', fontFamily: 'monospace' }}>{r.inTime || '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#f59e0b', fontFamily: 'monospace' }}>{r.outTime || '—'}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {st && <span style={{ background: st.color + '18', color: st.color, padding: '2px 7px', borderRadius: 5, fontSize: '0.78rem', fontWeight: 600 }}>{hrs.toFixed(1)}h</span>}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <button onClick={() => deleteRecord(r.id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', padding: '0.3rem 0.5rem', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

// Tab: Employee Self-Service — select name, see last month calendar & report
const MyReportTab = ({ employees, records, settings }) => {
  const [empId, setEmpId] = useState('');
  const [calDate, setCalDate] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const targetHrs = settings.workingDays * settings.hoursPerDay;

  const monthStart = startOfMonth(calDate);
  const monthEnd = endOfMonth(calDate);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const emp = employees.find(e => e.id === empId);

  const empStats = useMemo(() => {
    if (!empId) return null;
    const empRec = records.filter(r => r.empId === empId);
    const hrs = empRec.reduce((acc, r) => acc + calcHours(r.inTime, r.outTime), 0);
    const finalSalary = ((emp.baseSalary / targetHrs) * hrs).toFixed(0);
    return { days: empRec.length, hrs: hrs.toFixed(1), finalSalary };
  }, [empId, records, emp, targetHrs]);

  const recordByDate = (dateStr) => records.find(r => r.empId === empId && r.date === dateStr);

  const dotColors = { 'Full Day': '#34d399', 'Overtime (Late)': '#a78bfa', 'Half Day': '#fbbf24', 'Short': '#f87171', 'Active': '#06b6d4' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Select Employee */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
          Select Your Name
        </label>
        <select className="input-field" value={empId} onChange={e => { setEmpId(e.target.value); setSelected(null); }} style={{ appearance: 'none', fontSize: '1rem', fontWeight: 500 }}>
          <option value="">— Choose your name —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </motion.div>

      {empId && emp && empStats && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              style={{ flex: 1, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Days Present</p>
              <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, color: '#34d399' }}>{empStats.days}</p>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.8rem' }}>out of {settings.workingDays} working days</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Total Hours</p>
              <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, color: '#a78bfa' }}>{empStats.hrs}h</p>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.8rem' }}>target: {targetHrs}h</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{ flex: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '1.25rem' }}>
              <p style={{ margin: '0 0 0.3rem', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Salary Earned</p>
              <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900 }} className="text-gradient">₹{Number(empStats.finalSalary).toLocaleString('en-IN')}</p>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.8rem' }}>of ₹{emp.baseSalary.toLocaleString('en-IN')} base</p>
            </motion.div>
          </div>

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Attendance Calendar — {emp.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '0.4rem', borderRadius: 8, cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                <span style={{ fontWeight: 700, color: '#f8fafc', minWidth: 130, textAlign: 'center', fontSize: '0.95rem' }} className="text-gradient">{format(calDate, 'MMMM yyyy')}</span>
                <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '0.4rem', borderRadius: 8, cursor: 'pointer' }}><ChevronRight size={18} /></button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[['#34d399', 'Full Day'], ['#fbbf24', 'Half Day'], ['#f87171', 'Short'], ['#a78bfa', 'OT/Late'], ['#06b6d4', 'Active']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />{l}
                </div>
              ))}
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.4rem' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#475569', padding: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
              {days.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const record = recordByDate(dateStr);
                const st = record ? getDayStatus(record) : null;
                const isSelected = selected?.dateStr === dateStr;

                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(isSelected ? null : { date: day, dateStr, record, st })}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      background: isSelected ? 'rgba(139,92,246,0.2)' : isToday ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(139,92,246,0.5)' : isToday ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      opacity: isCurrentMonth ? 1 : 0.25,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', padding: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, color: isToday ? '#a78bfa' : '#94a3b8' }}>{format(day, 'd')}</span>
                    {st && (
                      <div style={{ position: 'absolute', bottom: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: st.color, boxShadow: `0 0 6px ${st.color}80` }} />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Selected day detail */}
            <AnimatePresence>
              {selected && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1rem', overflow: 'hidden' }}>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>{format(selected.date, 'EEEE, MMMM do')}</p>
                  {selected.record ? (
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                      <div><span style={{ color: '#64748b' }}>In: </span><span style={{ color: '#34d399', fontFamily: 'monospace', fontWeight: 600 }}>{selected.record.inTime || '—'}</span></div>
                      <div><span style={{ color: '#64748b' }}>Out: </span><span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>{selected.record.outTime || '—'}</span></div>
                      {selected.st && (
                        <>
                          <div><span style={{ color: '#64748b' }}>Hours: </span><span style={{ color: '#f8fafc', fontWeight: 700 }}>{selected.st.hrs.toFixed(2)}h</span></div>
                          <span style={{ background: selected.st.color + '18', color: selected.st.color, padding: '2px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem' }}>{selected.st.status}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#f87171', margin: 0, fontSize: '0.85rem' }}>No attendance recorded for this date.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Detail table for the month */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem' }}>
              Monthly Detail — {format(calDate, 'MMMM yyyy')}
            </h2>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'rgba(18,18,26,0.98)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Date', 'In Time', 'Out Time', 'Hours Worked', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter(r => r.empId === empId && r.date.startsWith(format(calDate, 'yyyy-MM')))
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(r => {
                      const hrs = calcHours(r.inTime, r.outTime);
                      const st = getDayStatus(r);
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8' }}>{r.date}</td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#34d399', fontFamily: 'monospace' }}>{r.inTime || '—'}</td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#f59e0b', fontFamily: 'monospace' }}>{r.outTime || '—'}</td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{hrs.toFixed(2)}h</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            {st && <span style={{ background: st.color + '18', color: st.color, padding: '2px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>{st.status}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  {records.filter(r => r.empId === empId && r.date.startsWith(format(calDate, 'yyyy-MM'))).length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>No records for this month.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

// Tab: Employees management (admin only)
const EmployeesTab = ({ employees, records }) => {
  const { addEmployee, deleteEmployee, settings } = useAppStore();
  const targetHrs = settings.workingDays * settings.hoursPerDay;
  const [name, setName] = useState('');
  const [salary, setSalary] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !salary) return;
    addEmployee({ id: Date.now().toString(), name: name.trim(), baseSalary: Number(salary) });
    setName(''); setSalary('');
  };

  return (
    <div className="r-grid-sidebar-sm">
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
        style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem' }}>Add Employee</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem' }}>Full Name</label>
            <input className="input-field" placeholder="e.g. Shivam Kumar" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem' }}>Monthly Base Salary</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>₹</span>
              <input type="number" className="input-field" placeholder="9000" value={salary} onChange={e => setSalary(e.target.value)} style={{ paddingLeft: '1.75rem' }} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Plus size={15} /> Add Employee
          </button>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
        style={{ background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem' }}>Current Staff ({employees.length})</h2>
        {employees.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>No employees added yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['Name', 'Base Salary', 'Total Records', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.04 * i }}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.75rem 0.8rem', fontWeight: 600 }}>{emp.name}</td>
                  <td style={{ padding: '0.75rem 0.8rem', color: '#94a3b8' }}>₹{emp.baseSalary.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '0.75rem 0.8rem', color: '#64748b' }}>{records.filter(r => r.empId === emp.id).length} logs</td>
                  <td style={{ padding: '0.75rem 0.8rem' }}>
                    <button onClick={() => deleteEmployee(emp.id)} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', padding: '0.3rem 0.7rem', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
};

// Tab: Settings
const SettingsTab = () => {
  const { settings, updateSettings } = useAppStore();
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 560, background: 'rgba(18,18,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '2rem' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Calculation Settings</h2>
      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 2rem' }}>
        Formula: <code style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 6 }}>(Base Salary ÷ Target Hours) × Worked Hours = Final Salary</code>
      </p>
      <div className="r-grid-1-1">
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Working Days / Month</label>
          <input type="number" className="input-field" value={settings.workingDays} onChange={e => updateSettings({ workingDays: Number(e.target.value) })} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Required Hours / Day</label>
          <input type="number" className="input-field" value={settings.hoursPerDay} onChange={e => updateSettings({ hoursPerDay: Number(e.target.value) })} />
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#a78bfa', fontWeight: 700, fontSize: '1.1rem' }}>
          Target Monthly Hours = <span style={{ fontSize: '1.4rem' }}>{settings.workingDays * settings.hoursPerDay}h</span>
        </p>
      </div>
    </motion.div>
  );
};

/* ── MAIN DASHBOARD ──────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance Log', icon: Clock },
  { id: 'myreport', label: 'My Report', icon: BarChart2 },
  { id: 'employees', label: 'Employees', icon: Users, adminOnly: false },
  { id: 'settings', label: 'Settings', icon: Settings2, adminOnly: true },
];

const MainDashboard = () => {
  const { user, role, logout, employees, records, addRecord } = useAppStore();
  const [tab, setTab] = useState('overview');

  const visibleTabs = TABS.filter(t => !t.adminOnly || role === 'admin');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#030305', position: 'relative', overflow: 'hidden' }}>
      
      {/* 🔮 Insane Level Animated Glowing Background Orbs */}
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(0,0,0,0) 60%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 60%)', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />
      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '30%', left: '40%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0) 50%)', filter: 'blur(120px)', zIndex: 0, pointerEvents: 'none' }} />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        style={{
          width: 240, minWidth: 240,
          background: 'rgba(18,18,26,0.7)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 20px 20px 0',
          margin: '0.75rem 0 0.75rem 0.75rem',
          padding: '1.5rem 0.85rem',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: '0.75rem',
          height: 'calc(100vh - 1.5rem)', zIndex: 100
        }}
      >
        <div style={{ padding: '0 0.5rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }} className="text-gradient">NexusPay</h1>
          <p style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{role} portal</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
          {visibleTabs.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon size={17} style={{ color: isActive ? '#c4b5fd' : '#475569', flexShrink: 0 }} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}>
              {user?.name?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.18)', padding: '0.55rem', borderRadius: 9, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.08)'}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2.5rem', position: 'relative', zIndex: 10 }}>
        
        {/* ✨ Glassmorphic Hero Banner */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
          style={{ marginBottom: '2.5rem', padding: '1px', borderRadius: 24, background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(6,182,212,0.5), rgba(16,185,129,0.3))', position: 'relative', zIndex: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          
          <div style={{ background: 'rgba(10,10,18,0.7)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 23, padding: '2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Internal subtle glow */}
            <div style={{ position: 'absolute', top: -50, left: -50, width: 250, height: 250, background: 'rgba(139,92,246,0.25)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
               <h1 style={{ margin: '0 0 0.2rem', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                 Welcome back, <span className="tg" style={{ filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.6))' }}>{user?.name?.split(' ')[0]}</span> 👋
               </h1>
               <QuoteCarousel />
            </div>

            <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{format(new Date(), 'EEEE')}</p>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', textShadow: '0 0 15px rgba(255,255,255,0.3)' }}>{format(new Date(), 'MMMM do, yyyy')}</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {tab === 'overview' && <OverviewTab employees={employees} records={records} settings={useAppStore.getState().settings} />}
            {tab === 'attendance' && <AttendanceTab employees={employees} records={records} addRecord={addRecord} />}
            {tab === 'myreport' && <MyReportTab employees={employees} records={records} settings={useAppStore.getState().settings} />}
            {tab === 'employees' && <EmployeesTab employees={employees} records={records} />}
            {tab === 'settings' && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default MainDashboard;
