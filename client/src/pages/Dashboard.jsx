import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PlugCard from '../components/PlugCards';
import DraggableGrid from '../components/DraggableGrid';

export default function Dashboard() {
  const { user, currentOrg, isAdmin, loading: authLoading } = useAuth();
  const [enabledPlugs, setEnabledPlugs] = useState([]);
  const [plugSummary, setPlugSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    } else if (!authLoading) {
      // Auth is done loading but no org - stop loading state
      setLoading(false);
    }
  }, [currentOrg, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch plugs and summary in parallel
      const [plugsRes, summaryRes] = await Promise.all([
        api.get(`/plugs/org/${currentOrg.id}`),
        api.get(`/plugs/org/${currentOrg.id}/summary`)
      ]);
      setEnabledPlugs(plugsRes.data);
      setPlugSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlugRoute = (slug) => {
    const routes = {
      'employee-directory': '/employees',
      'attendance-tracker': '/attendance',
      'payroll-manager': '/payroll',
      'document-manager': '/documents',
      'education-manager': '/education'
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
        {enabledPlugs.length > 0 && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 flex items-center gap-1">
            <Icon icon="mdi:cursor-move" className="w-4 h-4" />
            Drag cards to reorder • Drag corners to resize
          </p>
        )}
      </div>

      {(loading || authLoading) ? (
        <div className="flex justify-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : enabledPlugs.length > 0 ? (
        <DraggableGrid 
          plugs={enabledPlugs} 
          orgId={currentOrg?.id} 
          userId={user?.id}
        >
          {enabledPlugs.map((plug) => (
            <div key={plug.id.toString()} className="grid-item">
              <PlugCard
                plug={plug}
                summary={plugSummary}
                route={getPlugRoute(plug.slug)}
              />
            </div>
          ))}
        </DraggableGrid>
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
