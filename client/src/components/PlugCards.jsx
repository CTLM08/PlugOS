import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useDragContext } from './DraggableGrid';

// Mini bar chart for department distribution
function MiniBarChart({ data, maxBars = 4 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-sm text-[var(--color-text-muted)]">
        No department data
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const displayData = data.slice(0, maxBars);

  return (
    <div className="flex items-end gap-2 h-16">
      {displayData.map((dept, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all duration-500"
            style={{
              height: `${(dept.count / maxCount) * 100}%`,
              minHeight: '8px',
              animationDelay: `${index * 100}ms`
            }}
          />
          <span className="text-[10px] text-[var(--color-text-muted)] truncate w-full text-center">
            {dept.name?.split(' ')[0] || 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
}

// Circular progress ring for attendance
function ProgressRing({ percentage, size = 64, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-elevated)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#greenGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
}

// Status badge for payroll
function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-500/20 text-gray-400',
    processing: 'bg-amber-500/20 text-amber-400',
    finalized: 'bg-green-500/20 text-green-400'
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status || 'No period'}
    </span>
  );
}

// Employee Directory Card - Cyan/Blue theme
export function EmployeeDirectoryCard({ plug, summary, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();
  const data = summary?.['employee-directory'] || {};

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card plug-card-employees group h-full cursor-pointer"
    >
      {/* Background glow effect */}
      <div className="plug-card-glow plug-card-glow-cyan" />
      
      {/* Header - Drag Handle */}
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/30 transition-colors">
            <Icon icon="mdi:account-group" className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Directory</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalEmployees || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Employees</div>
        </div>
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalDepartments || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Departments</div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="relative z-10 bg-[var(--color-bg-dark)]/30 rounded-lg p-3 border border-white/5">
        <div className="text-xs text-[var(--color-text-muted)] mb-2">Distribution</div>
        <MiniBarChart data={data.departmentDistribution} />
      </div>
    </div>
  );
}

// Attendance Tracker Card - Green/Emerald theme
export function AttendanceTrackerCard({ plug, summary, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();
  const data = summary?.['attendance-tracker'] || {};

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card plug-card-attendance group h-full cursor-pointer"
    >
      {/* Background glow effect */}
      <div className="plug-card-glow plug-card-glow-green" />
      
      {/* Header - Drag Handle */}
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/30 transition-colors">
            <Icon icon="mdi:clock-check-outline" className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Tracker</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Content */}
      <div className="flex items-center gap-6 relative z-10">
        {/* Progress Ring */}
        <ProgressRing percentage={data.attendanceRate || 0} />
        
        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between bg-[var(--color-bg-dark)]/50 rounded-lg p-2.5 border border-white/5">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:account-check" className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-[var(--color-text-muted)]">Present</span>
            </div>
            <span className="font-semibold text-white">{data.todayPresent || 0}</span>
          </div>
          
          <div className="flex items-center justify-between bg-[var(--color-bg-dark)]/50 rounded-lg p-2.5 border border-white/5">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:account-group-outline" className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-[var(--color-text-muted)]">Total</span>
            </div>
            <span className="font-semibold text-white">{data.totalMembers || 0}</span>
          </div>
          
          {data.pendingLeaves > 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <Icon icon="mdi:clock-alert-outline" className="w-4 h-4" />
              <span>{data.pendingLeaves} pending leave{data.pendingLeaves > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Payroll Manager Card - Purple/Violet theme
export function PayrollManagerCard({ plug, summary, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();
  const data = summary?.['payroll-manager'] || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card plug-card-payroll group h-full cursor-pointer"
    >
      {/* Background glow effect */}
      <div className="plug-card-glow plug-card-glow-purple" />
      
      {/* Header - Drag Handle */}
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/30 group-hover:border-violet-500/50 group-hover:bg-violet-500/30 transition-colors">
            <Icon icon="mdi:cash-multiple" className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Manager</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Current Period */}
      <div className="relative z-10 bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--color-text-muted)]">Current Period</span>
          <StatusBadge status={data.periodStatus} />
        </div>
        <div className="text-lg font-semibold text-white truncate">
          {data.currentPeriod || 'No period created'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-xl font-bold text-white truncate">{formatCurrency(data.totalPayroll)}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Total Payroll</div>
        </div>
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{data.employeesProcessed || 0}</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ {data.salariesConfigured || 0}</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">Processed</div>
        </div>
      </div>
    </div>
  );
}

// Document Manager Card - Amber/Orange theme
export function DocumentManagerCard({ plug, summary, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();
  const data = summary?.['document-manager'] || {};

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card plug-card-documents group h-full cursor-pointer"
    >
      {/* Background glow effect */}
      <div className="plug-card-glow plug-card-glow-amber" />
      
      {/* Header - Drag Handle */}
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 group-hover:border-amber-500/50 group-hover:bg-amber-500/30 transition-colors">
            <Icon icon="mdi:file-document-multiple" className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Documents</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalDocuments || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Documents</div>
        </div>
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalFolders || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Folders</div>
        </div>
      </div>

      {/* Storage Info */}
      <div className="relative z-10 bg-[var(--color-bg-dark)]/30 rounded-lg p-3 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:database" className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-[var(--color-text-muted)]">Storage Used</span>
          </div>
          <span className="text-sm font-medium text-white">{formatFileSize(data.totalSize)}</span>
        </div>
      </div>
    </div>
  );
}

// Education Manager Card - Indigo/Purple theme
export function EducationManagerCard({ plug, summary, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();
  const data = summary?.['education-manager'] || {};

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card plug-card-education group h-full cursor-pointer"
    >
      {/* Background glow effect */}
      <div className="plug-card-glow plug-card-glow-indigo" />
      
      {/* Header - Drag Handle */}
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors">
            <Icon icon="mdi:school" className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Education</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalClassrooms || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Classrooms</div>
        </div>
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalStudents || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Students</div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="relative z-10 bg-[var(--color-bg-dark)]/30 rounded-lg p-3 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:clipboard-text" className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-[var(--color-text-muted)]">Assignments</span>
          </div>
          <span className="text-sm font-medium text-white">{data.totalAssignments || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Generic Fallback Card for unknown plugs - Indigo theme
export function GenericPlugCard({ plug, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card group h-full cursor-pointer"
    >
      <div className="plug-card-glow plug-card-glow-indigo" />
      
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors">
            <Icon icon={plug.icon || 'mdi:puzzle'} className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Plug</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      <p className="text-sm text-[var(--color-text-muted)] relative z-10">{plug.description}</p>
    </div>
  );
}

// Task Manager Card - Rose/Pink theme
export function TaskManagerCard({ plug, summary, route }) {
  const navigate = useNavigate();
  const { isDragging } = useDragContext();
  const data = summary?.['task-manager'] || {};
  const breakdown = data.statusBreakdown || {};

  const handleClick = (e) => {
    if (isDragging) return;
    navigate(route);
  };

  return (
    <div
      onClick={handleClick}
      className="plug-card plug-card-tasks group h-full cursor-pointer"
    >
      {/* Background glow effect */}
      <div className="plug-card-glow plug-card-glow-rose" />
      
      {/* Header - Drag Handle */}
      <div className="drag-handle flex items-start justify-between mb-4 relative z-10 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30 group-hover:border-rose-500/50 group-hover:bg-rose-500/30 transition-colors">
            <Icon icon="mdi:clipboard-check-outline" className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{plug.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Tasks</p>
          </div>
        </div>
        <Icon icon="mdi:arrow-top-right" className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{data.totalTasks || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Total Tasks</div>
        </div>
        <div className="bg-[var(--color-bg-dark)]/50 rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-red-400">{data.overdueTasks || 0}</div>
          <div className="text-xs text-[var(--color-text-muted)]">Overdue</div>
        </div>
      </div>

      {/* Status Breakdown Mini Bar */}
      <div className="relative z-10 bg-[var(--color-bg-dark)]/30 rounded-lg p-3 border border-white/5">
        <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-1.5 font-medium">
          <span>STATUS PROGRESS</span>
          <span className="text-white">{breakdown.completed || 0}/{data.totalTasks || 0}</span>
        </div>
        <div className="flex h-1.5 w-full bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500" 
            style={{ width: `${(breakdown.completed / data.totalTasks) * 100 || 0}%` }}
          />
          <div 
            className="h-full bg-purple-500 transition-all duration-500" 
            style={{ width: `${(breakdown.review / data.totalTasks) * 100 || 0}%` }}
          />
          <div 
            className="h-full bg-blue-500 transition-all duration-500" 
            style={{ width: `${(breakdown.inProgress / data.totalTasks) * 100 || 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase">Done</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export - renders the appropriate card based on plug type
export default function PlugCard({ plug, summary, route }) {
  switch (plug.slug) {
    case 'employee-directory':
      return <EmployeeDirectoryCard plug={plug} summary={summary} route={route} />;
    case 'attendance-tracker':
      return <AttendanceTrackerCard plug={plug} summary={summary} route={route} />;
    case 'payroll-manager':
      return <PayrollManagerCard plug={plug} summary={summary} route={route} />;
    case 'document-manager':
      return <DocumentManagerCard plug={plug} summary={summary} route={route} />;
    case 'education-manager':
      return <EducationManagerCard plug={plug} summary={summary} route={route} />;
    case 'task-manager':
      return <TaskManagerCard plug={plug} summary={summary} route={route} />;
    default:
      return <GenericPlugCard plug={plug} route={route} />;
  }
}

