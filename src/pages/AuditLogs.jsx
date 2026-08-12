import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import { Shield, Clock, Search, RefreshCw, FileText, Filter } from 'lucide-react';
import { getAuditLogs } from '../services/firestoreService';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    const data = await getAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    getAuditLogs().then(data => {
      if (active) {
        setLogs(data);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && !log.action?.toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.actor?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.target?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
              System <span className="text-gradient">Audit Logs</span> 🛡️
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Real-time audit trail of all enterprise actions, policy updates, and employee management.
            </p>
          </div>

          <button onClick={fetchLogs} className="btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Logs
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: 'rgba(8,14,30,0.7)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 16, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input className="input-field" style={{ paddingLeft: '2.4rem' }} placeholder="Search actor, action, target, or details…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ width: 180 }}>
            <select className="input-field" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="all">All Actions</option>
              <option value="employee">Employee Actions</option>
              <option value="policy">Policy Updates</option>
              <option value="leave">Leave Actions</option>
              <option value="shift">Shift Actions</option>
              <option value="task">Task Actions</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div style={{ background: 'rgba(8,14,30,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>
              Audit Events ({filteredLogs.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Admin Only Access</span>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading audit trail…</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <FileText size={40} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No audit logs recorded yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(4,8,20,0.6)' }}>
                    {['Timestamp', 'Actor', 'Action', 'Target', 'Details'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 1rem', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => {
                    const timeStr = log.timestamp?.seconds
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                      : 'Just now';
                    return (
                      <motion.tr key={log.id || idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {timeStr}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                          {log.actor}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                          <span style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(56,189,248,0.25)', color: '#60a5fa', padding: '0.25rem 0.6rem', borderRadius: 8, fontSize: '0.72rem' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {log.target}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                          {log.details || '—'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default AuditLogs;
