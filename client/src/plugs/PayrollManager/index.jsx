import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ConfirmModal from '../../components/ConfirmModal';
import DatePicker from '../../components/DatePicker';
import CustomSelect from '../../components/CustomSelect';

export default function PayrollManager() {
  const { currentOrg, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('payroll-tab') || 'payslips';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [myPayslips, setMyPayslips] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [employeesWithoutSalary, setEmployeesWithoutSalary] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodPayslips, setSelectedPeriodPayslips] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Modals
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showPayslipDetail, setShowPayslipDetail] = useState(null);
  
  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Confirm',
    onConfirm: () => {},
    loading: false
  });

  useEffect(() => {
    localStorage.setItem('payroll-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'payslips') {
        const res = await api.get(`/payroll/org/${currentOrg.id}/my-payslips`);
        setMyPayslips(res.data);
      } else if (activeTab === 'salaries' && isAdmin) {
        const [salRes, empRes] = await Promise.all([
          api.get(`/payroll/org/${currentOrg.id}/salaries`),
          api.get(`/payroll/org/${currentOrg.id}/employees-without-salary`)
        ]);
        setSalaries(salRes.data);
        setEmployeesWithoutSalary(empRes.data);
      } else if (activeTab === 'periods' && isAdmin) {
        const res = await api.get(`/payroll/org/${currentOrg.id}/periods`);
        setPeriods(res.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPeriod = async (period) => {
    setSelectedPeriod(period);
    try {
      const res = await api.get(`/payroll/org/${currentOrg.id}/periods/${period.id}/payslips`);
      setSelectedPeriodPayslips(res.data);
    } catch (err) {
      setError('Failed to load payslips');
    }
  };

  const handleGeneratePayslips = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Generate Payslips',
      message: `Generate payslips for "${period.name}"? This will calculate salaries based on attendance records.`,
      variant: 'info',
      confirmText: 'Generate',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const res = await api.post(`/payroll/org/${currentOrg.id}/periods/${period.id}/generate`);
          setSuccess(res.data.message);
          fetchData();
          if (selectedPeriod?.id === period.id) {
            handleSelectPeriod(period);
          }
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to generate payslips');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleFinalizePeriod = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Finalize Payroll',
      message: `Finalize "${period.name}"? This will lock the payroll and prevent further changes.`,
      variant: 'warning',
      confirmText: 'Finalize',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.post(`/payroll/org/${currentOrg.id}/periods/${period.id}/finalize`);
          setSuccess('Payroll period finalized!');
          fetchData();
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to finalize period');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeletePeriod = (period) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Period',
      message: `Delete "${period.name}"? This will also delete all associated payslips.`,
      variant: 'danger',
      confirmText: 'Delete',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.delete(`/payroll/org/${currentOrg.id}/periods/${period.id}`);
          setSuccess('Period deleted');
          fetchData();
          if (selectedPeriod?.id === period.id) {
            setSelectedPeriod(null);
            setSelectedPeriodPayslips([]);
          }
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete period');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const formatCurrency = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Payroll Manager</h2>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="hover:text-red-300">
            <Icon icon="mdi:close" className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <Icon icon="mdi:check-circle" className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[var(--color-border)] overflow-x-auto">
        <TabButton
          active={activeTab === 'payslips'}
          onClick={() => setActiveTab('payslips')}
          icon="mdi:file-document"
          label="My Payslips"
        />
        {isAdmin && (
          <>
            <TabButton
              active={activeTab === 'salaries'}
              onClick={() => setActiveTab('salaries')}
              icon="mdi:account-cash"
              label="Salary Setup"
            />
            <TabButton
              active={activeTab === 'periods'}
              onClick={() => setActiveTab('periods')}
              icon="mdi:calendar-month"
              label="Payroll Periods"
            />
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* My Payslips Tab */}
          {activeTab === 'payslips' && (
            <div>
              {myPayslips.length > 0 ? (
                <div className="space-y-4">
                  {myPayslips.map((payslip) => (
                    <div
                      key={payslip.id}
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-violet-500/30 transition-colors cursor-pointer"
                      onClick={() => setShowPayslipDetail(payslip)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{payslip.period_name}</h3>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">
                            {formatCurrency(payslip.net_pay)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            payslip.period_status === 'finalized'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {payslip.period_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="mdi:file-document-outline"
                  title="No payslips yet"
                  description="Your payslips will appear here once payroll is processed"
                />
              )}
            </div>
          )}

          {/* Salary Setup Tab (Admin) */}
          {activeTab === 'salaries' && isAdmin && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Configure base salary and hourly rates for employees
                </p>
                {employeesWithoutSalary.length > 0 && (
                  <button
                    onClick={() => {
                      setEditingSalary(null);
                      setShowSalaryModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Icon icon="mdi:plus" className="w-5 h-5" />
                    Add Salary
                  </button>
                )}
              </div>

              {salaries.length > 0 ? (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[var(--color-bg-elevated)]">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Employee</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Base Salary</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Hourly Rate</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {salaries.map((salary) => (
                        <tr key={salary.id} className="hover:bg-[var(--color-bg-elevated)]">
                          <td className="px-4 py-3">
                            <p className="font-medium">{salary.user_name}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">{salary.user_email}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {formatCurrency(salary.base_salary, salary.currency)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[var(--color-text-muted)]">
                            {formatCurrency(salary.hourly_rate, salary.currency)}/hr
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setEditingSalary(salary);
                                setShowSalaryModal(true);
                              }}
                              className="text-violet-400 hover:text-violet-300 p-1"
                            >
                              <Icon icon="mdi:pencil" className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="mdi:account-cash-outline"
                  title="No salaries configured"
                  description="Add salary information for employees to start processing payroll"
                  showAction={employeesWithoutSalary.length > 0}
                  actionLabel="Add Salary"
                  onAction={() => setShowSalaryModal(true)}
                />
              )}
            </div>
          )}

          {/* Payroll Periods Tab (Admin) */}
          {activeTab === 'periods' && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Periods List */}
              <div className="lg:col-span-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Periods</h3>
                  <button
                    onClick={() => setShowPeriodModal(true)}
                    className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                  >
                    <Icon icon="mdi:plus" className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {periods.map((period) => (
                    <div
                      key={period.id}
                      onClick={() => handleSelectPeriod(period)}
                      className={`bg-[var(--color-bg-card)] border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPeriod?.id === period.id
                          ? 'border-violet-500 ring-1 ring-violet-500/50'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{period.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          period.status === 'finalized'
                            ? 'bg-green-500/20 text-green-400'
                            : period.status === 'processing'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {period.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatDate(period.start_date)} - {formatDate(period.end_date)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {period.payslip_count} payslips
                      </p>
                    </div>
                  ))}
                  
                  {periods.length === 0 && (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                      <Icon icon="mdi:calendar-blank" className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No periods yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Period Detail */}
              <div className="lg:col-span-2">
                {selectedPeriod ? (
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl">
                    <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedPeriod.name}</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {formatDate(selectedPeriod.start_date)} - {formatDate(selectedPeriod.end_date)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {selectedPeriod.status !== 'finalized' && (
                          <>
                            <button
                              onClick={() => handleGeneratePayslips(selectedPeriod)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                            >
                              <Icon icon="mdi:calculator" className="w-4 h-4" />
                              Generate
                            </button>
                            {parseInt(selectedPeriod.payslip_count) > 0 && (
                              <button
                                onClick={() => handleFinalizePeriod(selectedPeriod)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <Icon icon="mdi:check" className="w-4 h-4" />
                                Finalize
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePeriod(selectedPeriod)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Icon icon="mdi:delete" className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedPeriodPayslips.length > 0 ? (
                      <div className="divide-y divide-[var(--color-border)]">
                        {selectedPeriodPayslips.map((payslip) => (
                          <div key={payslip.id} className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{payslip.user_name}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {parseFloat(payslip.hours_worked || 0).toFixed(1)}h worked
                                {parseFloat(payslip.overtime_hours || 0) > 0 && (
                                  <span className="text-amber-400 ml-2">
                                    +{parseFloat(payslip.overtime_hours || 0).toFixed(1)}h OT
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-semibold text-green-400">
                                {formatCurrency(payslip.net_pay)}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                Base: {formatCurrency(payslip.base_salary)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-[var(--color-text-muted)]">
                        <Icon icon="mdi:file-document-outline" className="w-12 h-12 mx-auto mb-2" />
                        <p>No payslips generated yet</p>
                        <p className="text-sm mt-1">Click "Generate" to calculate payslips</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                    <Icon icon="mdi:cursor-default-click" className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                    <p className="text-[var(--color-text-muted)]">Select a period to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Salary Modal */}
      {showSalaryModal && (
        <SalaryModal
          orgId={currentOrg.id}
          salary={editingSalary}
          employees={employeesWithoutSalary}
          onClose={() => {
            setShowSalaryModal(false);
            setEditingSalary(null);
          }}
          onSave={() => {
            setShowSalaryModal(false);
            setEditingSalary(null);
            fetchData();
            setSuccess('Salary saved!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* Period Modal */}
      {showPeriodModal && (
        <PeriodModal
          orgId={currentOrg.id}
          onClose={() => setShowPeriodModal(false)}
          onSave={() => {
            setShowPeriodModal(false);
            fetchData();
            setSuccess('Period created!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* Payslip Detail Modal */}
      {showPayslipDetail && (
        <PayslipDetailModal
          payslip={showPayslipDetail}
          onClose={() => setShowPayslipDetail(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
      />
    </>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
        active
          ? 'border-violet-500 text-white'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
      }`}
    >
      <Icon icon={icon} className="w-4 h-4" />
      {label}
    </button>
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
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Icon icon="mdi:plus" className="w-5 h-5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Salary Modal
function SalaryModal({ orgId, salary, employees, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    user_id: salary?.user_id || '',
    base_salary: salary?.base_salary || '',
    hourly_rate: salary?.hourly_rate || '',
    currency: salary?.currency || 'MYR'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (salary) {
        await api.put(`/payroll/org/${orgId}/salaries/${salary.id}`, formData);
      } else {
        await api.post(`/payroll/org/${orgId}/salaries`, formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save salary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{salary ? 'Edit Salary' : 'Add Salary'}</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!salary && (
            <div>
              <label className="block text-sm font-medium mb-2">Employee</label>
              <CustomSelect
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="Select employee"
                options={[{ value: '', label: 'Select employee' }, ...employees.map((emp) => ({ value: emp.id, label: `${emp.name} (${emp.email})` }))]}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Base Salary (Monthly)</label>
            <input
              type="number"
              step="0.01"
              value={formData.base_salary}
              onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
              placeholder="e.g. 5000.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hourly Rate (Overtime)</label>
            <input
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              placeholder="e.g. 30.00"
            />
          </div>

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
              className="flex-1 py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Period Modal
function PeriodModal({ orgId, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/payroll/org/${orgId}/periods`, formData);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create period');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md overflow-visible">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Create Payroll Period</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Period Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. January 2026"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <DatePicker
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                placeholder="Start date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <DatePicker
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                placeholder="End date"
              />
            </div>
          </div>

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
              className="flex-1 py-3 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payslip Detail Modal
function PayslipDetailModal({ payslip, onClose, formatCurrency, formatDate }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Payslip Details</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center pb-4 border-b border-[var(--color-border)]">
            <h4 className="font-semibold text-lg">{payslip.period_name}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Base Salary</span>
              <span className="font-mono">{formatCurrency(payslip.base_salary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Hours Worked</span>
              <span className="font-mono">{parseFloat(payslip.hours_worked || 0).toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Overtime Hours</span>
              <span className="font-mono">{parseFloat(payslip.overtime_hours || 0).toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Overtime Pay</span>
              <span className="font-mono text-amber-400">+{formatCurrency(payslip.overtime_pay)}</span>
            </div>
            {parseFloat(payslip.bonuses) > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Bonuses</span>
                <span className="font-mono text-green-400">+{formatCurrency(payslip.bonuses)}</span>
              </div>
            )}
            {parseFloat(payslip.deductions) > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Deductions</span>
                <span className="font-mono text-red-400">-{formatCurrency(payslip.deductions)}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Net Pay</span>
              <span className="text-2xl font-bold text-green-400">{formatCurrency(payslip.net_pay)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] text-white font-medium transition-colors mt-4"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
