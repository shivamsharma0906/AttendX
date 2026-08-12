import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import {
  Users, Plus, Trash2, Camera, Calendar,
  CheckCircle, Clock, RefreshCw, X, BarChart2,
  Search, ShieldCheck, AlertCircle, TrendingUp, DollarSign, Percent,
  Grid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAllEmployeeEncodings, logAuditEvent } from '../services/firestoreService';
import FaceScanner from '../components/FaceScanner';
import { registerFace } from '../services/faceApi';
import { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { app } from '../services/firebase';
import toast, { Toaster } from 'react-hot-toast';

const db = getFirestore(app);

/* ── Mobile Responsive Hook ─────────────────────────────────── */
const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

/* ── Avatar Gradient Generator ────────────────────────────── */
const AVATAR_COLORS = [
  ['#2563eb', '#38bdf8'],
  ['#7c3aed', '#a78bfa'],
  ['#059669', '#34d399'],
  ['#d97706', '#fbbf24'],
  ['#db2777', '#f472b6'],
  ['#0891b2', '#06b6d4'],
];
const avatarGrad = (i) => `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length][0]}, ${AVATAR_COLORS[i % AVATAR_COLORS.length][1]})`;

/* ── Step Indicator ─────────────────────────────────────────── */
const StepDots = ({ step }) => (
  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
    {[1, 2].map(n => (
      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.75rem',
          background: n < step ? '#10b981' : n === step ? 'linear-gradient(135deg,#2563eb,#38bdf8)' : 'rgba(255,255,255,0.07)',
          color: n <= step ? '#fff' : '#475569',
          boxShadow: n === step ? '0 0 14px rgba(37,99,235,0.5)' : 'none',
          transition: 'all 0.3s',
        }}>
          {n < step ? <CheckCircle size={13} /> : n}
        </div>
        {n < 2 && <div style={{ width: 24, height: 2, background: n < step ? '#10b981' : 'rgba(255,255,255,0.08)', borderRadius: 2 }} />}
      </div>
    ))}
  </div>
);

