import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function PlugManager() {
  const { currentOrg, isAdmin } = useAuth();
  const [availablePlugs, setAvailablePlugs] = useState([]);
  const [enabledPlugs, setEnabledPlugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      fetchPlugs();
    }
  }, [currentOrg]);

  const fetchPlugs = async () => {
    try {
      const [available, enabled] = await Promise.all([
        api.get('/plugs'),
        api.get(`/plugs/org/${currentOrg.id}`)
      ]);
      setAvailablePlugs(available.data);
      setEnabledPlugs(enabled.data);
    } catch (error) {
      console.error('Failed to fetch plugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPlugEnabled = (plugId) => {
    return enabledPlugs.some(p => p.id === plugId);
  };

  const togglePlug = async (plug) => {
    if (!isAdmin) return;

    try {
      if (isPlugEnabled(plug.id)) {
        await api.delete(`/plugs/org/${currentOrg.id}/disable/${plug.id}`);
        setEnabledPlugs(enabledPlugs.filter(p => p.id !== plug.id));
      } else {
        await api.post(`/plugs/org/${currentOrg.id}/enable/${plug.id}`);
        setEnabledPlugs([...enabledPlugs, plug]);
      }
    } catch (error) {
      console.error('Failed to toggle plug:', error);
    }
  };

  const getPlugIcon = (plug) => {
    const icons = {
      'employee-directory': 'mdi:account-group',
      'attendance-tracker': 'mdi:clock-check-outline',
      'payroll-manager': 'mdi:cash-multiple'
    };
    return icons[plug.slug] || 'mdi:puzzle';
  };

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
              <span className="text-[var(--color-text-muted)]">/ Plug Manager</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Plug Manager</h2>
          <p className="text-[var(--color-text-muted)]">
            Enable or disable plugs for your organization
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availablePlugs.map((plug) => {
              const enabled = isPlugEnabled(plug.id);
              return (
                <div
                  key={plug.id}
                  className={`bg-[var(--color-bg-card)] border rounded-xl p-6 transition-all ${
                    enabled
                      ? 'border-indigo-500/50 bg-indigo-500/5'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                        enabled
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
                      }`}>
                        <Icon icon={getPlugIcon(plug)} className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{plug.name}</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">{plug.description}</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => togglePlug(plug)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          enabled ? 'bg-indigo-600' : 'bg-[var(--color-bg-elevated)]'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {enabled && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                      <span className="inline-flex items-center gap-1 text-sm text-green-400">
                        <Icon icon="mdi:check-circle" className="w-4 h-4" />
                        Enabled
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
