import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Settings() {
  const { currentOrg, isAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [enabledPlugs, setEnabledPlugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg]);

  const fetchData = async () => {
    try {
      const [deptRes, plugsRes] = await Promise.all([
        api.get(`/departments/org/${currentOrg.id}`),
        api.get(`/plugs/org/${currentOrg.id}`)
      ]);
      setDepartments(deptRes.data);
      setEnabledPlugs(plugsRes.data);
    } catch (err) {
      setError('Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:lock" className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-[var(--color-text-muted)]">Only administrators can access settings.</p>
          <Link to="/dashboard" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)]">
      {/* Navigation */}
      <nav className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-xl font-bold">
                Plug<span className="text-indigo-500">OS</span>
              </Link>
              <span className="text-[var(--color-text-muted)]">/ Settings</span>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
            >
              <Icon icon="mdi:arrow-left" className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="hover:text-red-300">
              <Icon icon="mdi:close" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Department Plug Access</h2>
          <p className="text-[var(--color-text-muted)]">
            Control which plugs each department can access. Admins always have full access to all plugs.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
            <Icon icon="mdi:office-building-outline" className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No departments yet</h3>
            <p className="text-[var(--color-text-muted)] mb-4">
              Create departments in the Employee Directory plug first.
            </p>
            <Link
              to="/employees"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
            >
              <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              Go to Employee Directory
            </Link>
          </div>
        ) : enabledPlugs.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
            <Icon icon="mdi:puzzle-outline" className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No plugs enabled</h3>
            <p className="text-[var(--color-text-muted)] mb-4">
              Enable some plugs for your organization first.
            </p>
            <Link
              to="/plugs"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
            >
              <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              Go to Plug Manager
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {departments.map((dept) => (
              <DepartmentPlugAccess
                key={dept.id}
                department={dept}
                enabledPlugs={enabledPlugs}
                orgId={currentOrg.id}
                onError={setError}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        {departments.length > 0 && enabledPlugs.length > 0 && (
          <div className="mt-8 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Icon icon="mdi:information" className="w-5 h-5 text-indigo-400 mt-0.5" />
              <div className="text-sm text-indigo-200">
                <p className="font-medium mb-1">How department access works:</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-300">
                  <li>Admins always see all enabled plugs</li>
                  <li>Employees only see plugs assigned to their department</li>
                  <li>Employees without a department see all enabled plugs</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Department Plug Access Card Component
function DepartmentPlugAccess({ department, enabledPlugs, orgId, onError }) {
  const [deptPlugs, setDeptPlugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeptPlugs();
  }, []);

  const fetchDeptPlugs = async () => {
    try {
      const { data } = await api.get(`/departments/org/${orgId}/${department.id}/plugs`);
      setDeptPlugs(data);
    } catch (err) {
      console.error('Failed to fetch department plugs');
    } finally {
      setLoading(false);
    }
  };

  const isPlugAssigned = (plugId) => deptPlugs.some(dp => dp.id === plugId);

  const togglePlug = async (plugId) => {
    try {
      if (isPlugAssigned(plugId)) {
        await api.delete(`/departments/org/${orgId}/${department.id}/plugs/${plugId}`);
        setDeptPlugs(deptPlugs.filter(p => p.id !== plugId));
      } else {
        await api.post(`/departments/org/${orgId}/${department.id}/plugs/${plugId}`);
        const plug = enabledPlugs.find(p => p.id === plugId);
        if (plug) setDeptPlugs([...deptPlugs, plug]);
      }
    } catch (err) {
      onError('Failed to update plug access');
    }
  };

  const getPlugIcon = (icon) => {
    const icons = {
      users: 'mdi:account-group',
      default: 'mdi:puzzle'
    };
    return icons[icon] || icons.default;
  };

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
          <Icon icon="mdi:office-building" className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">{department.name}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {deptPlugs.length} of {enabledPlugs.length} plugs accessible
          </p>
        </div>
      </div>

      {/* Plugs List */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Icon icon="mdi:loading" className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enabledPlugs.map(plug => (
              <div
                key={plug.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isPlugAssigned(plug.id)
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPlugAssigned(plug.id)
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]'
                  }`}>
                    <Icon icon={getPlugIcon(plug.icon)} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{plug.name}</span>
                </div>
                <button
                  onClick={() => togglePlug(plug.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isPlugAssigned(plug.id) ? 'bg-indigo-600' : 'bg-[var(--color-border)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      isPlugAssigned(plug.id) ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