/* ── Main Employees Component ───────────────────────────────── */
const Employees = () => {
  const isMobile = useIsMobile();
  const { employees, records, addEmployee, updateEmployee, removeEmployee } = useAppStore();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'enrolled' | 'missing'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  /* Registration wizard */
  const [showWizard, setShowWizard]         = useState(false);
  const [wizardStep, setWizardStep]         = useState(1);
  const [newName, setNewName]               = useState('');
  const [newSalary, setNewSalary]           = useState('');
  const [capturedImages, setCapturedImages] = useState([]);
  const [scanStatus, setScanStatus]         = useState('idle');
  const [isRegistering, setIsRegistering]   = useState(false);
  const [registeredFaceIds, setRegisteredFaceIds] = useState(new Set());

  /* Attendance modal */
  const [attendanceModal, setAttendanceModal]           = useState(null);
  const [empAttendance, setEmpAttendance]               = useState([]);
  const [empAttendanceLoading, setEmpAttendanceLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter]         = useState('all');

  /* Salary Hike modal */
  const [hikeEmp, setHikeEmp]               = useState(null);
  const [hikeType, setHikeType]             = useState('percentage'); // 'percentage' | 'flat'
  const [hikeValue, setHikeValue]           = useState('');
  const [hikeReason, setHikeReason]         = useState('');
  const [hikeSubmitting, setHikeSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const fmtDate  = (s) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  /* Load face statuses */
  useEffect(() => {
    fetchAllEmployeeEncodings()
      .then(encs => setRegisteredFaceIds(new Set(encs.map(e => String(e.employeeId)))))
      .catch(() => {});
  }, []);

  /* Salary Hike Handlers */
  const openHikeModal = (emp) => {
    setHikeEmp(emp);
    setHikeType('percentage');
    setHikeValue('10');
    setHikeReason('Annual Performance Appraisal');
  };

  const closeHikeModal = () => {
    setHikeEmp(null);
    setHikeValue('');
    setHikeReason('');
  };

  const handleApplyHike = async (e) => {
    e.preventDefault();
    if (!hikeEmp || !hikeValue || isNaN(Number(hikeValue)) || Number(hikeValue) <= 0) {
      toast.error('Please enter a valid positive hike value.');
      return;
    }
    setHikeSubmitting(true);
    const oldSalary = Number(hikeEmp.baseSalary || 0);
    const hikeNum = Number(hikeValue);
    let newSalary = oldSalary;
    if (hikeType === 'percentage') {
      newSalary = Math.round(oldSalary + (oldSalary * hikeNum) / 100);
    } else {
      newSalary = Math.round(oldSalary + hikeNum);
    }

    try {
      updateEmployee(hikeEmp.id, {
        baseSalary: newSalary,
        lastHikeDate: todayStr,
        lastHikeReason: hikeReason.trim(),
      });

      await setDoc(doc(db, 'employees', String(hikeEmp.id)), {
        baseSalary: newSalary,
        lastHikeDate: todayStr,
        lastHikeReason: hikeReason.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      logAuditEvent({
        actor: 'Admin',
        action: 'SALARY_HIKE',
        target: hikeEmp.name,
        details: `Base salary increased from ₹${oldSalary.toLocaleString('en-IN')} to ₹${newSalary.toLocaleString('en-IN')} (${hikeType === 'percentage' ? `+${hikeNum}%` : `+₹${hikeNum}`}). Reason: ${hikeReason.trim()}`,
      });

      toast.success(`Salary hike applied for ${hikeEmp.name}! 🚀`, { duration: 4000 });
      closeHikeModal();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update salary in cloud database.');
    } finally {
      setHikeSubmitting(false);
    }
  };

  /* Wizard handlers */
  const openWizard = () => { setShowWizard(true); setWizardStep(1); setNewName(''); setNewSalary(''); setCapturedImages([]); setScanStatus('idle'); };
  const closeWizard = () => { setShowWizard(false); setWizardStep(1); setNewName(''); setNewSalary(''); setCapturedImages([]); };

  const handleProceedToScan = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newSalary) { toast.error('Please enter name and salary.'); return; }
    setCapturedImages([]); setScanStatus('scanning'); setWizardStep(2);
  };

  const handleFaceCapture = useCallback(async (base64) => {
    setCapturedImages(prev => {
      const next = [...prev, base64];
      if (next.length >= 3) setScanStatus('success');
      return next;
    });
  }, []);

  const handleFinalRegister = async () => {
    if (capturedImages.length < 3) { toast.error('Please capture all 3 face images.'); return; }
    setIsRegistering(true);
    let nextId = 100;
    if (employees?.length > 0) {
      const ids = employees
        .map(e => parseInt(e.id || e.employeeId, 10))
        .filter(n => !isNaN(n) && n >= 100 && n < 100000);
      if (ids.length > 0) nextId = Math.max(100, ...ids) + 1;
    }
    const finalEmpId = nextId.toString();
    try {
      const { embeddings } = await registerFace(capturedImages, finalEmpId, newName.trim());
      await setDoc(doc(db, 'employees', finalEmpId), {
        name: newName.trim(), employeeId: finalEmpId,
        faceEmbeddings: embeddings.map(e => JSON.stringify(e)),
        registeredAt: serverTimestamp(),
      }, { merge: true });
      addEmployee({ id: finalEmpId, name: newName.trim(), baseSalary: Number(newSalary), joinDate: todayStr });
      setRegisteredFaceIds(prev => { const n = new Set(prev); n.add(finalEmpId); return n; });
      toast.success(`${newName.trim()} registered! 🎉`, { duration: 4000 });
      closeWizard();
    } catch (err) {
      toast.error(err.message || 'Face enrollment failed.');
      setScanStatus('scanning'); setCapturedImages([]);
    } finally { setIsRegistering(false); }
  };

  /* Attendance modal handlers */
  const fetchEmpAttendance = useCallback(async (empId) => {
    if (!empId) return;
    setEmpAttendanceLoading(true); setEmpAttendance([]);
    try {
      const q = query(collection(db, 'attendance'), where('employeeId', '==', String(empId)), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setEmpAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const q2 = query(collection(db, 'attendance'), where('employeeId', '==', String(empId)));
        const s2 = await getDocs(q2);
        setEmpAttendance(s2.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date > a.date ? 1 : -1));
      } catch (e2) { console.error(e2); }
    } finally { setEmpAttendanceLoading(false); }
  }, []);

  const openAttendanceModal  = (emp) => { setAttendanceModal(emp); setAttendanceFilter('all'); fetchEmpAttendance(emp.id); };
  const closeAttendanceModal = () => { setAttendanceModal(null); setEmpAttendance([]); };

  const filteredEmpAttendance = empAttendance.filter(r => {
    if (attendanceFilter === 'all') return true;
    const rd = new Date(r.date), now = new Date();
    if (attendanceFilter === 'month') return rd.getMonth() === now.getMonth() && rd.getFullYear() === now.getFullYear();
    if (attendanceFilter === 'week') { const w = new Date(); w.setDate(now.getDate() - 7); return rd >= w; }
    return true;
  });

  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase();
    const matchesSearch = e.name.toLowerCase().includes(q) || String(e.id).includes(q);
    if (!matchesSearch) return false;
    const hasFace = registeredFaceIds.has(String(e.id));
    if (filterTab === 'enrolled') return hasFace;
    if (filterTab === 'missing') return !hasFace;
    return true;
  });

  const totalPayrollBudget = employees.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);
  const faceCoverage = employees.length > 0 ? Math.round((registeredFaceIds.size / employees.length) * 100) : 0;

  return (
    <Layout>
      <Toaster position="top-right" toastOptions={{ style: { background: '#080d1a', color: '#f8fafc', border: '1px solid rgba(56,189,248,0.2)' } }} />

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: isMobile ? '0 0.5rem' : '0 1.5rem', overflowX: 'hidden' }}>

        {/* ── Page Header ──────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '1.5rem', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.85rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Workforce <span className="text-gradient">Management</span> 👥
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              {employees.length} staff · {registeredFaceIds.size} biometric enrolled ({faceCoverage}%).
            </p>
          </div>
          <button onClick={openWizard} className="btn-primary" style={{ padding: '0.65rem 1.2rem', fontSize: '0.85rem', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
            <Plus size={16} /> Register New Employee
          </button>
        </div>

        {/* ── 4 Executive KPI Summary Cards ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: isMobile ? '0.65rem' : '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Staff',         value: employees.length,                                    sub: 'Workforce',                    color: '#38bdf8', icon: Users },
            { label: 'Biometric Verified',  value: registeredFaceIds.size,                              sub: `${faceCoverage}% face`,        color: '#10b981', icon: ShieldCheck },
            { label: 'Missing Enrollment',  value: employees.length - registeredFaceIds.size,            sub: 'Action needed',                 color: '#f87171', icon: AlertCircle },
            { label: 'Monthly Payroll',     value: `₹${(totalPayrollBudget/1000).toFixed(1)}k`,         sub: 'Total budget',                 color: '#fbbf24', icon: DollarSign },
          ].map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div key={c.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)', border: `1px solid ${c.color}25`, borderRadius: 16, padding: isMobile ? '0.85rem 1rem' : '1.25rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -25, right: -25, width: 80, height: 80, background: c.color + '12', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ padding: '0.4rem', background: c.color + '18', borderRadius: 9, color: c.color }}>
                    <Icon size={15} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: c.color, fontWeight: 700 }}>{c.sub}</span>
                </div>
                <p style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{c.value}</p>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Filter Bar & View Switcher ────────────────────────── */}
        <div style={{ background: 'rgba(8,14,30,0.7)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 16, padding: isMobile ? '0.75rem' : '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '0.85rem' }}>
          
          {/* Left: Search & Filter Tabs */}
          <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', flex: 1 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: isMobile ? '100%' : 360 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder="Search name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'flex', background: 'rgba(4,8,20,0.6)', padding: '0.2rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
              {[
                { id: 'all', label: `All (${employees.length})` },
                { id: 'enrolled', label: `Enrolled (${registeredFaceIds.size})` },
                { id: 'missing', label: `Missing (${employees.length - registeredFaceIds.size})` },
              ].map(tab => (
                <button key={tab.id} onClick={() => setFilterTab(tab.id)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: filterTab === tab.id ? 'rgba(37,99,235,0.25)' : 'transparent', color: filterTab === tab.id ? '#38bdf8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', flex: isMobile ? 1 : 'none' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Grid vs Table Toggle */}
          <div style={{ display: 'flex', background: 'rgba(4,8,20,0.6)', padding: '0.2rem', borderRadius: 11, border: '1px solid rgba(255,255,255,0.06)', alignSelf: isMobile ? 'flex-end' : 'center' }}>
            <button onClick={() => setViewMode('grid')}
              style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: viewMode === 'grid' ? 'rgba(37,99,235,0.25)' : 'transparent', color: viewMode === 'grid' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700 }}>
              <Grid size={13} /> Grid
            </button>
            <button onClick={() => setViewMode('table')}
              style={{ padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', background: viewMode === 'table' ? 'rgba(37,99,235,0.25)' : 'transparent', color: viewMode === 'table' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700 }}>
              <List size={13} /> Table
            </button>
          </div>
        </div>

        {/* ── Employee Display: Grid or Table ────────────────────── */}
        {filteredEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'rgba(8,14,30,0.85)', borderRadius: 20, border: '1px solid rgba(56,189,248,0.15)', color: '#64748b' }}>
            <Users size={44} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#f8fafc' }}>
              {search ? 'No employees match search' : 'No employees registered'}
            </p>
            <p style={{ fontSize: '0.8rem', margin: '0.3rem 0 1rem' }}>Click below to add your first workforce member.</p>
            <button onClick={openWizard} className="btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem' }}>
              <Plus size={14} /> Register Employee
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          
          /* Grid View */
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem' }}>
            {filteredEmployees.map((emp, i) => {
              const hasFace = registeredFaceIds.has(String(emp.id));
              const logsCount = records.filter(r => String(r.empId) === String(emp.id)).length;
              const displayId = String(emp.id).length > 6 ? (100 + i) : emp.id;

              return (
                <motion.div key={emp.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  style={{
                    background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(56,189,248,0.15)', borderRadius: 18,
                    padding: isMobile ? '1rem' : '1.25rem', position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: 'rgba(37,99,235,0.06)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

                  <div>
                    {/* Header: Avatar + Name + ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarGrad(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '1rem', boxShadow: '0 4px 14px rgba(0,0,0,0.4)', flexShrink: 0 }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>{emp.name}</p>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>#{displayId}</p>
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                        background: hasFace ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)',
                        border: hasFace ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(248,113,113,0.3)',
                        color: hasFace ? '#34d399' : '#f87171',
                      }}>
                        {hasFace ? <ShieldCheck size={11} /> : <AlertCircle size={11} />}
                        {hasFace ? 'Enrolled' : 'No Face'}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.45rem', marginBottom: '1rem' }}>
                      {[
                        ['Base Salary', `₹${Number(emp.baseSalary || 0).toLocaleString('en-IN')}`, '#34d399'],
                        ['Punches', `${logsCount}`, '#38bdf8'],
                        ['Joined', emp.joinDate ? fmtDate(emp.joinDate) : 'Recently', '#94a3b8']
                      ].map(([lbl, val, clr]) => (
                        <div key={lbl} style={{ background: 'rgba(4,8,20,0.6)', borderRadius: 10, padding: '0.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <p style={{ margin: '0 0 0.15rem', fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</p>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.78rem', color: clr, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button onClick={() => openHikeModal(emp)}
                      style={{ flex: 1, minWidth: 65, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.48rem 0.5rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#34d399', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', fontFamily: 'inherit' }}>
                      <TrendingUp size={12} /> Hike
                    </button>
                    <button onClick={() => openAttendanceModal(emp)}
                      style={{ flex: 1, minWidth: 65, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.48rem 0.5rem', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 10, color: '#38bdf8', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', fontFamily: 'inherit' }}>
                      <BarChart2 size={12} /> Logs
                    </button>
                    <button onClick={() => navigate('/admin/register-face', { state: { name: emp.name, id: emp.id } })}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.48rem 0.65rem', background: 'linear-gradient(135deg,#2563eb,#38bdf8)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', fontFamily: 'inherit' }}>
                      <Camera size={12} /> Face
                    </button>
                    <button onClick={() => { if (window.confirm(`Remove ${emp.name}?`)) removeEmployee(emp.id); }}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.48rem 0.55rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 10, color: '#f43f5e', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>

        ) : (

          /* Table View */
          <div style={{ background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 18, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(4,8,20,0.6)' }}>
                    {['Employee', 'ID', 'Base Salary', 'Biometric Face', 'Joined Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 0.85rem', textAlign: 'left', color: '#64748b', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp, i) => {
                    const hasFace = registeredFaceIds.has(String(emp.id));
                    const displayId = String(emp.id).length > 6 ? (100 + i) : emp.id;
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.8rem 0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarGrad(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.85rem' }}>
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 800, color: '#f8fafc' }}>{emp.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.8rem 0.85rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                          #{displayId}
                        </td>
                        <td style={{ padding: '0.8rem 0.85rem', fontWeight: 800, color: '#34d399' }}>
                          ₹{Number(emp.baseSalary || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.8rem 0.85rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.18rem 0.55rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                            background: hasFace ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)',
                            color: hasFace ? '#34d399' : '#f87171',
                          }}>
                            {hasFace ? 'Enrolled' : 'No Face'}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.85rem', color: '#94a3b8' }}>
                          {emp.joinDate ? fmtDate(emp.joinDate) : '—'}
                        </td>
                        <td style={{ padding: '0.8rem 0.85rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button onClick={() => openHikeModal(emp)} className="btn-secondary" style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}>Hike</button>
                            <button onClick={() => openAttendanceModal(emp)} className="btn-secondary" style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}>Logs</button>
                            <button onClick={() => navigate('/admin/register-face', { state: { name: emp.name, id: emp.id } })} className="btn-primary" style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}>Face</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Registration Wizard Modal ─────────────────────────── */}
        <AnimatePresence>
          {showWizard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,17,0.85)', zIndex: 600, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
              onClick={closeWizard}>
              <motion.div initial={{ scale: 0.9, y: 25 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 25 }}
                onClick={e => e.stopPropagation()}
                style={{ background: 'rgba(8,14,30,0.96)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 22, padding: isMobile ? '1.25rem' : '2rem', width: '100%', maxWidth: 520, position: 'relative', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
                
                <button onClick={closeWizard}
                  style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '0.4rem', cursor: 'pointer' }}>
                  <X size={18} />
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#f8fafc' }}>
                      Register <span className="text-gradient">Employee</span>
                    </h2>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      {wizardStep === 1 ? 'Step 1 of 2: Basic Information' : 'Step 2 of 2: Face Enrollment'}
                    </p>
                  </div>
                  <StepDots step={wizardStep} />
                </div>

                {wizardStep === 1 ? (
                  <form onSubmit={handleProceedToScan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>Full Name</label>
                      <input className="input-field" placeholder="e.g. Rahul Sharma" value={newName} onChange={e => setNewName(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>Monthly Base Salary (₹)</label>
                      <input className="input-field" type="number" placeholder="e.g. 25000" value={newSalary} onChange={e => setNewSalary(e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                      <button type="button" onClick={closeWizard} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                      <button type="submit" className="btn-primary" style={{ flex: 1 }}>Proceed to Face Enrollment ➔</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(56,189,248,0.2)' }}>
                      <FaceScanner onFaceCaptured={handleFaceCapture} isScanning={scanStatus === 'scanning'} statusText={capturedImages.length === 0 ? 'Look at camera: Front angle' : capturedImages.length === 1 ? 'Slightly turn head left' : 'Slightly turn head right'} />
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
                      Captured: {capturedImages.length} / 3 photos
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                      <button type="button" onClick={() => setWizardStep(1)} className="btn-secondary" style={{ flex: 1 }}>Back</button>
                      <button type="button" disabled={capturedImages.length < 3 || isRegistering} onClick={handleFinalRegister} className="btn-primary" style={{ flex: 1 }}>
                        {isRegistering ? 'Enrolling…' : 'Complete Registration 🎉'}
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Attendance History Drawer Modal ───────────────────── */}
        <AnimatePresence>
          {attendanceModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,17,0.85)', zIndex: 600, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
              onClick={closeAttendanceModal}>
              <motion.div initial={{ scale: 0.9, y: 25 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 25 }}
                onClick={e => e.stopPropagation()}
                style={{ background: 'rgba(8,14,30,0.96)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 22, padding: isMobile ? '1.25rem' : '2rem', width: '100%', maxWidth: 860, maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
                
                <button onClick={closeAttendanceModal}
                  style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '0.4rem', cursor: 'pointer' }}>
                  <X size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '1rem' }}>
                    {attendanceModal.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#f8fafc' }}>{attendanceModal.name}</h2>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>ID: #{attendanceModal.id} &nbsp;·&nbsp; Attendance History</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {['all', 'month', 'week'].map(f => (
                    <button key={f} onClick={() => setAttendanceFilter(f)}
                      style={{ padding: '0.35rem 0.85rem', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', fontFamily: 'inherit', transition: 'all 0.2s', background: attendanceFilter === f ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)', color: attendanceFilter === f ? '#38bdf8' : '#64748b', outline: attendanceFilter === f ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.07)' }}>
                      {f === 'all' ? 'All Time' : f === 'month' ? 'This Month' : 'This Week'}
                    </button>
                  ))}
                  <button onClick={() => fetchEmpAttendance(attendanceModal.id)} className="btn-secondary" style={{ padding: '0.35rem 0.55rem' }}>
                    <RefreshCw size={14} className={empAttendanceLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {empAttendanceLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading attendance records…</p>
                  </div>
                ) : filteredEmpAttendance.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Calendar size={36} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>No attendance logs found for this filter.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(4,8,20,0.6)' }}>
                          {['Date', 'Day', 'In Time', 'Out Time', 'Source'].map(h => (
                            <th key={h} style={{ padding: '0.75rem 0.85rem', textAlign: 'left', color: '#64748b', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmpAttendance.map((rec, idx) => (
                          <tr key={rec.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#f8fafc' }}>{rec.date}</td>
                            <td style={{ padding: '0.75rem 0.85rem', color: '#94a3b8' }}>{new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short' })}</td>
                            <td style={{ padding: '0.75rem 0.85rem', color: '#34d399', fontFamily: 'monospace', fontWeight: 700 }}>{rec.inTime || '—'}</td>
                            <td style={{ padding: '0.75rem 0.85rem', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>{rec.outTime || '—'}</td>
                            <td style={{ padding: '0.75rem 0.85rem', color: '#64748b', fontSize: '0.75rem' }}>{rec.source || 'Face Kiosk'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Salary Hike Modal ─────────────────────────── */}
        <AnimatePresence>
          {hikeEmp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(4,7,17,0.85)', zIndex: 700, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
              onClick={closeHikeModal}>
              <motion.div initial={{ scale: 0.9, y: 25 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 25 }}
                onClick={e => e.stopPropagation()}
                style={{ background: 'rgba(8,14,30,0.96)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 22, padding: isMobile ? '1.25rem' : '2rem', width: '100%', maxWidth: 480, position: 'relative', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
                
                <button onClick={closeHikeModal}
                  style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', borderRadius: 10, padding: '0.4rem', cursor: 'pointer' }}>
                  <X size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.55rem', background: 'rgba(16,185,129,0.15)', borderRadius: 12, color: '#34d399' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.15rem', color: '#f8fafc' }}>
                      Revise Salary for <span className="text-gradient">{hikeEmp.name}</span>
                    </h2>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                      Employee ID: #{hikeEmp.id}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleApplyHike} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Current vs New Salary Box */}
                  <div style={{ background: 'rgba(4,8,20,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current Base</p>
                      <p style={{ margin: '0.15rem 0 0', fontWeight: 900, fontSize: '1.05rem', color: '#94a3b8' }}>
                        ₹{Number(hikeEmp.baseSalary || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div style={{ color: '#34d399', fontWeight: 900, fontSize: '1.1rem' }}>➔</div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.68rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>New Base</p>
                      <p style={{ margin: '0.15rem 0 0', fontWeight: 900, fontSize: '1.15rem', color: '#34d399' }}>
                        ₹{(() => {
                          const oldS = Number(hikeEmp.baseSalary || 0);
                          const hVal = Number(hikeValue || 0);
                          if (isNaN(hVal) || hVal <= 0) return oldS.toLocaleString('en-IN');
                          const nVal = hikeType === 'percentage' ? Math.round(oldS + (oldS * hVal) / 100) : Math.round(oldS + hVal);
                          return nVal.toLocaleString('en-IN');
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Hike Mode Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.4rem' }}>Hike Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <button type="button" onClick={() => setHikeType('percentage')}
                        style={{ padding: '0.55rem', borderRadius: 10, border: hikeType === 'percentage' ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.08)', background: hikeType === 'percentage' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', color: hikeType === 'percentage' ? '#34d399' : '#94a3b8', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <Percent size={13} /> Percentage (%)
                      </button>
                      <button type="button" onClick={() => setHikeType('flat')}
                        style={{ padding: '0.55rem', borderRadius: 10, border: hikeType === 'flat' ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.08)', background: hikeType === 'flat' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', color: hikeType === 'flat' ? '#34d399' : '#94a3b8', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <DollarSign size={13} /> Fixed Amount (₹)
                      </button>
                    </div>
                  </div>

                  {/* Hike Value Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {hikeType === 'percentage' ? 'Percentage Hike (%)' : 'Increase Amount (₹)'}
                    </label>
                    <input className="input-field" type="number" step="any" min="0.1" placeholder={hikeType === 'percentage' ? 'e.g. 15' : 'e.g. 5000'}
                      value={hikeValue} onChange={e => setHikeValue(e.target.value)} required />
                  </div>

                  {/* Reason */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.35rem' }}>Reason / Remarks</label>
                    <input className="input-field" type="text" placeholder="e.g. Annual Performance Appraisal"
                      value={hikeReason} onChange={e => setHikeReason(e.target.value)} required />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                    <button type="button" onClick={closeHikeModal} className="btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={hikeSubmitting} className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none' }}>
                      {hikeSubmitting ? 'Applying…' : 'Apply Salary Hike 🚀'}
                    </button>
                  </div>
                </form>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  );
};

export default Employees;
