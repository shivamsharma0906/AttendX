import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Clock, AlertCircle, RefreshCw,
  ClipboardList, Calendar, Flag, ChevronRight, X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { getTasksByEmployee, updateTaskStatus } from '../services/firestoreService';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { app } from '../services/firebase';

const db = getFirestore(app);

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.28)' },
  medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.28)' },
  low:    { label: 'Low',    color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.28)' },
};

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Clock },
  in_progress: { label: 'In Progress', color: '#818cf8', bg: 'rgba(129,140,248,0.13)', icon: RefreshCw },
  completed:   { label: 'Completed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle },
  overdue:     { label: 'Overdue',     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: AlertCircle },
};

// Status progression for employees
const NEXT_STATUS = { pending: 'in_progress', in_progress: 'completed' };

const todayStr = new Date().toISOString().split('T')[0];

function computeDisplayStatus(task) {
  if (task.status === 'completed') return 'completed';
  if (task.dueDate && task.dueDate < todayStr && task.status !== 'completed') return 'overdue';
  return task.status;
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800 }}>
      <Flag size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
      {cfg.label}
    </span>
  );
}

// ── Task Card Component ───────────────────────────────────────────────────────
function TaskCard({ task, onUpdateStatus }) {
  const ds = computeDisplayStatus(task);
  const cfg = STATUS_CONFIG[ds] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const next = NEXT_STATUS[task.status];
  const [updating, setUpdating] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const isOverdue = ds === 'overdue';
  const daysUntilDue = task.dueDate
    ? Math.ceil((new Date(task.dueDate) - new Date(todayStr)) / 86400000)
    : null;

  const handleAdvance = async (e) => {
    e.stopPropagation();
    if (!next) return;
    setUpdating(true);
    await onUpdateStatus(task.id, next);
    setUpdating(false);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}
        onClick={() => setShowDetail(true)}
        style={{
          background: 'rgba(14,14,22,0.85)', backdropFilter: 'blur(20px)',
          border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 20, padding: '1.35rem 1.5rem', cursor: 'pointer',
          position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.2s'
        }}>

        {/* Glow */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: cfg.color + '0a', borderRadius: '50%', filter: 'blur(24px)', pointerEvents: 'none' }} />

        {/* Top Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9', flex: 1, lineHeight: 1.35 }}>{task.title}</h3>
          <span style={{ background: cfg.bg, color: cfg.color, padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Icon size={11} /> {cfg.label}
          </span>
        </div>

        {task.description && (
          <p style={{ margin: '0 0 0.85rem', color: '#475569', fontSize: '0.8rem', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {task.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <PriorityBadge priority={task.priority} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isOverdue ? '#f43f5e' : '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            <Calendar size={12} />
            {task.dueDate ? (
              isOverdue
                ? `${Math.abs(daysUntilDue)}d overdue`
                : daysUntilDue === 0 ? 'Due today!'
                : daysUntilDue === 1 ? 'Due tomorrow'
                : `${daysUntilDue}d left`
            ) : 'No due date'}
          </span>
        </div>

        {/* Action button */}
        {next && task.status !== 'completed' && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={handleAdvance}
            disabled={updating}
            style={{
              width: '100%', padding: '0.6rem', background: 'linear-gradient(135deg,rgba(129,140,248,0.18),rgba(99,102,241,0.1))',
              border: '1px solid rgba(129,140,248,0.28)', borderRadius: 12, color: '#a5b4fc', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
            }}>
            {updating ? <RefreshCw size={13} /> : <ChevronRight size={13} />}
            {task.status === 'pending' ? 'Start Task' : 'Mark Complete'}
          </motion.button>
        )}
        {task.status === 'completed' && (
          <div style={{ textAlign: 'center', color: '#34d399', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
            <CheckCircle size={14} /> Task Completed ✓
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDetail(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93 }}
              style={{ position: 'relative', background: 'rgba(12,14,24,0.98)', border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 500, boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
              <button onClick={() => setShowDetail(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
                <X size={20} />
              </button>
              <span style={{ background: cfg.bg, color: cfg.color, padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                <Icon size={12} /> {cfg.label}
              </span>
              <h2 style={{ margin: '0 0 0.5rem', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1.3 }}>{task.title}</h2>
              {task.description && <p style={{ margin: '0 0 1.25rem', color: '#64748b', lineHeight: 1.6, fontSize: '0.88rem' }}>{task.description}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Priority', value: <PriorityBadge priority={task.priority} /> },
                  { label: 'Due Date', value: task.dueDate || '—' },
                  { label: 'Created By', value: task.createdBy || 'Admin' },
                  { label: 'Assigned To', value: task.assignedEmployeeName || '—' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.75rem 1rem' }}>
                    <p style={{ margin: '0 0 0.25rem', color: '#475569', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{m.label}</p>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f1f5f9' }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {next && task.status !== 'completed' && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={(e) => { handleAdvance(e); setShowDetail(false); }}
                  style={{ width: '100%', padding: '0.8rem', background: 'linear-gradient(135deg,#818cf8,#6366f1)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
                  {task.status === 'pending' ? '▶  Start Task' : '✓  Mark as Completed'}
                </motion.button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
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

// ── Main My Tasks Page ────────────────────────────────────────────────────────
const MyTasks = () => {
  const isMobile = useIsMobile();
  const { user } = useAppStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const empId = user?.employeeId || user?.id;

  // Real-time listener
  useEffect(() => {
    if (!empId) return;
    const q = query(collection(db, 'tasks'), where('assignedEmployeeId', '==', String(empId)));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, () => {
      getTasksByEmployee(empId).then(t => { setTasks(t); setLoading(false); });
    });
    return () => unsub();
  }, [empId]);

  const handleUpdateStatus = useCallback(async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success(newStatus === 'completed' ? 'Task completed! 🎉' : 'Task started!');
    } catch {
      toast.error('Failed to update task status.');
    }
  }, []);

  const allDs = tasks.map(t => ({ ...t, _ds: computeDisplayStatus(t) }));
  const filtered = filterStatus === 'all' ? allDs : allDs.filter(t => t._ds === filterStatus);

  const stats = {
    total: tasks.length,
    pending: allDs.filter(t => t._ds === 'pending').length,
    inProgress: allDs.filter(t => t._ds === 'in_progress').length,
    completed: allDs.filter(t => t._ds === 'completed').length,
    overdue: allDs.filter(t => t._ds === 'overdue').length,
  };

  const upcoming = allDs.filter(t => t._ds !== 'completed' && t._ds !== 'overdue' && t.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  const filterBtns = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'in_progress', label: 'In Progress', count: stats.inProgress },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'overdue', label: 'Overdue', count: stats.overdue },
  ];

  return (
    <Layout>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' } }} />

      <div style={{ width: '100%', padding: isMobile ? '0 0.5rem' : '0 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, letterSpacing: '-0.025em' }}>
            My <span className="text-gradient">Tasks</span> 📌
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.85rem' }}>
            Tasks assigned to you · Real-time updates
          </p>
        </motion.div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: isMobile ? '0.75rem' : '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total', value: stats.total, color: '#818cf8' },
            { label: 'Pending', value: stats.pending, color: '#94a3b8' },
            { label: 'In Progress', value: stats.inProgress, color: '#6366f1' },
            { label: 'Completed', value: stats.completed, color: '#34d399' },
            { label: 'Overdue', value: stats.overdue, color: '#f43f5e' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: 'rgba(14,14,22,0.75)', backdropFilter: 'blur(20px)', border: `1px solid ${s.color}20`, borderRadius: 18, padding: isMobile ? '1rem' : '1.1rem 1.3rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -16, right: -16, width: 52, height: 52, background: s.color + '0d', borderRadius: '50%', filter: 'blur(14px)' }} />
              <p style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.7rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Upcoming strip */}
        {upcoming.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 18, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
              <Calendar size={14} /> Upcoming
            </span>
            {upcoming.map(t => (
              <span key={t.id} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 10, padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#fef3c7' }}>
                📅 {t.title} — <strong>{t.dueDate}</strong>
              </span>
            ))}
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {filterBtns.map(f => (
            <motion.button key={f.key} whileTap={{ scale: 0.95 }}
              onClick={() => setFilterStatus(f.key)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem',
                border: filterStatus === f.key ? '1px solid rgba(129,140,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: filterStatus === f.key ? 'rgba(129,140,248,0.15)' : 'rgba(14,14,22,0.6)',
                color: filterStatus === f.key ? '#a5b4fc' : '#64748b',
                transition: 'all 0.2s'
              }}>
              {f.label} {f.count > 0 && <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>({f.count})</span>}
            </motion.button>
          ))}
        </div>

        {/* Task Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex', marginBottom: '1rem' }}>
              <RefreshCw size={28} />
            </motion.div>
            <p>Loading your tasks…</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(14,14,22,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 22 }}>
            <ClipboardList size={48} style={{ opacity: 0.1, marginBottom: '1rem', color: '#818cf8' }} />
            <p style={{ margin: 0, color: '#475569', fontWeight: 600 }}>
              {filterStatus === 'all' ? 'No tasks assigned to you yet.' : `No ${filterStatus.replace('_', ' ')} tasks.`}
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {filtered.map((task, idx) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <TaskCard task={task} onUpdateStatus={handleUpdateStatus} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyTasks;
