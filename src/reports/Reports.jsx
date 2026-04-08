import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { calcHours, calcFinalSalary, fmtHrs, STATUS_COLORS, getStatus } from '../utils/calc';
import useStore from '../store/useAppStore';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
      <p style={{ margin: '0 0 0.3rem', fontWeight: 700 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: 0, color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const Reports = () => {
  const { employees, records, settings } = useStore();

  const [curMonth, setCurMonth] = React.useState(format(new Date(), 'yyyy-MM'));

  const targetHrs = settings.workingDays * settings.hoursPerDay;

  /* ── Per-employee stats for selected month ── */
  const empStats = useMemo(() => {
    return employees.map(emp => {
      const recs = records.filter(r => r.empId === emp.id && r.date.startsWith(curMonth));
      const totalHrs  = recs.reduce((s, r) => s + calcHours(r.inTime, r.outTime), 0);
      const fullDays  = recs.filter(r => { const h = calcHours(r.inTime, r.outTime); return h >= 9; }).length;
      const halfDays  = recs.filter(r => { const h = calcHours(r.inTime, r.outTime); return h > 0 && h < 4.5; }).length;
      const otDays    = recs.filter(r => calcHours(r.inTime, r.outTime) > 9).length;
      const lateDays  = recs.filter(r => { const [h,m] = (r.inTime||'00:00').split(':').map(Number); return h > 9 || (h===9 && m>15); }).length;
      const finalSal  = calcFinalSalary(emp.baseSalary, totalHrs, targetHrs);

      return {
        id: emp.id, name: emp.name.split(' ')[0], fullName: emp.name,
        baseSalary: emp.baseSalary, days: recs.length, hours: +totalHrs.toFixed(1),
        fullDays, halfDays, otDays, lateDays, finalSal: +finalSal.toFixed(0), targetHrs
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [employees, records, curMonth, targetHrs]);

  const top    = empStats[0];
  const bottom = empStats[empStats.length - 1];

  const chartData = empStats.map(e => ({
    name:   e.name,
    'Hours Worked': e.hours,
    'Target': settings.hoursPerDay * settings.workingDays,
    'Final Salary (₹)': e.finalSal,
  }));

  /* ── Month picker ── */
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(format(d, 'yyyy-MM'));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.2rem', fontWeight: 800, fontSize: '1.4rem' }}>Reports & <span className="tg">Analytics</span></h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Monthly payroll comparison and performance insights</p>
        </div>
        <select className="ipt" value={curMonth} onChange={e => setCurMonth(e.target.value)} style={{ minWidth: 160 }}>
          {months.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
        </select>
      </div>

      {/* ── Top/Bottom cards ── */}
      {empStats.length >= 2 && (
        <div className="r-grid-1-1">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass" style={{ borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Award size={18} color="#34d399" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top Performer</span>
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>{top?.fullName}</p>
            <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{fmtHrs(top?.hours || 0)} worked — ₹{(top?.finalSal || 0).toLocaleString('en-IN')}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass" style={{ borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(244,63,94,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <TrendingDown size={18} color="#f43f5e" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Needs Attention</span>
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>{bottom?.fullName}</p>
            <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{fmtHrs(bottom?.hours || 0)} worked — ₹{(bottom?.finalSal || 0).toLocaleString('en-IN')}</p>
          </motion.div>
        </div>
      )}

      {/* ── Bar Chart ── */}
      {empStats.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '0.95rem' }}>Hours Worked vs Target</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
              <Bar dataKey="Hours Worked" fill="url(#bv)" radius={[5,5,0,0]} />
              <Bar dataKey="Target" fill="rgba(255,255,255,0.06)" radius={[5,5,0,0]} />
              <defs>
                <linearGradient id="bv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.15} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Detail Table ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Payroll Breakdown — {format(new Date(curMonth + '-01'), 'MMMM yyyy')}</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {empStats.length === 0 ? (
            <p style={{ padding: '2rem', color: '#475569', textAlign: 'center' }}>No data for this month.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Base Salary</th>
                  <th>Days</th>
                  <th>Hours Worked</th>
                  <th>Target Hours</th>
                  <th>Full Days</th>
                  <th>Half Days</th>
                  <th>OT Days</th>
                  <th>Late</th>
                  <th>Final Salary</th>
                </tr>
              </thead>
              <tbody>
                {empStats.map((e, i) => {
                  const pct = Math.min(Math.round((e.hours / e.targetHrs) * 100), 100);
                  return (
                    <tr key={e.id}>
                      <td style={{ color: '#475569' }}>#{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{e.fullName}</td>
                      <td style={{ color: '#94a3b8' }}>₹{e.baseSalary.toLocaleString('en-IN')}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}>
                          {e.days}/{settings.workingDays}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#34d399' : pct >= 80 ? '#fbbf24' : '#f43f5e', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{fmtHrs(e.hours)}</span>
                        </div>
                      </td>
                      <td style={{ color: '#64748b' }}>{e.targetHrs}h</td>
                      <td><span className="badge" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>{e.fullDays}</span></td>
                      <td><span className="badge" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{e.halfDays}</span></td>
                      <td><span className="badge" style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>{e.otDays}</span></td>
                      <td><span className="badge" style={{ background: 'rgba(244,63,94,0.12)', color: '#f87171' }}>{e.lateDays}</span></td>
                      <td>
                        <span className="tg" style={{ fontWeight: 900, fontSize: '1rem' }}>₹{e.finalSal.toLocaleString('en-IN')}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
