import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store/useAppStore';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RegisterFace from './pages/RegisterFace';
import Layout from './components/Layout';
import CalendarView from './calendar/CalendarView';
import OCRUpload from './ocr/OCRUpload';
import Reports from './reports/Reports';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import AuditLogs from './pages/AuditLogs';

/** Protected Route wrapper */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAppStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />;
  }

  return children;
};

/** Main App Router component */
const App = () => {
  const { user } = useAppStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />
            ) : (
              <Login />
            )
          }
        />

        {/* ── ADMIN ROUTES ──────────────────────────────────────────────────────── */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <CalendarView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <CalendarView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ocr"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <OCRUpload />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payroll"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tasks"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/register-face"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RegisterFace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register-face"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RegisterFace />
            </ProtectedRoute>
          }
        />

        {/* ── EMPLOYEE ROUTES ─────────────────────────────────────────────────── */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute allowedRoles={['employee', 'admin']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/attendance"
          element={
            <ProtectedRoute allowedRoles={['employee', 'admin']}>
              <Layout>
                <CalendarView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/calendar"
          element={
            <ProtectedRoute allowedRoles={['employee', 'admin']}>
              <Layout>
                <CalendarView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/tasks"
          element={
            <ProtectedRoute allowedRoles={['employee', 'admin']}>
              <MyTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/payslips"
          element={
            <ProtectedRoute allowedRoles={['employee', 'admin']}>
              <Layout>
                <CalendarView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/profile"
          element={
            <ProtectedRoute allowedRoles={['employee', 'admin']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── BACKWARD COMPATIBILITY REDIRECTS ─────────────────────────────────── */}
        <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/employee-dashboard" element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="/employees" element={<Navigate to="/admin/employees" replace />} />

        {/* Root & Catch-all Fallback */}
        <Route
          path="*"
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
