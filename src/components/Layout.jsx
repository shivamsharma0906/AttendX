import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Users, Upload, Activity, LayoutDashboard, Bell, Clock, FileText, Check, Settings, ClipboardList, Menu, X, Shield } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { auth, signOut } from '../services/firebase';
import { getAdminNotifications, markNotificationRead } from '../services/firestoreService';
import LeaveManagementModal from './LeaveManagementModal';
import ShiftManagementModal from './ShiftManagementModal';

const Layout = ({ children }) => {
  const { user, logout, employees } = useAppStore();
  const location = useLocation();
  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Modals state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);



  useEffect(() => {
    let active = true;
    if (isAdmin) {
      getAdminNotifications().then(data => {
        if (active) {
          setNotifications(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        }
      }).catch(() => {
        if (active) setNotifications([]);
      });
    }
    return () => { active = false; };
  }, [isAdmin, location.pathname]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const adminMenu = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Employees', path: '/admin/employees' },
    { icon: Calendar, label: 'Calendar', path: '/admin/calendar' },
    { icon: Upload, label: 'Register OCR', path: '/admin/ocr' },
    { icon: Activity, label: 'Reports', path: '/admin/reports' },
    { icon: ClipboardList, label: 'Tasks', path: '/admin/tasks' },
    { icon: Shield, label: 'Audit Logs', path: '/admin/audit-logs' },
  ];

  const employeeMenu = [
    { icon: LayoutDashboard, label: 'My Dashboard', path: '/employee/dashboard' },
    { icon: Calendar, label: 'My Calendar', path: '/employee/calendar' },
    { icon: ClipboardList, label: 'My Tasks', path: '/employee/tasks' },
  ];

  const menu = isAdmin ? adminMenu : employeeMenu;

  const renderSidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '0 0.5rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="AttendX Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }} className="text-gradient">
              AttendX
            </h1>
            <p style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
              {role} portal
            </p>
          </div>
        </div>
        {mobileOpen && (
          <button onClick={() => setMobileOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.4rem' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} style={{ color: isActive ? '#c4b5fd' : '#64748b', flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Quick Action Triggers */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => { setLeaveModalOpen(true); setMobileOpen(false); }}
            className="sidebar-link"
            style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', cursor: 'pointer' }}
          >
            <FileText size={18} style={{ color: '#38bdf8' }} />
            <span>Leave & Time-Off</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => { setShiftModalOpen(true); setMobileOpen(false); }}
                className="sidebar-link"
                style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', cursor: 'pointer' }}
              >
                <Clock size={18} style={{ color: '#c084fc' }} />
                <span>Shift Schedules</span>
              </button>
              <Link
                to="/admin/settings"
                className={`sidebar-link ${location.pathname === '/admin/settings' ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Settings size={18} style={{ color: location.pathname === '/admin/settings' ? '#c4b5fd' : '#64748b', flexShrink: 0 }} />
                <span>Settings</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* User Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
            boxShadow: '0 0 12px rgba(139,92,246,0.4)'
          }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{user?.name}</p>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{user?.email}</p>
          </div>
        </div>

        <button
          onClick={async () => {
            try { await signOut(auth); } catch { /* ignore error */ }
            logout();
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.18)',
            padding: '0.6rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s', fontFamily: 'inherit'
          }}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#06060c', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
      {/* Desktop Sidebar (visible on screens >= 768px) */}
      <aside
        className="glass-panel hidden md:flex"
        style={{
          width: '260px',
          minWidth: '260px',
          margin: '1rem',
          padding: '1.5rem 1rem',
          flexDirection: 'column',
          position: 'sticky',
          top: '1rem',
          height: 'calc(100vh - 2rem)',
          zIndex: 100,
        }}
      >
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer (visible on screens < 768px when mobileOpen === true) */}
      <AnimatePresence>
        {mobileOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} className="md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="glass-panel"
              style={{
                width: '280px',
                height: '100%',
                padding: '1.5rem 1.25rem',
                position: 'relative',
                zIndex: 210,
                borderRadius: 0,
                borderRight: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '10px 0 40px rgba(0,0,0,0.8)'
              }}
            >
              {renderSidebarContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar Header */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {isAdmin ? '🛡️ Admin Workspace' : '👤 Employee Portal'}
            </span>
          </div>

          {/* Admin Notification Center */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" /> Notifications
                    </h4>
                    <span className="text-xs text-slate-400">{unreadCount} new</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">No recent notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 flex items-start justify-between gap-2 text-xs transition ${
                            n.isRead ? 'bg-slate-900/40 text-slate-400' : 'bg-indigo-950/20 text-slate-200'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-white">{n.title}</p>
                            <p className="mt-0.5 text-slate-300">{n.message}</p>
                          </div>
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkRead(n.id)}
                              className="p-1 hover:bg-slate-800 rounded text-emerald-400"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ padding: '1.25rem 1rem', flex: 1 }}
          className="sm:p-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Global Modals */}
      <LeaveManagementModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        user={user}
        isAdmin={isAdmin}
      />

      <ShiftManagementModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        employees={employees || []}
      />
    </div>
  );
};

export default Layout;
