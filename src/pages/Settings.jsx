import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Calendar, Shield, Award, Settings as SettingsIcon,
  Plus, Trash2, Save, RefreshCw, AlertTriangle, Coffee
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const S = {
  tabButton: (isActive) => ({
    padding: '0.75rem 1.25rem',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    background: isActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
    color: isActive ? '#818cf8' : '#64748b',
    outline: isActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  }),
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    flex: '1 1 200px'
  },
  label: {
    color: '#94a3b8',
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }
};

const Settings = () => {
  const { settings, updateSettings, fetchSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState('timing');
  const [loading, setLoading] = useState(false);

  // Form states matching store keys
  const [workingDays, setWorkingDays] = useState(26);
  const [hoursPerDay, setHoursPerDay] = useState(9);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [weeklyOffs, setWeeklyOffs] = useState(['Sunday']);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [breakDuration, setBreakDuration] = useState(60);
  const [overtimeMinHrs, setOvertimeMinHrs] = useState(9);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(1.5);
  const [halfDayMaxHrs, setHalfDayMaxHrs] = useState(4.5);
  const [fullDayMinHrs, setFullDayMinHrs] = useState(9);
  const [cutoffTime, setCutoffTime] = useState('11:00');
  const [allocatedLeaves, setAllocatedLeaves] = useState(12);
  const [payrollMultiplier, setPayrollMultiplier] = useState(1.0);

  // Holiday list local state
  const [holidays, setHolidays] = useState([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchSettings();
      setLoading(false);
    };
    init();
  }, [fetchSettings]);

  // Sync form states with store when loaded
  useEffect(() => {
    if (settings) {
      setWorkingDays(settings.workingDays ?? 26);
      setHoursPerDay(settings.hoursPerDay ?? 9);
      setShiftStart(settings.shiftStart ?? '09:00');
      setShiftEnd(settings.shiftEnd ?? '18:00');
      setWeeklyOffs(settings.weeklyOffs ?? ['Sunday']);
      setGracePeriod(settings.gracePeriod ?? 15);
      setBreakDuration(settings.breakDuration ?? 60);
      setOvertimeMinHrs(settings.overtimeMinHrs ?? 9);
      setOvertimeMultiplier(settings.overtimeMultiplier ?? 1.5);
      setHalfDayMaxHrs(settings.halfDayMaxHrs ?? 4.5);
      setFullDayMinHrs(settings.fullDayMinHrs ?? 9);
      setCutoffTime(settings.cutoffTime ?? '11:00');
      setAllocatedLeaves(settings.allocatedLeaves ?? 12);
      setPayrollMultiplier(settings.payrollMultiplier ?? 1.0);
      setHolidays(settings.holidays ?? []);
    }
  }, [settings]);

  const handleWeeklyOffToggle = (day) => {
    setWeeklyOffs(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast.error('Please fill both holiday name and date.');
      return;
    }
    const newHoliday = { date: newHolidayDate, name: newHolidayName.trim() };
    setHolidays(prev => [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHolidayName('');
    setNewHolidayDate('');
    toast.success('Holiday added to policy.');
  };

  const handleDeleteHoliday = (indexToDelete) => {
    setHolidays(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const updated = {
        workingDays: Number(workingDays),
        hoursPerDay: Number(hoursPerDay),
        shiftStart,
        shiftEnd,
        weeklyOffs,
        gracePeriod: Number(gracePeriod),
        breakDuration: Number(breakDuration),
        overtimeMinHrs: Number(overtimeMinHrs),
        overtimeMultiplier: Number(overtimeMultiplier),
        halfDayMaxHrs: Number(halfDayMaxHrs),
        fullDayMinHrs: Number(fullDayMinHrs),
        cutoffTime,
        allocatedLeaves: Number(allocatedLeaves),
        payrollMultiplier: Number(payrollMultiplier),
        holidays
      };
      
      updateSettings(updated);
      toast.success('Global policy settings saved to Firestore! 🛡️');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'timing', label: 'Shift Timings', icon: Clock },
    { id: 'workdays', label: 'Workdays & Offs', icon: Calendar },
    { id: 'rules', label: 'Attendance Rules', icon: Shield },
    { id: 'leave', label: 'Leave & Payroll', icon: Award }
  ];

  return (
    <Layout>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' } }} />
      
      {/* Ambient backgrounds */}
      <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'fixed', top: '-15%', left: '-15%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ width: '100%', padding: '0 2rem', position: 'relative', zIndex: 10 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Policy <span className="text-gradient">Settings</span> ⚙️
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.85rem' }}>Configure global work rules, holidays, check-in cutoff, shifts and payroll formulas.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSaveSettings} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 14, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}>
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </motion.button>
          </div>
        </motion.div>

        {/* ── Main Content Container ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Navigation Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={S.tabButton(activeTab === tab.id)}>
                {React.createElement(tab.icon, { size: 16 })}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Form Panel */}
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '2rem' }}>
            
            <AnimatePresence mode="wait">
              {activeTab === 'timing' && (
                <motion.div key="timing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800 }}>Shift Timing & Cutoffs</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Specify work shifts, lunch breaks and when check-in shuts down for the day.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Shift Starts At</label>
                      <input type="time" className="input-field" value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Shift Ends At</label>
                      <input type="time" className="input-field" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Late Check-in Grace Period (Mins)</label>
                      <input type="number" className="input-field" placeholder="15" value={gracePeriod} onChange={e => setGracePeriod(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Attendance Cutoff Time</label>
                      <input type="time" className="input-field" value={cutoffTime} onChange={e => setCutoffTime(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Break/Lunch Duration (Mins)</label>
                      <div style={{ position: 'relative' }}>
                        <Coffee size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                        <input type="number" className="input-field" style={{ paddingLeft: '2.2rem' }} placeholder="60" value={breakDuration} onChange={e => setBreakDuration(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ flex: '1 1 200px' }} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'workdays' && (
                <motion.div key="workdays" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800 }}>Workdays & Public Holidays</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Configure weekly operating days, off-days, and custom calendar holidays.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Operating Days Per Month</label>
                      <input type="number" className="input-field" placeholder="26" value={workingDays} onChange={e => setWorkingDays(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Expected Working Hours Per Day</label>
                      <input type="number" className="input-field" placeholder="9" value={hoursPerDay} onChange={e => setHoursPerDay(e.target.value)} />
                    </div>
                  </div>

                  {/* Weekly Off checklist */}
                  <div>
                    <label style={{ ...S.label, display: 'block', marginBottom: '0.75rem' }}>Weekly Off Days</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {DAYS_OF_WEEK.map(day => {
                        const isOff = weeklyOffs.includes(day);
                        return (
                          <button key={day} type="button" onClick={() => handleWeeklyOffToggle(day)}
                            style={{
                              padding: '0.5rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s',
                              background: isOff ? 'rgba(244,63,94,0.18)' : 'rgba(255,255,255,0.03)',
                              color: isOff ? '#f43f5e' : '#64748b',
                              outline: isOff ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(255,255,255,0.06)'
                            }}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Holidays Section */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                    <label style={{ ...S.label, display: 'block', marginBottom: '1rem' }}>Calendar Holidays Policy</label>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
                      <input type="text" className="input-field" placeholder="Holiday Title (e.g. Diwali)" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} style={{ flex: 2, minWidth: 180 }} />
                      <input type="date" className="input-field" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                      <button type="button" onClick={handleAddHoliday}
                        style={{ padding: '0.65rem 1rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit' }}>
                        <Plus size={14} /> Add Holiday
                      </button>
                    </div>

                    {holidays.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', fontStyle: 'italic' }}>No custom holidays added yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
                        {holidays.map((h, index) => (
                          <div key={index} style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>{h.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#818cf8' }}>{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              <button type="button" onClick={() => handleDeleteHoliday(index)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', display: 'flex' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'rules' && (
                <motion.div key="rules" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800 }}>Attendance &amp; Performance Rules</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Define thresholds for overtime limits, full day hours, and half day cutoffs.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Min Hours for Full Day</label>
                      <input type="number" step="0.5" className="input-field" placeholder="9" value={fullDayMinHrs} onChange={e => setFullDayMinHrs(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Max Hours for Half Day</label>
                      <input type="number" step="0.5" className="input-field" placeholder="4.5" value={halfDayMaxHrs} onChange={e => setHalfDayMaxHrs(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Min Hours for Overtime (Per Day)</label>
                      <input type="number" step="0.5" className="input-field" placeholder="9" value={overtimeMinHrs} onChange={e => setOvertimeMinHrs(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Overtime Pay Multiplier</label>
                      <input type="number" step="0.1" className="input-field" placeholder="1.5" value={overtimeMultiplier} onChange={e => setOvertimeMultiplier(e.target.value)} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 16, padding: '1rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                    <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.5 }}>
                      <strong>Rule Notice:</strong> If an employee works fewer hours than the <em>Max Hours for Half Day</em>, their status will fall back to Absent automatically unless approved leave is recorded.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'leave' && (
                <motion.div key="leave" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800 }}>Leave &amp; Payroll Formula</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Establish annual allocations for paid leave, base calculations and salary multiplier factors.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={S.formGroup}>
                      <label style={S.label}>Annual Allocated Paid Leaves</label>
                      <input type="number" className="input-field" placeholder="12" value={allocatedLeaves} onChange={e => setAllocatedLeaves(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Payroll Base Pay Multiplier</label>
                      <input type="number" step="0.05" className="input-field" placeholder="1.0" value={payrollMultiplier} onChange={e => setPayrollMultiplier(e.target.value)} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>

      </div>
    </Layout>
  );
};

export default Settings;
