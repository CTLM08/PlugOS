import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const { user, currentOrg, isAdmin } = useAuth();
  const [enabledPlugs, setEnabledPlugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      fetchEnabledPlugs();
    }
  }, [currentOrg]);

  const fetchEnabledPlugs = async () => {
    try {
      const { data } = await api.get(`/plugs/org/${currentOrg.id}`);
      setEnabledPlugs(data);
    } catch (error) {
      console.error('Failed to fetch plugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlugIcon = (icon) => {
    // Use the icon from database directly, or fallback to puzzle icon
    return icon || 'mdi:puzzle';
  };

  const getPlugRoute = (slug) => {
    const routes = {
      'employee-directory': '/employees',
      'attendance-tracker': '/attendance'
    };
    return routes[slug] || '/dashboard';
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name}</h2>
        <p className="text-[var(--color-text-muted)]">
          Here's what's available in your workspace
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : enabledPlugs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enabledPlugs.map((plug) => (
            <Link
              key={plug.id}
              to={getPlugRoute(plug.slug)}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 hover:border-indigo-500/50 hover:bg-[var(--color-bg-elevated)] transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                <Icon icon={getPlugIcon(plug.icon)} className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{plug.name}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{plug.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[var(--color-bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="mdi:puzzle-outline" className="w-8 h-8 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No plugs enabled yet</h3>
          <p className="text-[var(--color-text-muted)] mb-6">
            Enable plugs to add functionality to your organization
          </p>
          {isAdmin && (
            <Link
              to="/plugs"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
            >
              <Icon icon="mdi:plus" className="w-5 h-5" />
              Enable Plugs
            </Link>
          )}
        </div>
      )}
    </>
  );
}
