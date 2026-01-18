import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ConfirmModal from '../../components/ConfirmModal';
import CustomSelect from '../../components/CustomSelect';

export default function EmployeeDirectory() {
  const { currentOrg, isManager, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('employee-tab') || 'employees';
  });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: () => {},
    loading: false
  });

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('employee-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg]);

  const fetchData = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get(`/employees/org/${currentOrg.id}`),
        api.get(`/departments/org/${currentOrg.id}`)
      ]);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteEmployee = (employee) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Employee',
      message: `Are you sure you want to delete ${employee.name}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.delete(`/employees/org/${currentOrg.id}/${employee.id}`);
          setEmployees(employees.filter(e => e.id !== employee.id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to delete employee:', error);
          setError('Failed to delete employee');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    
    setDeptLoading(true);
    try {
      const { data } = await api.post(`/departments/org/${currentOrg.id}`, { name: newDeptName });
      setDepartments([...departments, data]);
      setNewDeptName('');
      setShowDeptModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create department');
    } finally {
      setDeptLoading(false);
    }
  };

  const confirmDeleteDept = (dept) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Department',
      message: `Delete "${dept.name}"? Employees will remain but lose their department assignment.`,
      variant: 'warning',
      confirmText: 'Delete',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.delete(`/departments/org/${currentOrg.id}/${dept.id}`);
          setDepartments(departments.filter(d => d.id !== dept.id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setError('Failed to delete department');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const confirmResetPassword = (employee) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Password',
      message: `Generate a new password for ${employee.name}? They will need to use the new password to log in.`,
      variant: 'warning',
      confirmText: 'Reset Password',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const { data } = await api.post(`/employees/org/${currentOrg.id}/${employee.id}/reset-password`);
          setResetPasswordData({
            employee: employee,
            newPassword: data.newPassword
          });
          setShowResetPasswordModal(true);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to reset password');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase()) ||
    emp.position?.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)]">
      {/* Navigation */}
      <nav className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-xl font-bold">
                Plug<span className="text-cyan-500">OS</span>
              </Link>
              <span className="text-[var(--color-text-muted)]">/ Employee Directory</span>
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
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="hover:text-red-300">
              <Icon icon="mdi:close" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'employees'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            <Icon icon="mdi:account-group" className="w-4 h-4 inline mr-2" />
            Employees ({employees.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'departments'
                  ? 'border-cyan-500 text-white'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              <Icon icon="mdi:office-building" className="w-4 h-4 inline mr-2" />
              Departments ({departments.length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  {isManager && (
                    <button
                      onClick={openAddModal}
                      className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      <Icon icon="mdi:plus" className="w-5 h-5" />
                      Add Employee
                    </button>
                  )}
                </div>

                {/* Employee List */}
                {filteredEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map((employee) => (
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        isManager={isManager}
                        isAdmin={isAdmin}
                        onEdit={() => openEditModal(employee)}
                        onDelete={() => confirmDeleteEmployee(employee)}
                        onResetPassword={() => confirmResetPassword(employee)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="mdi:account-group-outline"
                    title={search ? 'No employees found' : 'No employees yet'}
                    description={search ? 'Try a different search term' : 'Add your first employee to get started'}
                    showAction={isManager && !search}
                    actionLabel="Add Employee"
                    onAction={openAddModal}
                  />
                )}
              </>
            )}

            {/* Departments Tab */}
            {activeTab === 'departments' && isAdmin && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Manage departments for your organization. Employees can be assigned to departments.
                  </p>
                  <button
                    onClick={() => setShowDeptModal(true)}
                    className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Icon icon="mdi:plus" className="w-5 h-5" />
                    Add Department
                  </button>
                </div>

                {departments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept) => {
                      const deptEmployees = employees.filter(e => e.department === dept.name);
                      return (
                        <div
                          key={dept.id}
                          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-cyan-500/10 text-cyan-400 rounded-lg flex items-center justify-center">
                                <Icon icon="mdi:office-building" className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{dept.name}</h3>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {deptEmployees.length} employee{deptEmployees.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => confirmDeleteDept(dept)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Icon icon="mdi:delete" className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon="mdi:office-building-outline"
                    title="No departments yet"
                    description="Create departments to organize your employees"
                    showAction={true}
                    actionLabel="Add Department"
                    onAction={() => setShowDeptModal(true)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          orgId={currentOrg.id}
          departments={departments}
          onClose={() => setShowModal(false)}
          onSave={(employee, isNew) => {
            if (editingEmployee) {
              setEmployees(employees.map(e => e.id === employee.id ? employee : e));
            } else {
              setEmployees([...employees, employee]);
            }
            setShowModal(false);
          }}
        />
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Department</h3>
            <form onSubmit={handleCreateDept}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Department Name</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Engineering"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptLoading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {deptLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="mdi:lock-check" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Password Reset!</h3>
              <p className="text-[var(--color-text-muted)]">
                New credentials for {resetPasswordData.employee.name}
              </p>
            </div>

            <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 space-y-3 mb-6">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Email</label>
                <p className="font-mono text-sm">{resetPasswordData.employee.email}</p>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">New Password</label>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-lg font-bold text-cyan-400">{resetPasswordData.newPassword}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(resetPasswordData.newPassword)}
                    className="p-1 text-[var(--color-text-muted)] hover:text-white"
                    title="Copy password"
                  >
                    <Icon icon="mdi:content-copy" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <Icon icon="mdi:alert" className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-200">
                  Save this password now! Share it securely with the employee.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowResetPasswordModal(false);
                setResetPasswordData(null);
              }}
              className="w-full py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
      />
    </div>
  );
}

// Employee Card Component
function EmployeeCard({ employee, isManager, isAdmin, onEdit, onDelete, onResetPassword }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-all group">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-lg font-semibold shrink-0">
          {employee.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{employee.name}</h3>
          {employee.position && (
            <p className="text-sm text-[var(--color-text-muted)] truncate">{employee.position}</p>
          )}
          {employee.department && (
            <span className="inline-block mt-2 text-xs bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] px-2 py-1 rounded">
              {employee.department}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-2">
        {employee.email && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Icon icon="mdi:email-outline" className="w-4 h-4" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}
        {employee.phone && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Icon icon="mdi:phone-outline" className="w-4 h-4" />
            <span>{employee.phone}</span>
          </div>
        )}
      </div>

      {isManager && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-white py-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex-1 inline-flex items-center justify-center gap-1 text-sm text-red-400 hover:text-red-300 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Icon icon="mdi:delete-outline" className="w-4 h-4" />
              Delete
            </button>
          </div>
          {isAdmin && employee.email && (
            <button
              onClick={onResetPassword}
              className="mt-2 w-full inline-flex items-center justify-center gap-1 text-sm text-amber-400 hover:text-amber-300 py-2 rounded-lg hover:bg-amber-500/10 border border-amber-500/30 transition-colors"
            >
              <Icon icon="mdi:lock-reset" className="w-4 h-4" />
              Reset Password
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ icon, title, description, showAction, actionLabel, onAction }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
      <div className="w-16 h-16 bg-[var(--color-bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon icon={icon} className="w-8 h-8 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-[var(--color-text-muted)] mb-6">{description}</p>
      {showAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Icon icon="mdi:plus" className="w-5 h-5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Employee Modal Component
function EmployeeModal({ employee, orgId, departments, onClose, onSave }) {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    position: employee?.position || '',
    createAccount: false,
    role: 'employee',
    department_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (employee) {
        response = await api.put(`/employees/org/${orgId}/${employee.id}`, formData);
        onSave(response.data);
      } else {
        response = await api.post(`/employees/org/${orgId}`, {
          ...formData,
          department_id: formData.department_id || null
        });
        
        if (response.data.generated_password) {
          // Show password modal
          setSuccessData({
            employee: response.data,
            password: response.data.generated_password
          });
        } else {
          onSave(response.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  // Password Display Modal
  if (successData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:check" className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Account Created!</h3>
            <p className="text-[var(--color-text-muted)]">
              Share these login credentials with {successData.employee.name}
            </p>
          </div>

          <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 space-y-3 mb-6">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Email</label>
              <p className="font-mono text-sm">{successData.employee.email}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Password</label>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg font-bold text-cyan-400">{successData.password}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(successData.password)}
                  className="p-1 text-[var(--color-text-muted)] hover:text-white"
                  title="Copy password"
                >
                  <Icon icon="mdi:content-copy" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <Icon icon="mdi:alert" className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                Save this password now! It won't be shown again.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onSave(successData.employee);
            }}
            className="w-full py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Icon icon="mdi:alert-circle" className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Department</label>
            <CustomSelect
              value={formData.department}
              onChange={(e) => {
                const selectedDept = departments.find(d => d.name === e.target.value);
                setFormData({ 
                  ...formData, 
                  department: e.target.value,
                  department_id: selectedDept?.id || ''
                });
              }}
              placeholder="Select department"
              options={[{ value: '', label: 'Select department' }, ...departments.map(dept => ({ value: dept.name, label: dept.name }))]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Position</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g. Software Engineer"
            />
          </div>

          {/* Create Account Section - Only for new employees */}
          {!employee && isAdmin && (
            <div className="pt-4 border-t border-[var(--color-border)]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createAccount}
                  onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-cyan-600 focus:ring-cyan-500"
                />
                <div>
                  <span className="font-medium">Create login account</span>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Generate credentials for employee to access the platform
                  </p>
                </div>
              </label>

              {formData.createAccount && (
                <div className="mt-4 pl-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <CustomSelect
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      options={[
                        { value: 'employee', label: 'Employee' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'admin', label: 'Admin' }
                      ]}
                    />
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <p className="text-sm text-cyan-200">
                      A random password will be generated. You'll need to share it with the employee.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Saving...' : (employee ? 'Update' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
