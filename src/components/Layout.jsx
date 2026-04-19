import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Calendar, Users, Upload, Activity, LayoutDashboard } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { auth, signOut } from '../services/firebase';

const Layout = ({ children }) => {
  const { user, logout } = useAppStore();
  const location = useLocation();
  const role = user?.role || 'employee';

  const adminMenu = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-dashboard' },
    { icon: Users, label: 'Employees', path: '/admin/employees' },
    { icon: Calendar, label: 'Calendar', path: '/admin/calendar' },
    { icon: Upload, label: 'Register OCR', path: '/admin/ocr' },
    { icon: Activity, label: 'Reports', path: '/admin/reports' },
  ];

  const employeeMenu = [
    { icon: LayoutDashboard, label: 'My Dashboard', path: '/employee-dashboard' },
    { icon: Calendar, label: 'My Calendar', path: '/employee/calendar' },
  ];

  const menu = role === 'admin' ? adminMenu : employeeMenu;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#06060c' }}>
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        className="glass-panel"
        style={{
          width: '260px',
          minWidth: '260px',
          margin: '1rem',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: '1rem',
          height: 'calc(100vh - 2rem)',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '0 0.5rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }} className="text-gradient">
            NexusPay
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
            {role} portal
          </p>
        </div>

        {/* Nav Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} style={{ color: isActive ? '#c4b5fd' : '#64748b', flexShrink: 0 }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 38, height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1rem', flexShrink: 0,
              boxShadow: '0 0 12px rgba(139,92,246,0.4)'
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{user?.email}</p>
            </div>
          </div>

          <button
            onClick={async () => {
              try { await signOut(auth); } catch(e) {}
              logout();
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: 'rgba(244,63,94,0.08)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.18)',
              padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.2s', fontFamily: 'inherit'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.08)'}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ padding: '2rem', minHeight: '100%' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
