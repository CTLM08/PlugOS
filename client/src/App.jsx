import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

import Dashboard from './pages/Dashboard';
import PlugManager from './pages/PlugManager';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import EmployeeDirectory from './plugs/EmployeeDirectory';
import AttendanceTracker from './plugs/AttendanceTracker';
import PayrollManager from './plugs/PayrollManager';
import DocumentManager from './plugs/DocumentManager';
import PermissionsOverview from './plugs/DocumentManager/PermissionsOverview';
import EducationManager from './plugs/EducationManager';
import TaskManager from './plugs/TaskManager';
import WorkflowBuilder from './plugs/WorkflowBuilder';
import ExpenseManager from './plugs/ExpenseManager';
import './index.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-dark)]">
        <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-dark)]">
        <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/plugs"
        element={
          <PrivateRoute>
            <PlugManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <Notifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <PrivateRoute>
            <EmployeeDirectory />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <AttendanceTracker />
          </PrivateRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <PrivateRoute>
            <PayrollManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <PrivateRoute>
            <DocumentManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents/permissions"
        element={
          <PrivateRoute>
            <PermissionsOverview />
          </PrivateRoute>
        }
      />
      <Route
        path="/education"
        element={
          <PrivateRoute>
            <EducationManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <TaskManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/workflows"
        element={
          <PrivateRoute>
            <WorkflowBuilder />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <PrivateRoute>
            <ExpenseManager />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
