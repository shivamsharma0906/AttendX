import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Trash2, Edit3, X, CheckCircle,
  Clock, AlertCircle, Filter, ChevronDown, Save,
  Calendar, Flag, RefreshCw, ClipboardList
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  createTask, getAllTasks, updateTask, deleteTask
} from '../services/firestoreService';
import { getFirestore, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { app } from '../services/firebase';

const db = getFirestore(app);

// ── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.28)' },
  medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.28)' },
  low:    { label: 'Low',    color: '#34d399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.28)' },
};

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  icon: Clock },
  in_progress: { label: 'In Progress', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: RefreshCw },
  completed:   { label: 'Completed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle },
  overdue:     { label: 'Overdue',     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: AlertCircle },
};

const todayStr = new Date().toISOString().split('T')[0];

function computeDisplayStatus(task) {
  if (task.status === 'completed') return 'completed';
  if (task.dueDate && task.dueDate < todayStr && task.status !== 'completed') return 'overdue';
  return task.status;
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <Flag size={10} /> {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '0.2rem 0.7rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

// ── Task Form Modal ──────────────────────────────────────────────────────────
function TaskModal({ task, employees, onClose, onSaved, adminName }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignedEmployeeId: task?.assignedEmployeeId || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate || '',
    status: task?.status || 'pending',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedEmp = employees.find(e => String(e.id) === String(form.assignedEmployeeId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Task title is required.'); return; }
    if (!form.assignedEmployeeId) { toast.error('Please select an employee.'); return; }
    if (!form.dueDate) { toast.error('Due date is required.'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateTask(task.id, {
          title: form.title,
          description: form.description,
          assignedEmployeeId: String(form.assignedEmployeeId),
          assignedEmployeeName: selectedEmp?.name || '',
          priority: form.priority,
          dueDate: form.dueDate,
          status: form.status,
        });
        toast.success('Task updated successfully!');
      } else {
        await createTask({
          title: form.title,
          description: form.description,
          assignedEmployeeId: String(form.assignedEmployeeId),
          assignedEmployeeName: selectedEmp?.name || '',
          priority: form.priority,
          dueDate: form.dueDate,
          createdBy: adminName || 'Admin',
        });
        toast.success('Task created and assigned!');
      }
      onSaved();
    } catch {
      toast.error('Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '0.65rem 0.9rem', color: '#f1f5f9', fontFamily: 'inherit',
    fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle = { color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93 }}
        style={{ position: 'relative', width: '100%', maxWidth: 560, background: 'rgba(12,14,24,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2rem', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>{isEdit ? 'Edit Task' : 'Create New Task'}</h2>
            <p style={{ margin: '0.2rem 0 0', color: '#475569', fontSize: '0.8rem' }}>Fill in the task details and assign to an employee.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Task Title *</label>
            <input style={inputStyle} placeholder="e.g. Prepare monthly sales report" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Optional details..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Assign To *</label>
              <select style={inputStyle} value={form.assignedEmployeeId} onChange={e => set('assignedEmployeeId', e.target.value)}>
                <option value="">-- Select Employee --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id} style={{ background: '#0d1117' }}>
                    {e.name} (#{e.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high" style={{ background: '#0d1117' }}>🔴 High</option>
                <option value="medium" style={{ background: '#0d1117' }}>🟡 Medium</option>
                <option value="low" style={{ background: '#0d1117' }}>🟢 Low</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Due Date *</label>
              <input type="date" style={inputStyle} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            {isEdit && (
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="pending" style={{ background: '#0d1117' }}>Pending</option>
                  <option value="in_progress" style={{ background: '#0d1117' }}>In Progress</option>
                  <option value="completed" style={{ background: '#0d1117' }}>Completed</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '0.65rem 1.2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Cancel
            </button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={saving}
              style={{ padding: '0.65rem 1.4rem', background: 'linear-gradient(135deg,#818cf8,#6366f1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {isEdit ? 'Save Changes' : 'Create Task'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Tasks Page ──────────────────────────────────────────────────────────
const Tasks = () => {
  const { employees: storeEmployees, user } = useAppStore();
  const [employees, setEmployees] = useState(storeEmployees || []);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterEmp, setFilterEmp] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load employees from Firestore if store is empty
  useEffect(() => {
    if (employees.length > 0) return;
    let active = true;
    getDocs(collection(db, 'employees')).then(snap => {
      if (!active) return;
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(list);
    }).catch(() => {
      if (active) setEmployees([]);
    });
    return () => { active = false; };
  }, [employees.length]);

  // Real-time listener
  useEffect(() => {
    let q;
    try {
      q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    } catch {
      q = collection(db, 'tasks');
    }
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, () => {
      getAllTasks().then(t => { setTasks(t); setLoading(false); });
    });
    return () => unsub();
  }, []);

  const handleDelete = useCallback(async (taskId) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted.');
      setConfirmDelete(null);
    } catch {
      toast.error('Failed to delete task.');
    }
  }, []);

  const filtered = tasks.filter(t => {
    const ds = computeDisplayStatus(t);
    if (filterEmp !== 'all' && String(t.assignedEmployeeId) !== String(filterEmp)) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && ds !== filterStatus) return false;
    if (searchQ && !t.title?.toLowerCase().includes(searchQ.toLowerCase()) &&
        !t.assignedEmployeeName?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => computeDisplayStatus(t) === 'pending').length,
    inProgress: tasks.filter(t => computeDisplayStatus(t) === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => computeDisplayStatus(t) === 'overdue').length,
  };

  const isMobile = useIsMobile();

  return (
    <Layout>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' } }} />

      <div style={{ width: '100%', padding: isMobile ? '0 0.5rem' : '0 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Task <span className="text-gradient">Management</span> 📋
            </h1>
            <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.85rem' }}>Create, assign and track tasks across your team in real-time.</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setEditTask(null); setShowModal(true); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg,#818cf8,#6366f1)', border: 'none', borderRadius: 14, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(99,102,241,0.35)', width: isMobile ? '100%' : 'auto' }}>
            <Plus size={16} /> New Task
          </motion.button>
        </motion.div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? '0.75rem' : '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Tasks', value: stats.total, color: '#818cf8' },
            { label: 'Pending', value: stats.pending, color: '#94a3b8' },
            { label: 'In Progress', value: stats.inProgress, color: '#6366f1' },
            { label: 'Completed', value: stats.completed, color: '#34d399' },
            { label: 'Overdue', value: stats.overdue, color: '#f43f5e' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(20px)', border: `1px solid ${s.color}20`, borderRadius: 18, padding: isMobile ? '1rem' : '1.2rem 1.4rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -18, right: -18, width: 60, height: 60, background: s.color + '0f', borderRadius: '50%', filter: 'blur(16px)' }} />
              <p style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          
          <div style={{ position: 'relative', width: '100%', flex: isMobile ? 'none' : '2 1 200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input placeholder="Search tasks or employee…" value={searchQ} onChange={e => setSearchQ(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.2rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.55rem 0.9rem 0.55rem 2.2rem', color: '#f1f5f9', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {[
            { label: 'Employee', value: filterEmp, onChange: setFilterEmp,
              options: [{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: String(e.id), label: `${e.name} (#${e.id})` }))] },
            { label: 'Priority', value: filterPriority, onChange: setFilterPriority,
              options: [{ value: 'all', label: 'All Priorities' }, { value: 'high', label: '🔴 High' }, { value: 'medium', label: '🟡 Medium' }, { value: 'low', label: '🟢 Low' }] },
            { label: 'Status', value: filterStatus, onChange: setFilterStatus,
              options: [{ value: 'all', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'overdue', label: 'Overdue' }] },
          ].map(f => (
            <div key={f.label} style={{ position: 'relative', flex: '1 1 140px' }}>
              <Filter size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
              <ChevronDown size={13} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
              <select value={f.value} onChange={e => f.onChange(e.target.value)}
                style={{ width: '100%', appearance: 'none', paddingLeft: '2rem', paddingRight: '1.8rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.55rem 1.8rem 0.55rem 2rem', color: '#f1f5f9', fontFamily: 'inherit', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                {f.options.map(o => <option key={o.value} value={o.value} style={{ background: '#0d1117' }}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </motion.div>

        {/* Task Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, overflow: 'hidden', marginBottom: '2rem' }}>

          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
              All Tasks <span style={{ color: '#475569', fontWeight: 500 }}>({filtered.length})</span>
            </h3>
            {loading && <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex', color: '#475569' }}><RefreshCw size={16} /></motion.span>}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#334155' }}>
              <ClipboardList size={44} style={{ opacity: 0.12, marginBottom: '1rem' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>{loading ? 'Loading tasks…' : 'No tasks found. Create the first one!'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Task', 'Assigned To', 'Priority', 'Due Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 1rem', textAlign: 'left', color: '#475569', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task, idx) => {
                    const ds = computeDisplayStatus(task);
                    const isOD = ds === 'overdue';
                    return (
                      <motion.tr key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '1rem' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#f1f5f9', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                          {task.description && <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#475569', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#818cf8,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                              {(task.assignedEmployeeName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{task.assignedEmployeeName || '—'}</p>
                              <p style={{ margin: 0, fontSize: '0.67rem', color: '#475569' }}>ID: {task.assignedEmployeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}><PriorityBadge priority={task.priority} /></td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: isOD ? '#f43f5e' : '#94a3b8' }}>
                            {task.dueDate || '—'}
                          </span>
                          {isOD && <p style={{ margin: '0.1rem 0 0', fontSize: '0.65rem', color: '#f43f5e', fontWeight: 700 }}>OVERDUE</p>}
                        </td>
                        <td style={{ padding: '1rem' }}><StatusBadge status={ds} /></td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => { setEditTask(task); setShowModal(true); }}
                              title="Edit Task"
                              style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 10, color: '#818cf8', cursor: 'pointer', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}>
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => setConfirmDelete(task)}
                              title="Delete Task"
                              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, color: '#f43f5e', cursor: 'pointer', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <TaskModal
            task={editTask}
            employees={employees}
            adminName={user?.name}
            onClose={() => { setShowModal(false); setEditTask(null); }}
            onSaved={() => { setShowModal(false); setEditTask(null); }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: 'relative', background: 'rgba(12,14,24,0.98)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 22, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Trash2 size={24} color="#f43f5e" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontWeight: 900 }}>Delete Task?</h3>
              <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                &quot;<strong style={{ color: '#f1f5f9' }}>{confirmDelete.title}</strong>&quot; will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => setConfirmDelete(null)}
                  style={{ padding: '0.65rem 1.4rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#64748b', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(confirmDelete.id)}
                  style={{ padding: '0.65rem 1.4rem', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 12, color: '#f43f5e', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Tasks;
