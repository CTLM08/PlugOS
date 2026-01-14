import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const { user, currentOrg, logout, isAdmin } = useAuth();
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
    const icons = {
      users: 'mdi:account-group',
      default: 'mdi:puzzle'
    };
    return icons[icon] || icons.default;
  };

  const getPlugRoute = (slug) => {
    const routes = {
      'employee-directory': '/employees'
    };
    return routes[slug] || '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] flex">
      {/* Left Sidebar Taskbar - Collapsed by default, expands on hover */}
      <aside className="group/sidebar w-16 hover:w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col fixed h-full transition-all duration-300 ease-in-out z-20 overflow-hidden">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[var(--color-border)]">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="mdi:puzzle" className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold ml-3 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
            Plug<span className="text-indigo-500">OS</span>
          </h1>
        </div>

        {/* Organization Name - Hidden when collapsed */}
        {currentOrg && (
          <div className="px-4 py-3 border-b border-[var(--color-border)] overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-bg-elevated)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:office-building" className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
              <div className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Organization</span>
                <p className="text-sm font-medium">{currentOrg.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Plugs Section */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="px-4 mb-3 overflow-hidden">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">Enabled Plugs</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <Icon icon="mdi:loading" className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          ) : enabledPlugs.length > 0 ? (
            <nav className="space-y-1 px-2">
              {enabledPlugs.map((plug) => (
                <Link
                  key={plug.id}
                  to={getPlugRoute(plug.slug)}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)] transition-all group/item"
                  title={plug.name}
                >
                  <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center group-hover/item:bg-indigo-500/20 transition-colors flex-shrink-0">
                    <Icon icon={getPlugIcon(plug.icon)} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">{plug.name}</span>
                </Link>
              ))}
            </nav>
          ) : (
            <div className="px-2 text-center py-4">
              <div className="w-8 h-8 bg-[var(--color-bg-elevated)] rounded-lg flex items-center justify-center mx-auto">
                <Icon icon="mdi:puzzle-outline" className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">No plugs enabled</p>
            </div>
          )}
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="p-2 border-t border-[var(--color-border)] space-y-1">
            <Link
              to="/plugs"
              className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
              title="Manage Plugs"
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:puzzle-plus" className="w-5 h-5" />
              </div>
              <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">Manage Plugs</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)] text-sm transition-all"
              title="Plug Access"
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:shield-key" className="w-5 h-5" />
              </div>
              <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">Plug Access</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-16 transition-all duration-300">
        {/* Top Navigation */}
        <nav className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] sticky top-0 z-10">
          <div className="px-6 lg:px-8">
            <div className="flex justify-end h-16 items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)]">
                  <Icon icon="mdi:account-circle" className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm">{user?.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-all"
                >
                  <Icon icon="mdi:logout" className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="px-6 lg:px-8 py-8">
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
        </main>
      </div>
    </div>
  );
}

