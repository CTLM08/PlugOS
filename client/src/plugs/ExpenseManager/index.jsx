import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ConfirmModal from '../../components/ConfirmModal';
import DatePicker from '../../components/DatePicker';
import CustomSelect from '../../components/CustomSelect';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function ExpenseManager() {
  const { currentOrg, isAdmin, isManager, user } = useAuth();
  const canReview = isAdmin || isManager;
  const [activeTab, setActiveTab] = useState('my-expenses');
  const [myExpenses, setMyExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month');

  // Default analytics range: last 12 months
  const now = new Date();
  const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defaultStart = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const [analyticsStartDate, setAnalyticsStartDate] = useState(defaultStart);
  const [analyticsEndDate, setAnalyticsEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(null);

  useBodyScrollLock(showExpenseModal || showCategoryModal || showReviewModal || showReceiptModal);

  useEffect(() => {
    if (currentOrg) fetchData();
  }, [currentOrg, activeTab, analyticsPeriod, analyticsStartDate, analyticsEndDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const catRes = await api.get(`/expenses/org/${currentOrg.id}/categories`);
      setCategories(catRes.data);

      if (activeTab === 'my-expenses') {
        const res = await api.get(`/expenses/org/${currentOrg.id}/my-expenses`);
        setMyExpenses(res.data);
      } else if (activeTab === 'all-expenses' && canReview) {
        const params = statusFilter ? `?status=${statusFilter}` : '';
        const res = await api.get(`/expenses/org/${currentOrg.id}/expenses${params}`);
        setAllExpenses(res.data);
      } else if (activeTab === 'analytics' && canReview) {
        const res = await api.get(`/expenses/org/${currentOrg.id}/analytics?period=${analyticsPeriod}&start_date=${analyticsStartDate}&end_date=${analyticsEndDate}`);
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg && activeTab === 'all-expenses' && canReview) {
      const fetchFiltered = async () => {
        try {
          const params = statusFilter ? `?status=${statusFilter}` : '';
          const res = await api.get(`/expenses/org/${currentOrg.id}/expenses${params}`);
          setAllExpenses(res.data);
        } catch (error) {
          console.error('Failed to fetch expenses:', error);
        }
      };
      fetchFiltered();
    }
  }, [statusFilter]);

  const handleDeleteExpense = (expense) => {
    setConfirmModal({
      title: 'Delete Expense',
      message: `Are you sure you want to delete "${expense.title}"?`,
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/expenses/org/${currentOrg.id}/expenses/${expense.id}`);
          setConfirmModal(null);
          fetchData();
        } catch (error) {
          console.error('Failed to delete expense:', error);
        }
      }
    });
  };

  const handleDeleteCategory = (cat) => {
    setConfirmModal({
      title: 'Delete Category',
      message: `Are you sure? Expenses in "${cat.name}" will become uncategorized.`,
      confirmText: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/expenses/org/${currentOrg.id}/categories/${cat.id}`);
          setConfirmModal(null);
          fetchData();
        } catch (error) {
          console.error('Failed to delete category:', error);
        }
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status] || ''}`}>
        <Icon icon={status === 'approved' ? 'mdi:check' : status === 'rejected' ? 'mdi:close' : 'mdi:clock-outline'} className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const tabs = [
    { id: 'my-expenses', label: 'My Expenses', icon: 'mdi:receipt-text-outline' },
    ...(canReview ? [
      { id: 'all-expenses', label: 'All Expenses', icon: 'mdi:format-list-checks' },
      { id: 'analytics', label: 'Analytics', icon: 'mdi:chart-bar' },
    ] : []),
    ...(isAdmin ? [{ id: 'categories', label: 'Categories', icon: 'mdi:tag-multiple' }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Expense Manager</h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Submit and manage expense claims</p>
        </div>
        {activeTab === 'my-expenses' && (
          <button
            onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
          >
            <Icon icon="mdi:plus" className="w-5 h-5" />
            New Expense
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--color-bg-elevated)] rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            <Icon icon={tab.icon} className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon icon="mdi:loading" className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'my-expenses' && (
            <MyExpensesTab
              expenses={myExpenses}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
              onEdit={(e) => { setEditingExpense(e); setShowExpenseModal(true); }}
              onDelete={handleDeleteExpense}
              onViewReceipt={setShowReceiptModal}
            />
          )}
          {activeTab === 'all-expenses' && canReview && (
            <AllExpensesTab
              expenses={allExpenses}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
              statusFilter={statusFilter}
              onFilterChange={setStatusFilter}
              onReview={setShowReviewModal}
              onViewReceipt={setShowReceiptModal}
            />
          )}
          {activeTab === 'analytics' && canReview && (
            <AnalyticsTab
              analytics={analytics}
              period={analyticsPeriod}
              onPeriodChange={setAnalyticsPeriod}
              formatCurrency={formatCurrency}
              startDate={analyticsStartDate}
              endDate={analyticsEndDate}
              onStartDateChange={setAnalyticsStartDate}
              onEndDateChange={setAnalyticsEndDate}
            />
          )}
          {activeTab === 'categories' && isAdmin && (
            <CategoriesTab
              categories={categories}
              onAdd={() => setShowCategoryModal(true)}
              onDelete={handleDeleteCategory}
            />
          )}
        </>
      )}

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal
          orgId={currentOrg.id}
          categories={categories}
          expense={editingExpense}
          onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
          onSave={() => { setShowExpenseModal(false); setEditingExpense(null); fetchData(); }}
        />
      )}
      {showCategoryModal && (
        <CategoryModal
          orgId={currentOrg.id}
          onClose={() => setShowCategoryModal(false)}
          onSave={() => { setShowCategoryModal(false); fetchData(); }}
        />
      )}
      {showReviewModal && (
        <ReviewModal
          orgId={currentOrg.id}
          expense={showReviewModal}
          onClose={() => setShowReviewModal(null)}
          onSave={() => { setShowReviewModal(null); fetchData(); }}
          formatCurrency={formatCurrency}
        />
      )}
      {showReceiptModal && (
        <ReceiptModal
          receiptData={showReceiptModal}
          onClose={() => setShowReceiptModal(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

// ==================== MY EXPENSES TAB ====================
function MyExpensesTab({ expenses, formatCurrency, formatDate, getStatusBadge, onEdit, onDelete, onViewReceipt }) {
  if (expenses.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon="mdi:receipt-text-outline" className="w-8 h-8 text-emerald-500/50" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
        <p className="text-[var(--color-text-muted)]">Submit your first expense claim to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Expense</th>
            <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Category</th>
            <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Date</th>
            <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Amount</th>
            <th className="text-center text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Status</th>
            <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-elevated)]/50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium">{expense.title}</div>
                {expense.description && <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[250px]">{expense.description}</div>}
              </td>
              <td className="px-6 py-4">
                {expense.category_name ? (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Icon icon={expense.category_icon || 'mdi:tag'} className="w-4 h-4 text-emerald-400" />
                    {expense.category_name}
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)] text-sm">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">{formatDate(expense.expense_date)}</td>
              <td className="px-6 py-4 text-right font-semibold">{formatCurrency(expense.amount)}</td>
              <td className="px-6 py-4 text-center">{getStatusBadge(expense.status)}</td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  {expense.receipt_data && (
                    <button onClick={() => onViewReceipt(expense.receipt_data)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors" title="View Receipt">
                      <Icon icon="mdi:image" className="w-4 h-4" />
                    </button>
                  )}
                  {expense.status === 'pending' && (
                    <>
                      <button onClick={() => onEdit(expense)} className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors" title="Edit">
                        <Icon icon="mdi:pencil" className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(expense)} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors" title="Delete">
                        <Icon icon="mdi:delete" className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {expense.status !== 'pending' && expense.reviewer_name && (
                    <span className="text-xs text-[var(--color-text-muted)]" title={`Reviewed by ${expense.reviewer_name}`}>
                      <Icon icon="mdi:account-check" className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== ALL EXPENSES TAB ====================
function AllExpensesTab({ expenses, formatCurrency, formatDate, getStatusBadge, statusFilter, onFilterChange, onReview, onViewReceipt }) {
  const filterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-48">
          <CustomSelect
            value={statusFilter}
            onChange={onFilterChange}
            options={filterOptions}
            placeholder="Filter by status"
          />
        </div>
        <span className="text-sm text-[var(--color-text-muted)]">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <Icon icon="mdi:receipt-text-check" className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)]">No expenses found</p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Employee</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Expense</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Category</th>
                <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Date</th>
                <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Amount</th>
                <th className="text-center text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-elevated)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-400">{expense.user_name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{expense.user_name}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{expense.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-sm">{expense.title}</div>
                    {expense.description && <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[200px]">{expense.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {expense.category_name ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Icon icon={expense.category_icon || 'mdi:tag'} className="w-4 h-4 text-emerald-400" />
                        {expense.category_name}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)] text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">{formatDate(expense.expense_date)}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(expense.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {expense.receipt_data && (
                        <button onClick={() => onViewReceipt(expense.receipt_data)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors" title="View Receipt">
                          <Icon icon="mdi:image" className="w-4 h-4" />
                        </button>
                      )}
                      {expense.status === 'pending' && (
                        <button onClick={() => onReview(expense)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
                          <Icon icon="mdi:check-decagram" className="w-3.5 h-3.5" />
                          Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== ANALYTICS TAB ====================
function AnalyticsTab({ analytics, period, onPeriodChange, formatCurrency, startDate, endDate, onStartDateChange, onEndDateChange }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i); // 5 years back + current + 1 ahead

  const parseYM = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return { year: y, month: m };
  };

  const startParsed = parseYM(startDate);
  const endParsed = parseYM(endDate);

  const setRange = (sYear, sMonth, eYear, eMonth) => {
    const s = `${sYear}-${String(sMonth).padStart(2, '0')}`;
    const e = `${eYear}-${String(eMonth).padStart(2, '0')}`;
    // Auto-swap if start > end
    if (s > e) {
      onStartDateChange(e);
      onEndDateChange(s);
    } else {
      onStartDateChange(s);
      onEndDateChange(e);
    }
  };

  const quickPresets = [
    { label: 'Last 3 months', fn: () => {
      const d = new Date(); d.setMonth(d.getMonth() - 2);
      setRange(d.getFullYear(), d.getMonth() + 1, currentYear, new Date().getMonth() + 1);
    }},
    { label: 'Last 6 months', fn: () => {
      const d = new Date(); d.setMonth(d.getMonth() - 5);
      setRange(d.getFullYear(), d.getMonth() + 1, currentYear, new Date().getMonth() + 1);
    }},
    { label: 'Last 12 months', fn: () => {
      const d = new Date(); d.setMonth(d.getMonth() - 11);
      setRange(d.getFullYear(), d.getMonth() + 1, currentYear, new Date().getMonth() + 1);
    }},
    { label: 'This year', fn: () => setRange(currentYear, 1, currentYear, 12) },
    { label: 'Last year', fn: () => setRange(currentYear - 1, 1, currentYear - 1, 12) },
  ];

  const monthOptions = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
  const yearOptions = years.map(y => ({ value: String(y), label: String(y) }));

  if (!analytics) return null;

  const { chart, summary, topCategories, topSpenders } = analytics;
  const maxValue = Math.max(...chart.map(d => parseFloat(d.total || 0)), 1);

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex flex-col gap-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-medium mr-1">Quick:</span>
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={preset.fn}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-emerald-500/40 transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Start Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">From:</span>
              <CustomSelect
                value={String(startParsed.month)}
                onChange={(e) => setRange(startParsed.year, parseInt(e.target.value), endParsed.year, endParsed.month)}
                options={monthOptions}
                minWidth="90px"
              />
              <CustomSelect
                value={String(startParsed.year)}
                onChange={(e) => setRange(parseInt(e.target.value), startParsed.month, endParsed.year, endParsed.month)}
                options={yearOptions}
                minWidth="85px"
              />
            </div>

            <Icon icon="mdi:arrow-right" className="w-4 h-4 text-[var(--color-text-muted)]" />

            {/* End Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">To:</span>
              <CustomSelect
                value={String(endParsed.month)}
                onChange={(e) => setRange(startParsed.year, startParsed.month, endParsed.year, parseInt(e.target.value))}
                options={monthOptions}
                minWidth="90px"
              />
              <CustomSelect
                value={String(endParsed.year)}
                onChange={(e) => setRange(startParsed.year, startParsed.month, parseInt(e.target.value), endParsed.month)}
                options={yearOptions}
                minWidth="85px"
              />
            </div>

            {/* Granularity Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[var(--color-text-muted)] font-medium">View:</span>
              <div className="flex gap-0.5 bg-[var(--color-bg-elevated)] rounded-lg p-0.5">
                {[{ value: 'day', label: 'Daily' }, { value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onPeriodChange(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      period === opt.value ? 'bg-emerald-600 text-white' : 'text-[var(--color-text-muted)] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon="mdi:receipt-text" label="Total Expenses" value={parseInt(summary.total_expenses)} color="emerald" />
        <SummaryCard icon="mdi:clock-outline" label="Pending" value={parseInt(summary.pending_count)} subValue={formatCurrency(summary.pending_amount)} color="amber" />
        <SummaryCard icon="mdi:check-circle" label="Approved" value={parseInt(summary.approved_count)} subValue={formatCurrency(summary.approved_amount)} color="emerald" />
        <SummaryCard icon="mdi:close-circle" label="Rejected" value={parseInt(summary.rejected_count)} color="red" />
      </div>

      {/* Bar Chart */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Expense Trend</h3>
        {chart.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Icon icon="mdi:chart-bar" className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No expense data in this range</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-64">
            {chart.map((item, i) => {
              const approved = parseFloat(item.approved_total || 0);
              const pending = parseFloat(item.pending_total || 0);
              const total = parseFloat(item.total || 0);
              const heightPercent = (total / maxValue) * 100;
              const approvedPercent = total > 0 ? (approved / total) * heightPercent : 0;
              const pendingPercent = total > 0 ? (pending / total) * heightPercent : 0;
              const rejectedPercent = heightPercent - approvedPercent - pendingPercent;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-xs text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    {formatCurrency(total)}
                  </div>
                  <div className="w-full flex flex-col justify-end" style={{ height: '200px' }}>
                    <div className="w-full flex flex-col rounded-t-md overflow-hidden" style={{ height: `${Math.max(heightPercent, 2)}%` }}>
                      {rejectedPercent > 0 && (
                        <div className="w-full bg-red-500/40" style={{ flex: rejectedPercent }} />
                      )}
                      {pendingPercent > 0 && (
                        <div className="w-full bg-amber-500/60" style={{ flex: pendingPercent }} />
                      )}
                      {approvedPercent > 0 && (
                        <div className="w-full bg-emerald-500" style={{ flex: approvedPercent }} />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
        {chart.length > 0 && (
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Approved</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500/60" /> Pending</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/40" /> Rejected</span>
          </div>
        )}
      </div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Top Categories</h3>
          {topCategories.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No categorized expenses yet</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon={cat.icon || 'mdi:tag'} className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm">{cat.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">({cat.count})</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Spenders */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Top Spenders</h3>
          {topSpenders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No approved expenses yet</p>
          ) : (
            <div className="space-y-3">
              {topSpenders.map((spender, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-400">{spender.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm">{spender.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">({spender.count})</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(spender.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, subValue, color }) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon icon={icon} className="w-5 h-5" />
        <span className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subValue && <div className="text-xs mt-1 opacity-80">{subValue}</div>}
    </div>
  );
}

// ==================== CATEGORIES TAB ====================
function CategoriesTab({ categories, onAdd, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--color-text-muted)]">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</span>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Icon icon="mdi:plus" className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <Icon icon="mdi:tag-plus" className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
          <p className="text-[var(--color-text-muted)]">Create categories to organize expenses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Icon icon={cat.icon || 'mdi:tag'} className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium">{cat.name}</h4>
                  <p className="text-xs text-[var(--color-text-muted)]">{cat.expense_count || 0} expense{cat.expense_count != 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => onDelete(cat)}
                className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Delete"
              >
                <Icon icon="mdi:delete" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== EXPENSE MODAL ====================
function ExpenseModal({ orgId, categories, expense, onClose, onSave }) {
  const [title, setTitle] = useState(expense?.title || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount || '');
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(expense?.category_id || '');
  const [receiptData, setReceiptData] = useState(expense?.receipt_data || null);
  const [saving, setSaving] = useState(false);

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setReceiptData(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || !expenseDate) return;

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        category_id: categoryId || null,
        receipt_data: receiptData,
      };

      if (expense) {
        await api.put(`/expenses/org/${orgId}/expenses/${expense.id}`, data);
      } else {
        await api.post(`/expenses/org/${orgId}/expenses`, data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert(error.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-modal-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{expense ? 'Edit Expense' : 'New Expense'}</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Client dinner, Taxi fare"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount (MYR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <DatePicker value={expenseDate} onChange={setExpenseDate} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <CustomSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Select category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Receipt (optional)</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors text-sm">
                <Icon icon="mdi:camera" className="w-4 h-4 text-emerald-400" />
                {receiptData ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {receiptData && (
                <div className="flex items-center gap-2">
                  <img src={receiptData} alt="Receipt" className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)]" />
                  <button type="button" onClick={() => setReceiptData(null)} className="text-red-400 hover:text-red-300">
                    <Icon icon="mdi:close" className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim() || !amount} className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : expense ? 'Update' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== CATEGORY MODAL ====================
function CategoryModal({ orgId, onClose, onSave }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('mdi:tag');
  const [saving, setSaving] = useState(false);

  const iconOptions = [
    'mdi:tag', 'mdi:airplane', 'mdi:food', 'mdi:car', 'mdi:office-building',
    'mdi:laptop', 'mdi:tools', 'mdi:gift', 'mdi:phone', 'mdi:book',
    'mdi:medical-bag', 'mdi:school', 'mdi:home', 'mdi:shopping',
    'mdi:gas-station', 'mdi:train', 'mdi:coffee', 'mdi:printer',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await api.post(`/expenses/org/${orgId}/categories`, { name: name.trim(), icon });
      onSave();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert(error.response?.data?.error || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-modal-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">New Category</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Travel, Food, Equipment"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="grid grid-cols-9 gap-1">
              {iconOptions.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    icon === ic ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  <Icon icon={ic} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== REVIEW MODAL ====================
function ReviewModal({ orgId, expense, onClose, onSave, formatCurrency }) {
  const [status, setStatus] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/expenses/org/${orgId}/expenses/${expense.id}/review`, {
        status,
        review_notes: reviewNotes.trim() || null,
      });
      onSave();
    } catch (error) {
      console.error('Failed to review expense:', error);
      alert(error.response?.data?.error || 'Failed to review expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-modal-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Review Expense</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Expense Details */}
        <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{expense.title}</h4>
              <p className="text-sm text-[var(--color-text-muted)]">by {expense.user_name}</p>
            </div>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(expense.amount)}</span>
          </div>
          {expense.description && <p className="text-sm text-[var(--color-text-muted)]">{expense.description}</p>}
          {expense.receipt_data && (
            <img src={expense.receipt_data} alt="Receipt" className="w-full max-h-40 object-contain rounded-lg mt-2 border border-[var(--color-border)]" />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Decision</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  status === 'approved' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/50'
                }`}
              >
                <Icon icon="mdi:check-circle" className="w-5 h-5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  status === 'rejected' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-500/50'
                }`}
              >
                <Icon icon="mdi:close-circle" className="w-5 h-5" />
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={2}
              placeholder="Add review notes..."
              className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {saving ? 'Saving...' : status === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== RECEIPT MODAL ====================
function ReceiptModal({ receiptData, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay" onClick={onClose}>
      <div className="relative max-w-2xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-white z-10">
          <Icon icon="mdi:close" className="w-5 h-5" />
        </button>
        <img src={receiptData} alt="Receipt" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
      </div>
    </div>
  );
}
