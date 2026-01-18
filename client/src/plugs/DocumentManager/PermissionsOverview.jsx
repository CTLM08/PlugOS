import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import CustomSelect from '../../components/CustomSelect';

export default function PermissionsOverview() {
  const { currentOrg, isAdmin } = useAuth();
  const [folders, setFolders] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [addType, setAddType] = useState('department');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (currentOrg) fetchData();
  }, [currentOrg]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [foldersRes, deptsRes, empsRes] = await Promise.all([
        api.get(`/documents/org/${currentOrg.id}/folders`),
        api.get(`/departments/org/${currentOrg.id}`),
        api.get(`/employees/org/${currentOrg.id}`)
      ]);
      setFolders(foldersRes.data);
      setDepartments(deptsRes.data);
      setEmployees(empsRes.data);

      // Fetch permissions for each folder
      const permsMap = {};
      for (const folder of foldersRes.data) {
        try {
          const res = await api.get(`/documents/folders/${folder.id}/permissions`);
          permsMap[folder.id] = res.data;
        } catch (e) {
          permsMap[folder.id] = [];
        }
      }
      setPermissions(permsMap);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async (folderId) => {
    if (!selectedId) return;
    try {
      const payload = addType === 'department' ? { departmentId: selectedId } : { userId: selectedId };
      await api.post(`/documents/folders/${folderId}/permissions`, payload);
      setSelectedId('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add permission');
    }
  };

  const handleRemovePermission = async (folderId, permId) => {
    try {
      await api.delete(`/documents/folders/${folderId}/permissions/${permId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to remove permission:', err);
    }
  };

  const getFolderPath = (folder) => {
    const path = [folder.name];
    let parent = folders.find(f => f.id === folder.parent_id);
    while (parent) {
      path.unshift(parent.name);
      parent = folders.find(f => f.id === parent.parent_id);
    }
    return path.join(' / ');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:shield-lock" className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-[var(--color-text-muted)]">Only admins can access this page.</p>
          <Link to="/documents" className="inline-block mt-4 text-amber-400 hover:underline">← Back to Documents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)]">
      <nav className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-xl font-bold">
                Plug<span className="text-indigo-500">OS</span>
              </Link>
              <span className="text-[var(--color-text-muted)]">/ Document Permissions</span>
            </div>
            <Link to="/documents" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white">
              <Icon icon="mdi:arrow-left" className="w-4 h-4" />
              Back to Documents
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Folder Permissions</h1>
            <p className="text-[var(--color-text-muted)]">Manage access control for all folders</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : folders.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
            <Icon icon="mdi:folder-outline" className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No folders yet</h3>
            <p className="text-[var(--color-text-muted)]">Create folders in the Document Manager to manage permissions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {folders.map(folder => (
              <div key={folder.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <Icon icon="mdi:folder" className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{folder.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">{getFolderPath(folder)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                    className="px-3 py-1.5 text-sm bg-[var(--color-bg-elevated)] hover:bg-amber-600/20 rounded-lg flex items-center gap-2"
                  >
                    <Icon icon="mdi:shield-edit" className="w-4 h-4 text-amber-400" />
                    {selectedFolder === folder.id ? 'Close' : 'Edit'}
                  </button>
                </div>

                {/* Current Permissions Summary */}
                <div className="flex flex-wrap gap-2">
                  {(!permissions[folder.id] || permissions[folder.id].length === 0) ? (
                    <span className="text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] px-3 py-1 rounded-full">
                      <Icon icon="mdi:earth" className="w-4 h-4 inline mr-1" />
                      All employees can access
                    </span>
                  ) : (
                    permissions[folder.id].map(p => (
                      <span key={p.id} className="text-sm bg-[var(--color-bg-elevated)] px-3 py-1 rounded-full flex items-center gap-2">
                        <Icon icon={p.department_id ? 'mdi:account-group' : 'mdi:account'} className="w-4 h-4 text-amber-400" />
                        {p.department_name || p.user_name}
                        {selectedFolder === folder.id && (
                          <button onClick={() => handleRemovePermission(folder.id, p.id)} className="hover:text-red-400">
                            <Icon icon="mdi:close" className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>

                {/* Expanded Edit Section */}
                {selectedFolder === folder.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-3">
                      <button 
                        onClick={() => { setAddType('department'); setSelectedId(''); }} 
                        className={`px-3 py-1.5 text-sm rounded-lg ${addType === 'department' ? 'bg-amber-600 text-white' : 'bg-[var(--color-bg-elevated)]'}`}
                      >
                        Department
                      </button>
                      <button 
                        onClick={() => { setAddType('user'); setSelectedId(''); }} 
                        className={`px-3 py-1.5 text-sm rounded-lg ${addType === 'user' ? 'bg-amber-600 text-white' : 'bg-[var(--color-bg-elevated)]'}`}
                      >
                        Individual
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <CustomSelect
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        placeholder={`Select ${addType === 'department' ? 'department' : 'employee'}...`}
                        options={[
                          { value: '', label: `Select ${addType === 'department' ? 'department' : 'employee'}...` },
                          ...(addType === 'department'
                            ? departments.map(d => ({ value: d.id, label: d.name }))
                            : employees.map(e => ({ value: e.user_id, label: e.name })))
                        ]}
                        className="flex-1"
                      />
                      <button
                        onClick={() => handleAddPermission(folder.id)}
                        disabled={!selectedId}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
