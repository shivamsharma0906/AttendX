import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Award, FileSpreadsheet, FileText,
  Users, Clock, Calendar, BarChart2, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { calcHours, calcFinalSalary, fmtHrs, isLate } from '../utils/calc';
import useStore from '../store/useAppStore';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../services/firebase';

const db = getFirestore(app);
const PIE_COLORS = ['#34d399', '#fbbf24', '#f87171', '#818cf8'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(12,12,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '0.8rem 1rem', fontSize: '0.8rem', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 800, color: '#f8fafc' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '0.2rem 0', color: p.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

const StatPill = ({ label, value, color, icon }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
    style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: `1px solid ${color}20`, borderRadius: 20, padding: '1.4rem 1.6rem', display: 'flex', alignItems: 'center', gap: '1.1rem', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: color + '0f', borderRadius: '50%', filter: 'blur(20px)' }} />
    <div style={{ padding: '0.6rem', background: color + '15', borderRadius: 12, display: 'inline-flex' }}>
      {React.createElement(icon, { size: 20, color })}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{value}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  </motion.div>
);

const Reports = () => {
  const { employees, records, settings, fetchSettings } = useStore();
  const [curMonth, setCurMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [firestoreAttendance, setFirestoreAttendance] = useState([]);
  const [fsLoading, setFsLoading] = useState(false);

  const targetHrs = settings.workingDays * settings.hoursPerDay;

  const fetchFirestoreMonth = async (month) => {
    setFsLoading(true);
    try {
      const startDate = `${month}-01`;
      const [yr, mo] = month.split('-').map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      const snap = await getDocs(query(
        collection(db, 'attendance'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      ));
      setFirestoreAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setFsLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchFirestoreMonth(curMonth); }, [curMonth]);

  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(format(d, 'yyyy-MM'));
  }

  const empStats = useMemo(() => {
    return employees.map(emp => {
      const localRecs = records.filter(r => r.empId === emp.id && r.date.startsWith(curMonth));
      const fsRecs = firestoreAttendance.filter(r => String(r.employeeId) === String(emp.id));

      const totalHrs  = localRecs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
      const fullMin   = settings?.fullDayMinHrs || 9;
      const halfMax   = settings?.halfDayMaxHrs || 4.5;
      const otMin     = settings?.overtimeMinHrs || 9;
      
      const fullDays  = localRecs.filter(r => calcHours(r.inTime, r.outTime) >= fullMin).length;
      const halfDays  = localRecs.filter(r => { const h = calcHours(r.inTime, r.outTime); return h > 0 && h < halfMax; }).length;
      const otDays    = localRecs.filter(r => calcHours(r.inTime, r.outTime) > otMin).length;
      const lateDays  = localRecs.filter(r => isLate(r.inTime, settings?.shiftStart, settings?.gracePeriod)).length;
      const finalSal  = calcFinalSalary(emp.baseSalary, totalHrs, targetHrs, 0, settings?.workingDays || 26);

      const facePresent = fsRecs.length;

      return {
        id: emp.id, name: emp.name.split(' ')[0], fullName: emp.name,
        baseSalary: emp.baseSalary, days: Math.max(localRecs.length, facePresent),
        hours: +totalHrs.toFixed(1), fullDays, halfDays, otDays, lateDays,
        finalSal: +finalSal.toFixed(0), targetHrs, facePresent,
        pct: Math.min(Math.round((totalHrs / targetHrs) * 100), 100),
      };
    }).sort((a, b) => b.days - a.days);
  }, [employees, records, firestoreAttendance, curMonth, targetHrs, settings]);

  const topPerformer = empStats[0];
  const bottomPerformer = empStats.length > 1 ? empStats[empStats.length - 1] : null;

  const totalPayroll = empStats.reduce((s, e) => s + e.finalSal, 0);
  const totalPresent = empStats.reduce((s, e) => s + e.facePresent, 0);
  const avgHrs = empStats.length ? +(empStats.reduce((s, e) => s + e.hours, 0) / empStats.length).toFixed(1) : 0;

  const barData = empStats.map(e => ({
    name: e.name,
    'Face Check-ins': e.facePresent,
    'Hours Worked': e.hours,
    Target: targetHrs,
  }));

  const pieData = [
    { name: 'Present', value: empStats.filter(e => e.facePresent > 0).length },
    { name: 'Partial', value: empStats.filter(e => e.facePresent > 0 && e.pct < 80).length },
    { name: 'Absent', value: empStats.filter(e => e.facePresent === 0).length },
    { name: 'Overtime', value: empStats.filter(e => e.otDays > 0).length },
  ].filter(d => d.value > 0);

  const exportData = () => empStats.map(e => ({
    'Employee Code': e.id, 'Full Name': e.fullName, 'Base Salary': e.baseSalary,
    'Days Present': e.days, 'Face Check-ins': e.facePresent, 'Hours Worked': e.hours,
    'Target Hours': e.targetHrs, 'Full Days': e.fullDays, 'Half Days': e.halfDays,
    'Overtime Days': e.otDays, 'Late Days': e.lateDays, 'Final Salary': e.finalSal,
  }));

  const exportExcel = () => {
    if (!empStats.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData()), 'Payroll');
    XLSX.writeFile(wb, `AttendX_Report_${curMonth}.xlsx`);
  };

  const exportCSV = () => {
    if (!empStats.length) return;
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportData()));
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `AttendX_Report_${curMonth}.csv` });
    a.click();
  };

  const monthLabel = format(new Date(curMonth + '-01'), 'MMMM yyyy');

  const isMobile = useIsMobile();

  return (
    <Layout>
      <div style={{ width: '100%', padding: isMobile ? '0 0.5rem' : '0 1.5rem', position: 'relative', zIndex: 10, overflowX: 'hidden' }}>

        {/* ── Page Header ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Reports &amp; <span className="text-gradient">Analytics</span> 📊
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.82rem' }}>View, filter, analyze attendance patterns and export reports.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <select value={curMonth} onChange={e => setCurMonth(e.target.value)}
              style={{ padding: '0.55rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#f1f5f9', fontFamily: 'inherit', fontSize: '0.82rem', cursor: 'pointer', outline: 'none', flex: isMobile ? 1 : 'none' }}>
              {months.map(m => <option key={m} value={m} style={{ background: '#0d1117' }}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
            </select>

            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => fetchFirestoreMonth(curMonth)} disabled={fsLoading}
              style={{ padding: '0.55rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <motion.span animate={fsLoading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><RefreshCw size={14} /></motion.span>
              Refresh
            </motion.button>

            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={exportCSV} disabled={!empStats.length}
              style={{ padding: '0.55rem 0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: empStats.length ? 1 : 0.45, flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
              <FileText size={14} /> CSV
            </motion.button>

            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={exportExcel} disabled={!empStats.length}
              style={{ padding: '0.55rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: empStats.length ? 1 : 0.45, boxShadow: empStats.length ? '0 4px 16px rgba(16,185,129,0.3)' : 'none', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
              <FileSpreadsheet size={14} /> Excel
            </motion.button>
          </div>
        </motion.div>

        {/* ── KPI Statistics Cards ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? '0.75rem' : '1.1rem', marginBottom: '1.75rem' }}>
          <StatPill icon={Users}       label="Active Employees"   value={employees.length}                  color="#8b5cf6" />
          <StatPill icon={Calendar}    label="Total Check-ins"    value={totalPresent}                      color="#10b981" />
          <StatPill icon={Clock}       label="Avg Hours Worked"   value={`${avgHrs}h`}                      color="#06b6d4" />
          <StatPill icon={TrendingUp}  label="Est. Month Payroll" value={`₹${(totalPayroll/1000).toFixed(1)}k`} color="#34d399" />
        </div>

        {/* ── Top / Bottom Performers Row ─────────────────────── */}
        {empStats.length >= 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 22, padding: '1.4rem 1.6rem', display: 'flex', alignItems: 'center', gap: '1.1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'rgba(16,185,129,0.06)', borderRadius: '50%', filter: 'blur(30px)' }} />
              <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.15)', borderRadius: 14, display: 'inline-flex' }}>
                <Award size={22} color="#34d399" />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top Performer</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 900, fontSize: '1.15rem', color: '#f8fafc' }}>{topPerformer?.fullName}</p>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                  {topPerformer?.facePresent} check-ins &middot; {fmtHrs(topPerformer?.hours || 0)} &middot; ₹{(topPerformer?.finalSal || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(244,63,94,0.22)', borderRadius: 22, padding: '1.4rem 1.6rem', display: 'flex', alignItems: 'center', gap: '1.1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'rgba(244,63,94,0.06)', borderRadius: '50%', filter: 'blur(30px)' }} />
              <div style={{ padding: '0.75rem', background: 'rgba(244,63,94,0.15)', borderRadius: 14, display: 'inline-flex' }}>
                <TrendingDown size={22} color="#f43f5e" />
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Needs Attention</span>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 900, fontSize: '1.15rem', color: '#f8fafc' }}>{bottomPerformer?.fullName}</p>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                  {bottomPerformer?.facePresent} check-ins &middot; {fmtHrs(bottomPerformer?.hours || 0)} &middot; ₹{(bottomPerformer?.finalSal || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Analytical Charts Row ─────────────────────────────── */}
        {empStats.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 310px', gap: '1.5rem', marginBottom: '2rem', alignItems: 'start' }}>

            {/* Recharts Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: isMobile ? '1.1rem' : '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(99,102,241,0.15)', borderRadius: 11 }}>
                  <BarChart2 size={18} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.98rem', color: '#f1f5f9' }}>Attendance &amp; Hours worked</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>Hours worked vs target vs check-ins in {monthLabel}</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }} barGap={5}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#64748b', paddingTop: '10px' }} iconType="circle" />
                  <defs>
                    <linearGradient id="gWorked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="gTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gFace" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="Target"        fill="url(#gTarget)" radius={[5,5,0,0]} maxBarSize={28} />
                  <Bar dataKey="Hours Worked"  fill="url(#gWorked)" radius={[5,5,0,0]} maxBarSize={28} />
                  <Bar dataKey="Face Check-ins" fill="url(#gFace)"   radius={[5,5,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Recharts Pie Chart (Hidden on mobile view as requested) */}
            {!isMobile && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(52,211,153,0.15)', borderRadius: 11 }}>
                    <Users size={18} color="#34d399" />
                  </div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9' }}>Attendance Rate</h3>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', marginTop: '0.75rem' }}>
                        {pieData.map((d, i) => (
                          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>{d.name}</span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#f1f5f9' }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#334155', padding: '2rem 0' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>No data for chart</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Payroll Breakdown Table ───────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, overflow: 'hidden', marginBottom: '2rem' }}>

          <div style={{ padding: '1.4rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>Payroll Breakdown — {monthLabel}</h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#475569' }}>
                {fsLoading ? 'Updating records…' : `${empStats.length} staff member${empStats.length !== 1 ? 's' : ''} monitored`}
              </p>
            </div>
            {fsLoading && (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex', color: '#475569' }}>
                <RefreshCw size={16} />
              </motion.span>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {empStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#334155' }}>
                <Calendar size={42} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>No records found for {monthLabel}</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['#', 'Employee', 'Base Salary', 'Days Logged', 'Face Check-ins', 'Hours Worked', 'Target Progress', 'Full Days', 'Late', 'OT', 'Est. Salary'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: '#475569', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empStats.map((e, idx) => (
                    <motion.tr key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * idx }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', color: '#334155', fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>
                            {e.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#f1f5f9', whiteSpace: 'nowrap' }}>{e.fullName}</p>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#475569' }}>ID: {e.id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>₹{e.baseSalary?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee', padding: '0.2rem 0.55rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                          {e.days} / {settings.workingDays}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '0.2rem 0.55rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                          {e.facePresent} check-ins
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: e.pct >= 100 ? '#34d399' : '#f8fafc' }}>{fmtHrs(e.hours)}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 64, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${e.pct}%`, height: '100%', background: e.pct >= 100 ? '#34d399' : e.pct >= 70 ? '#fbbf24' : '#f43f5e', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{e.pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>{e.fullDays}</span></td>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>{e.lateDays}</span></td>
                      <td style={{ padding: '1rem' }}><span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>{e.otDays}</span></td>
                      <td style={{ padding: '1rem' }}>
                        <span className="text-gradient" style={{ fontSize: '1.05rem', fontWeight: 900 }}>₹{e.finalSal.toLocaleString('en-IN')}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

      </div>
    </Layout>
  );
};

export default Reports;
