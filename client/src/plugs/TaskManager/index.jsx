import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import DatePicker from '../../components/DatePicker';
import CustomSelect from '../../components/CustomSelect';

// Status configuration
const STATUSES = [
  { key: 'To Do', label: 'To Do', icon: 'mdi:circle-outline', color: 'rose', gradient: 'from-rose-500/20 to-pink-500/20', border: 'border-rose-500/30' },
  { key: 'In Progress', label: 'In Progress', icon: 'mdi:progress-clock', color: 'blue', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  { key: 'Review', label: 'Review', icon: 'mdi:eye-check', color: 'purple', gradient: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30' },
  { key: 'Completed', label: 'Completed', icon: 'mdi:check-circle', color: 'green', gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' }
];

const PRIORITIES = {
  Urgent: { color: 'red', icon: 'mdi:alert-circle' },
  High: { color: 'orange', icon: 'mdi:arrow-up-bold' },
  Medium: { color: 'rose', icon: 'mdi:minus' },
  Low: { color: 'gray', icon: 'mdi:arrow-down-bold' }
};

export default function TaskManager() {
  const { currentOrg, isManager, isAdmin, user } = useAuth();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('task-view-mode') || 'kanban');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data state
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [myEmployeeId, setMyEmployeeId] = useState(null);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showMyTasks, setShowMyTasks] = useState(false);

  // Drag state for Kanban
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('task-view-mode', viewMode);
  }, [viewMode]);

  // Fetch data
  useEffect(() => {
    if (currentOrg) {
      fetchInitialData();
    }
  }, [currentOrg]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tasksRes, empRes, deptRes] = await Promise.all([
        api.get(`/tasks/org/${currentOrg.id}`),
        api.get(`/employees/org/${currentOrg.id}`),
        api.get(`/departments/org/${currentOrg.id}`)
      ]);
      setTasks(tasksRes.data);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
      
      // Find current user's employee ID
      const me = empRes.data.find(e => e.email === user.email);
      if (me) setMyEmployeeId(me.id);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get(`/tasks/org/${currentOrg.id}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
  }, [currentOrg?.id]);

  // Check if user is assigned to a task
  const isUserAssignedToTask = useCallback((task) => {
    if (!task.assignees || !myEmployeeId) return false;
    return task.assignees.some(a => a.employee_id === myEmployeeId);
  }, [myEmployeeId]);

  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query) && 
            !(task.description?.toLowerCase().includes(query))) {
          return false;
        }
      }
      // Priority filter
      if (priorityFilter && task.priority !== priorityFilter) return false;
      // Assignee filter
      if (assigneeFilter) {
        const hasAssignee = task.assignees?.some(
          a => a.employee_id === assigneeFilter || a.department_id === assigneeFilter
        );
        if (!hasAssignee) return false;
      }
      // My tasks filter
      if (showMyTasks && !isUserAssignedToTask(task)) return false;
      return true;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter, showMyTasks, isUserAssignedToTask]);

  // Memoized statistics
  const stats = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'Completed').length;
    const dueThisWeek = tasks.filter(t => {
      if (!t.due_date || t.status === 'Completed') return false;
      const due = new Date(t.due_date);
      return due >= now && due <= weekFromNow;
    }).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, overdue, dueThisWeek, completionRate };
  }, [tasks]);

  // Tasks grouped by status for Kanban
  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach(s => { grouped[s.key] = []; });
    filteredTasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped['To Do'].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  // Event handlers
  const handleCreateTask = useCallback(() => {
    setSelectedTask(null);
    setModalMode('create');
    setShowTaskModal(true);
  }, []);

  const handleEditTask = useCallback((task, e) => {
    e?.stopPropagation();
    setSelectedTask(task);
    setModalMode('edit');
    setShowTaskModal(true);
  }, []);

  const handleViewTask = useCallback((task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  }, []);

  const handleSaveTask = async (data) => {
    try {
      if (modalMode === 'create') {
        await api.post(`/tasks/org/${currentOrg.id}`, data);
        setSuccess('Task created successfully!');
      } else {
        await api.put(`/tasks/org/${currentOrg.id}/${selectedTask.id}`, data);
        setSuccess('Task updated successfully!');
      }
      setShowTaskModal(false);
      fetchTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      throw err;
    }
  };

  const handleStatusUpdate = useCallback(async (taskId, newStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await api.put(`/tasks/org/${currentOrg.id}/${taskId}/status`, { status: newStatus });
    } catch (err) {
      fetchTasks(); // Revert on error
      setError(err.response?.data?.error || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  }, [currentOrg?.id, fetchTasks]);

  const handleDeleteTask = useCallback(async (taskId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/org/${currentOrg.id}/${taskId}`);
      setSuccess('Task deleted!');
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete task');
    }
  }, [currentOrg?.id]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDrop = useCallback((e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== newStatus) {
      handleStatusUpdate(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  }, [draggedTask, handleStatusUpdate]);

  // Helper functions
  const getDueDateInfo = useCallback((dueDate, status) => {
    if (!dueDate || status === 'Completed') return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, className: 'text-red-400 bg-red-400/10' };
    } else if (diffDays === 0) {
      return { text: 'Due today', className: 'text-amber-400 bg-amber-400/10' };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', className: 'text-amber-400 bg-amber-400/10' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays}d left`, className: 'text-blue-400 bg-blue-400/10' };
    }
    return { text: new Date(dueDate).toLocaleDateString(), className: 'text-[var(--color-text-muted)]' };
  }, []);

  const getPriorityStyle = useCallback((priority) => {
    const p = PRIORITIES[priority] || PRIORITIES.Medium;
    return `text-${p.color}-400 bg-${p.color}-400/10 border-${p.color}-400/20`;
  }, []);

  // Check if user can edit/delete tasks
  const canManageTasks = isAdmin || isManager;

  // Combined assignee options for filter
  const assigneeOptions = useMemo(() => [
    { value: '', label: 'All Assignees' },
    { value: 'divider-employees', label: '── Employees ──', disabled: true },
    ...employees.map(emp => ({ value: emp.id, label: emp.name, icon: 'mdi:account' })),
    { value: 'divider-departments', label: '── Departments ──', disabled: true },
    ...departments.map(dept => ({ value: dept.id, label: dept.name, icon: 'mdi:account-group' }))
  ], [employees, departments]);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30">
            <Icon icon="mdi:clipboard-check-outline" className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Task Manager</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Organize and track your work</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-[var(--color-bg-elevated)] rounded-xl p-1 border border-[var(--color-border)]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                viewMode === 'kanban' ? 'bg-rose-600 text-white' : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              <Icon icon="mdi:view-column" className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                viewMode === 'list' ? 'bg-rose-600 text-white' : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              <Icon icon="mdi:view-list" className="w-4 h-4" />
              List
            </button>
          </div>
          
          {canManageTasks && (
            <button
              onClick={handleCreateTask}
              className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-rose-900/20 active:scale-[0.98]"
            >
              <Icon icon="mdi:plus" className="w-5 h-5" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="animate-item mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:alert-circle" className="w-5 h-5" />
            {error}
          </div>
          <button onClick={() => setError('')} className="hover:text-red-300 transition-colors">
            <Icon icon="mdi:close" className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="animate-item mb-6 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <Icon icon="mdi:check-circle" className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Statistics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="mdi:clipboard-list" label="Total Tasks" value={stats.total} color="rose" />
        <StatCard icon="mdi:check-circle" label="Completed" value={`${stats.completionRate}%`} color="green" />
        <StatCard icon="mdi:alert-circle" label="Overdue" value={stats.overdue} color="red" highlight={stats.overdue > 0} />
        <StatCard icon="mdi:calendar-week" label="Due This Week" value={stats.dueThisWeek} color="blue" />
      </div>

      {/* Filters Bar */}
      <div className="animate-item bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 pr-4 py-2 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl w-full focus:ring-2 focus:ring-rose-500/20 outline-none"
            />
          </div>
          
          {/* My Tasks Toggle */}
          <button
            onClick={() => setShowMyTasks(!showMyTasks)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2 border ${
              showMyTasks 
                ? 'bg-rose-600 border-rose-600 text-white' 
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-rose-500/30'
            }`}
          >
            <Icon icon="mdi:account" className="w-4 h-4" />
            My Tasks
          </button>

          {/* Priority Filter */}
          <CustomSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            placeholder="All Priorities"
            minWidth="140px"
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'Urgent', label: '🔴 Urgent' },
              { value: 'High', label: '🟠 High' },
              { value: 'Medium', label: '🩷 Medium' },
              { value: 'Low', label: '⚪ Low' }
            ]}
          />

          {/* Assignee Filter */}
          <CustomSelect
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            placeholder="All Assignees"
            minWidth="160px"
            options={assigneeOptions}
          />

          {/* Clear Filters */}
          {(searchQuery || priorityFilter || assigneeFilter || showMyTasks) && (
            <button
              onClick={() => { setSearchQuery(''); setPriorityFilter(''); setAssigneeFilter(''); setShowMyTasks(false); }}
              className="px-3 py-2 text-sm text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <Icon icon="mdi:filter-off" className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area with Fixed Height */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden h-[calc(100vh-220px)]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
            <Icon icon="mdi:loading" className="w-10 h-10 text-rose-500 animate-spin" />
            <p className="text-[var(--color-text-muted)] animate-pulse">Loading tasks...</p>
          </div>
        ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
          {STATUSES.map((status) => (
            <div
              key={status.key}
              className={`flex flex-col min-h-0 rounded-2xl border transition-all ${
                dragOverColumn === status.key 
                  ? 'border-rose-500/50 bg-rose-500/5' 
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
              }`}
              onDragOver={(e) => handleDragOver(e, status.key)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, status.key)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-[var(--color-border)] rounded-t-2xl bg-gradient-to-r ${status.gradient}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon={status.icon} className={`w-5 h-5 text-${status.color}-400`} />
                    <span className="font-semibold text-white">{status.label}</span>
                  </div>
                  <span className={`text-xs font-bold bg-${status.color}-500/20 text-${status.color}-400 px-2 py-0.5 rounded-full`}>
                    {tasksByStatus[status.key]?.length || 0}
                  </span>
                </div>
              </div>

              {/* Tasks List - Independently Scrollable */}
              <div className="flex-1 min-h-0 p-3 space-y-3 overflow-y-auto scrollbar-hide">
                {tasksByStatus[status.key]?.length > 0 ? (
                  tasksByStatus[status.key].map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={idx}
                      onView={() => handleViewTask(task)}
                      onEdit={(e) => handleEditTask(task, e)}
                      onDelete={(e) => handleDeleteTask(task.id, e)}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      getDueDateInfo={getDueDateInfo}
                      canEdit={canManageTasks}
                      canDelete={canManageTasks}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    <Icon icon="mdi:inbox-outline" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View - Independently Scrollable */
        <div className="flex-1 min-h-0 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredTasks.map((task, idx) => (
                <div
                  key={task.id}
                  onClick={() => handleViewTask(task)}
                  className="p-4 hover:bg-[var(--color-bg-elevated)] cursor-pointer transition-colors animate-item flex items-center gap-4"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Priority Indicator */}
                  <div className={`w-1 h-12 rounded-full bg-${PRIORITIES[task.priority]?.color || 'rose'}-500`} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{task.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] truncate">{task.description || 'No description'}</p>
                  </div>

                  {/* Assignees */}
                  <AssigneeBadges assignees={task.assignees} maxShow={3} />

                  {/* Due Date */}
                  {task.due_date && getDueDateInfo(task.due_date, task.status) && (
                    <div className={`text-xs px-2 py-1 rounded-lg ${getDueDateInfo(task.due_date, task.status)?.className || ''}`}>
                      {getDueDateInfo(task.due_date, task.status)?.text}
                    </div>
                  )}

                  {/* Status */}
                  <span className={`text-xs font-medium px-3 py-1 rounded-lg border ${
                    STATUSES.find(s => s.key === task.status)?.border || ''
                  } bg-gradient-to-r ${STATUSES.find(s => s.key === task.status)?.gradient || ''}`}>
                    {task.status}
                  </span>

                  {/* Actions */}
                  {canManageTasks && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleEditTask(task, e)}
                        className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                      >
                        <Icon icon="mdi:pencil" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                      >
                        <Icon icon="mdi:delete" className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              </div>
            ) : (
              <EmptyState 
                onCreateTask={handleCreateTask} 
                hasFilters={searchQuery || priorityFilter || assigneeFilter || showMyTasks}
                onClearFilters={() => { setSearchQuery(''); setPriorityFilter(''); setAssigneeFilter(''); setShowMyTasks(false); }}
                canCreate={canManageTasks}
              />
            )}
          </div>
        </div>
      )}
    </div>

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          mode={modalMode}
          task={selectedTask}
          employees={employees}
          departments={departments}
          onClose={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
        />
      )}
      
      {showDetailModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          orgId={currentOrg.id}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => { setShowDetailModal(false); handleEditTask(selectedTask); }}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={fetchTasks}
          canEdit={canManageTasks}
          canUpdateStatus={canManageTasks || isUserAssignedToTask(selectedTask)}
        />
      )}
    </>
  );
}

// ============ Sub Components ============

function StatCard({ icon, label, value, color, highlight }) {
  return (
    <div className={`animate-item bg-[var(--color-bg-card)] border rounded-2xl p-4 transition-all ${
      highlight ? `border-${color}-500/50 bg-${color}-500/5` : 'border-[var(--color-border)]'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
          <Icon icon={icon} className={`w-5 h-5 text-${color}-400`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AssigneeDropdown({ type, icon, label, items, selectedIds, onToggle, color }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedCount = selectedIds.length;

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border transition-all ${
          selectedCount > 0
            ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-400`
            : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]'
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon icon={icon} className="w-4 h-4" />
          {label}
          {selectedCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full bg-${color}-500/30`}>
              {selectedCount}
            </span>
          )}
        </span>
        <Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto animate-modal-slide-up">
          {items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No {label.toLowerCase()} available</div>
          ) : (
            items.map(item => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id, item.name)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-[var(--color-bg-elevated)] transition-colors ${
                    isSelected ? `text-${color}-400` : 'text-white'
                  }`}
                >
                  <span>{item.name}</span>
                  {isSelected && <Icon icon="mdi:check" className={`w-4 h-4 text-${color}-400`} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function AssigneeBadges({ assignees, maxShow = 3 }) {
  if (!assignees || assignees.length === 0) {
    return (
      <span className="text-xs text-[var(--color-text-muted)]">Unassigned</span>
    );
  }
  
  const shown = assignees.slice(0, maxShow);
  const remaining = assignees.length - maxShow;
  
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((a, i) => (
        <div
          key={i}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[var(--color-bg-card)] ${
            a.department_id 
              ? 'bg-purple-500/20 text-purple-400' 
              : 'bg-rose-500/20 text-rose-400'
          }`}
          title={a.employee_name || a.department_name}
        >
          {a.department_id ? (
            <Icon icon="mdi:account-group" className="w-3.5 h-3.5" />
          ) : (
            (a.employee_name || 'U').charAt(0)
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] flex items-center justify-center text-[10px] font-bold border-2 border-[var(--color-bg-card)]">
          +{remaining}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, index, onView, onEdit, onDelete, onDragStart, onDragEnd, getDueDateInfo, canEdit, canDelete }) {
  const dueInfo = getDueDateInfo(task.due_date, task.status);
  const priority = PRIORITIES[task.priority] || PRIORITIES.Medium;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onView}
      className="animate-item bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-4 cursor-pointer hover:border-rose-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-${priority.color}-400 bg-${priority.color}-400/10 border-${priority.color}-400/20`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              onClick={onEdit}
              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
            >
              <Icon icon="mdi:pencil" className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
            >
              <Icon icon="mdi:delete" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm mb-1 line-clamp-2">{task.title}</h4>
      
      {/* Description */}
      {task.description && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-3">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-border)]">
        {/* Assignees */}
        <AssigneeBadges assignees={task.assignees} maxShow={2} />

        {/* Due Date */}
        {dueInfo && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${dueInfo.className}`}>
            {dueInfo.text}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateTask, hasFilters, onClearFilters, canCreate }) {
  return (
    <div className="p-16 text-center">
      <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon icon="mdi:clipboard-text-outline" className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold mb-2">No tasks found</h3>
      <p className="text-[var(--color-text-muted)] max-w-sm mx-auto mb-8">
        {hasFilters 
          ? "We couldn't find any tasks matching your filters." 
          : "Start by creating your first task to get things moving!"}
      </p>
      {hasFilters ? (
        <button
          onClick={onClearFilters}
          className="text-rose-400 font-medium hover:underline flex items-center gap-2 mx-auto"
        >
          <Icon icon="mdi:filter-off" className="w-4 h-4" />
          Clear all filters
        </button>
      ) : canCreate && (
        <button
          onClick={onCreateTask}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-rose-900/10 active:scale-95"
        >
          <Icon icon="mdi:plus" className="w-5 h-5" />
          Create First Task
        </button>
      )}
    </div>
  );
}

function TaskModal({ mode, task, employees, departments, onClose, onSave }) {
  useBodyScrollLock();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'To Do',
    priority: task?.priority || 'Medium',
    due_date: task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    assignees: task?.assignees || []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (type, id, name) => {
    const existing = formData.assignees.find(
      a => (type === 'employee' && a.employee_id === id) || (type === 'department' && a.department_id === id)
    );
    
    if (existing) {
      setFormData({
        ...formData,
        assignees: formData.assignees.filter(a => a !== existing)
      });
    } else {
      const newAssignee = type === 'employee'
        ? { employee_id: id, employee_name: name }
        : { department_id: id, department_name: name };
      setFormData({
        ...formData,
        assignees: [...formData.assignees, newAssignee]
      });
    }
  };

  const isSelected = (type, id) => {
    return formData.assignees.some(
      a => (type === 'employee' && a.employee_id === id) || (type === 'department' && a.department_id === id)
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-7 w-full max-w-xl animate-modal-slide-up shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold">{mode === 'create' ? 'Create New Task' : 'Edit Task'}</h3>
            <p className="text-sm text-[var(--color-text-muted)]">Set expectations and assign responsibilities</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-white rounded-xl transition-all">
            <Icon icon="mdi:close" className="w-7 h-7" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <Icon icon="mdi:alert-circle" className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Title <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                required
                className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Details, requirements, or links..."
                className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 outline-none transition-all resize-none"
              />
            </div>

            {/* Multi-select Assignees with Dropdowns */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Assignees 
                {formData.assignees.length > 0 && (
                  <span className="ml-2 text-xs text-rose-400">({formData.assignees.length} selected)</span>
                )}
              </label>
              <div className="flex gap-2">
                {/* Employee Dropdown */}
                <AssigneeDropdown
                  type="employee"
                  icon="mdi:account"
                  label="Employees"
                  items={employees}
                  selectedIds={formData.assignees.filter(a => a.employee_id).map(a => a.employee_id)}
                  onToggle={(id, name) => toggleAssignee('employee', id, name)}
                  color="rose"
                />
                
                {/* Department Dropdown */}
                {departments.length > 0 && (
                  <AssigneeDropdown
                    type="department"
                    icon="mdi:account-group"
                    label="Departments"
                    items={departments}
                    selectedIds={formData.assignees.filter(a => a.department_id).map(a => a.department_id)}
                    onToggle={(id, name) => toggleAssignee('department', id, name)}
                    color="purple"
                  />
                )}
              </div>
              
              {/* Selected Assignees Display */}
              {formData.assignees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.assignees.map((a, i) => (
                    <span 
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        a.department_id 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <Icon icon={a.department_id ? 'mdi:account-group' : 'mdi:account'} className="w-3.5 h-3.5" />
                      {a.employee_name || a.department_name}
                      <button 
                        type="button"
                        onClick={() => toggleAssignee(a.department_id ? 'department' : 'employee', a.department_id || a.employee_id, '')}
                        className="ml-1 hover:text-white transition-colors"
                      >
                        <Icon icon="mdi:close" className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Due Date - Full Width */}
            <div>
              <label className="block text-sm font-semibold mb-2">Due Date</label>
              <DatePicker
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                placeholder="Select due date"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Priority</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        formData.priority === p 
                          ? 'bg-rose-600 border-rose-600 text-white' 
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-rose-500/30'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  placeholder="Select status"
                  minWidth="100%"
                  options={STATUSES.map(s => ({ value: s.key, label: s.label, icon: s.icon }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] font-bold hover:bg-[var(--color-bg-elevated)] transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 active:scale-95"
            >
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {mode === 'create' ? 'Create Task' : 'Update Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, orgId, onClose, onEdit, onStatusUpdate, onRefresh, canEdit, canUpdateStatus }) {
  useBodyScrollLock();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [task.id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.get(`/tasks/org/${orgId}/${task.id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tasks/org/${orgId}/${task.id}/comments`, { content: newComment });
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Add comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const priority = PRIORITIES[task.priority] || PRIORITIES.Medium;
  const status = STATUSES.find(s => s.key === task.status) || STATUSES[0];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-modal-slide-up shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`p-6 border-b border-[var(--color-border)] bg-gradient-to-r ${status.gradient}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-${priority.color}-400 bg-${priority.color}-400/10 border-${priority.color}-400/20`}>
                  {task.priority}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.border} bg-[var(--color-bg-dark)]/50`}>
                  {task.status}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{task.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 hover:bg-white/10 text-white rounded-xl transition-all"
                >
                  <Icon icon="mdi:pencil" className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 text-white rounded-xl transition-all">
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Description</h3>
            <p className="text-white whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>

          {/* Assignees */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Assignees</h3>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((a, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      a.department_id
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <Icon icon={a.department_id ? 'mdi:account-group' : 'mdi:account'} className="w-4 h-4" />
                    {a.employee_name || a.department_name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--color-text-muted)]">No assignees</p>
            )}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Due Date</p>
              <p className="font-medium flex items-center gap-2">
                <Icon icon="mdi:calendar" className="w-4 h-4 text-rose-400" />
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
              </p>
            </div>
            <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Created by</p>
              <p className="font-medium">{task.creator_name || 'Unknown'}</p>
            </div>
          </div>

          {/* Quick Actions */}
          {canUpdateStatus && task.status !== 'Completed' && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                {task.status === 'To Do' && (
                  <button
                    onClick={() => { onStatusUpdate(task.id, 'In Progress'); onClose(); }}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                  >
                    Start Task
                  </button>
                )}
                {task.status === 'In Progress' && (
                  <button
                    onClick={() => { onStatusUpdate(task.id, 'Review'); onClose(); }}
                    className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all"
                  >
                    Submit for Review
                  </button>
                )}
                {task.status === 'Review' && (
                  <button
                    onClick={() => { onStatusUpdate(task.id, 'Completed'); onClose(); }}
                    className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
              <Icon icon="mdi:comment-text-multiple" className="w-4 h-4" />
              Comments ({comments.length})
            </h3>
            
            {/* Add Comment */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-rose-500/20 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" /> : <Icon icon="mdi:send" className="w-5 h-5" />}
              </button>
            </div>

            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-4">
                <Icon icon="mdi:loading" className="w-6 h-6 text-rose-500 animate-spin mx-auto" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-[var(--color-bg-elevated)] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {(comment.author_name || comment.employee_name || 'U').charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{comment.author_name || comment.employee_name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] pl-8">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[var(--color-text-muted)] py-4">No comments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
