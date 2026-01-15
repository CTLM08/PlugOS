import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from '../../components/DatePicker';

export default function AttendanceTracker() {
  const { currentOrg, isManager, isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('attendance-tab') || 'clock';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Clock state
  const [clockedIn, setClockedIn] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  
  // Attendance history
  const [attendance, setAttendance] = useState([]);
  
  // Leave requests
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  
  // Manage leave types
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  
  // Team attendance
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamDepartment, setTeamDepartment] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [departments, setDepartments] = useState([]);
  
  // History filters
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  
  // Leave filters
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');

  useEffect(() => {
    if (currentOrg) {
      fetchDepartments();
    }
  }, [currentOrg]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('attendance-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg, activeTab, teamDate, teamDepartment, teamSearch, historyStartDate, historyEndDate, leaveStartDate, leaveEndDate]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get(`/departments/org/${currentOrg.id}`);
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Fetch departments error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always fetch clock status and leave types
      const [statusRes, typesRes] = await Promise.all([
        api.get(`/attendance/org/${currentOrg.id}/status`),
        api.get(`/attendance/org/${currentOrg.id}/leave-types`)
      ]);
      setClockedIn(statusRes.data.clockedIn);
      setCurrentRecord(statusRes.data.record);
      setLeaveTypes(typesRes.data);

      if (activeTab === 'history') {
        let url = `/attendance/org/${currentOrg.id}/my-attendance`;
        const params = new URLSearchParams();
        if (historyStartDate) params.append('startDate', historyStartDate);
        if (historyEndDate) params.append('endDate', historyEndDate);
        if (params.toString()) url += '?' + params.toString();
        
        const historyRes = await api.get(url);
        setAttendance(historyRes.data);
      } else if (activeTab === 'leave') {
        const leaveRes = await api.get(`/attendance/org/${currentOrg.id}/leave`);
        // Filter by date on frontend for leave requests
        let filtered = leaveRes.data;
        if (leaveStartDate) {
          filtered = filtered.filter(r => r.start_date >= leaveStartDate);
        }
        if (leaveEndDate) {
          filtered = filtered.filter(r => r.end_date <= leaveEndDate);
        }
        setLeaveRequests(filtered);
      } else if (activeTab === 'team' && (isManager || isAdmin)) {
        let url = `/attendance/org/${currentOrg.id}/team?date=${teamDate}`;
        if (teamDepartment) url += `&department=${encodeURIComponent(teamDepartment)}`;
        if (teamSearch) url += `&search=${encodeURIComponent(teamSearch)}`;
        
        const [teamRes, pendingRes] = await Promise.all([
          api.get(url),
          api.get(`/attendance/org/${currentOrg.id}/leave/pending`)
        ]);
        setTeamAttendance(teamRes.data);
        setPendingLeave(pendingRes.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setClockLoading(true);
    setError('');
    try {
      await api.post(`/attendance/org/${currentOrg.id}/clock-in`);
      setSuccess('Clocked in successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clock in');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    setError('');
    try {
      await api.post(`/attendance/org/${currentOrg.id}/clock-out`);
      setSuccess('Clocked out successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clock out');
    } finally {
      setClockLoading(false);
    }
  };

  const handleReviewLeave = async (leaveId, status) => {
    try {
      await api.put(`/attendance/org/${currentOrg.id}/leave/${leaveId}/review`, { status });
      setSuccess(`Leave request ${status}!`);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review leave');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '-';
    const ms = new Date(clockOut) - new Date(clockIn);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Attendance Tracker</h2>
      </div>

      {/* Main Content */}
      <div>
        {/* Alerts */}
        {error && (
          <div className="animate-item mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="hover:text-red-300">
              <Icon icon="mdi:close" className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="animate-item mb-6 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <Icon icon="mdi:check-circle" className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="animate-item flex gap-4 mb-6 border-b border-[var(--color-border)] overflow-x-auto">
          <TabButton 
            active={activeTab === 'clock'} 
            onClick={() => setActiveTab('clock')}
            icon="mdi:clock-outline"
            label="Clock In/Out"
          />
          <TabButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon="mdi:history"
            label="My Attendance"
          />
          <TabButton 
            active={activeTab === 'leave'} 
            onClick={() => setActiveTab('leave')}
            icon="mdi:calendar-clock"
            label="Leave Requests"
          />
          {(isManager || isAdmin) && (
            <TabButton 
              active={activeTab === 'team'} 
              onClick={() => setActiveTab('team')}
              icon="mdi:account-group"
              label="Team"
              badge={pendingLeave.length > 0 ? pendingLeave.length : null}
            />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Clock In/Out Tab */}
            {activeTab === 'clock' && (
              <div className="animate-item max-w-md mx-auto">
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
                  <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                    clockedIn 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
                  }`}>
                    <Icon icon={clockedIn ? "mdi:clock-check" : "mdi:clock-outline"} className="w-12 h-12" />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2">
                    {clockedIn ? "You're Clocked In" : "Not Clocked In"}
                  </h2>
                  
                  {clockedIn && currentRecord && (
                    <p className="text-[var(--color-text-muted)] mb-6">
                      Since {formatTime(currentRecord.clock_in)}
                    </p>
                  )}
                  
                  <button
                    onClick={clockedIn ? handleClockOut : handleClockIn}
                    disabled={clockLoading}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                      clockedIn
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {clockLoading ? (
                      <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
                    ) : (
                      <Icon icon={clockedIn ? "mdi:logout" : "mdi:login"} className="w-6 h-6" />
                    )}
                    {clockLoading ? 'Processing...' : (clockedIn ? 'Clock Out' : 'Clock In')}
                  </button>
                  
                  <p className="text-xs text-[var(--color-text-muted)] mt-4">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* My Attendance Tab */}
            {activeTab === 'history' && (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-semibold">Attendance History</h3>
                    <div className="flex items-center gap-2">
                      <DatePicker
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                        placeholder="From"
                      />
                      <span className="text-[var(--color-text-muted)]">-</span>
                      <DatePicker
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>
                {attendance.length > 0 ? (
                  <div className="divide-y divide-[var(--color-border)]">
                    {attendance.map((record) => (
                      <div key={record.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatDate(record.clock_in)}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {formatTime(record.clock_in)} - {formatTime(record.clock_out)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-indigo-400">
                            {formatDuration(record.clock_in, record.clock_out)}
                          </p>
                          {!record.clock_out && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-[var(--color-text-muted)]">
                    No attendance records yet
                  </div>
                )}
              </div>
            )}

            {/* Leave Requests Tab */}
            {activeTab === 'leave' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="font-semibold">My Leave Requests</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <DatePicker
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        placeholder="From"
                      />
                      <span className="text-[var(--color-text-muted)]">-</span>
                      <DatePicker
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        placeholder="To"
                      />
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowLeaveTypeModal(true)}
                        className="inline-flex items-center gap-2 border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:cog" className="w-5 h-5" />
                        Manage Types
                      </button>
                    )}
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      <Icon icon="mdi:plus" className="w-5 h-5" />
                      Request Leave
                    </button>
                  </div>
                </div>
                
                {leaveRequests.length > 0 ? (
                  <div className="grid gap-4">
                    {leaveRequests.map((request) => (
                      <div key={request.id} className="animate-item">
                        <LeaveCard request={request} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="animate-item bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                    <Icon icon="mdi:calendar-blank" className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                    <p className="text-[var(--color-text-muted)]">No leave requests yet</p>
                  </div>
                )}
              </>
            )}

            {/* Team Tab (Managers/Admins) */}
            {activeTab === 'team' && (isManager || isAdmin) && (
              <>
                {/* Pending Leave Approvals */}
                {pendingLeave.length > 0 && (
                  <div className="animate-item mb-8">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Icon icon="mdi:clock-alert" className="w-5 h-5 text-yellow-400" />
                      Pending Leave Requests ({pendingLeave.length})
                    </h3>
                    <div className="grid gap-4">
                      {pendingLeave.map((request) => (
                        <div 
                          key={request.id}
                          className="bg-[var(--color-bg-card)] border border-yellow-500/30 rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{request.user_name}</p>
                              <p className="text-sm text-[var(--color-text-muted)]">{request.user_email}</p>
                              <div className="mt-2 flex items-center gap-4 text-sm">
                                <span className="capitalize bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                  {request.leave_type}
                                </span>
                                <span>
                                  {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                </span>
                              </div>
                              {request.reason && (
                                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                                  "{request.reason}"
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewLeave(request.id, 'approved')}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Icon icon="mdi:check" className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReviewLeave(request.id, 'rejected')}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                title="Reject"
                              >
                                <Icon icon="mdi:close" className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Attendance */}
                <div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <h3 className="font-semibold">Team Attendance</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search by name */}
                      <div className="relative">
                        <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                        <input
                          type="text"
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          placeholder="Search name..."
                          className="pl-9 pr-4 py-2 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg w-44"
                        />
                      </div>
                      
                      {/* Department filter */}
                      <CustomSelect
                        value={teamDepartment}
                        onChange={(e) => setTeamDepartment(e.target.value)}
                        options={[
                          { value: '', label: 'All Departments' },
                          ...departments.map(d => ({ value: d.name, label: d.name }))
                        ]}
                        placeholder="All Departments"
                      />
                      
                      {/* Date picker */}
                      <DatePicker
                        value={teamDate}
                        onChange={(e) => setTeamDate(e.target.value)}
                        placeholder="Select date"
                      />
                    </div>
                  </div>
                  
                  {teamAttendance.length > 0 ? (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                      <div className="divide-y divide-[var(--color-border)]">
                        {teamAttendance.map((record) => (
                          <div key={record.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-semibold">
                                {record.user_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{record.user_name}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">{record.user_email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                {formatTime(record.clock_in)} - {formatTime(record.clock_out)}
                              </p>
                              <p className="text-xs font-mono text-indigo-400">
                                {formatDuration(record.clock_in, record.clock_out)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                      <Icon icon="mdi:account-clock" className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                      <p className="text-[var(--color-text-muted)]">No attendance records for this date</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <LeaveModal
          orgId={currentOrg.id}
          leaveTypes={leaveTypes}
          onClose={() => setShowLeaveModal(false)}
          onSuccess={() => {
            setShowLeaveModal(false);
            setSuccess('Leave request submitted!');
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* Leave Types Management Modal */}
      {showLeaveTypeModal && (
        <LeaveTypeModal
          orgId={currentOrg.id}
          leaveTypes={leaveTypes}
          onClose={() => setShowLeaveTypeModal(false)}
          onUpdate={() => fetchData()}
        />
      )}
    </>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
        active
          ? 'border-indigo-500 text-white'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
      }`}
    >
      <Icon icon={icon} className="w-4 h-4" />
      {label}
      {badge && (
        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px]">
          {badge}
        </span>
      )}
    </button>
  );
}

// Leave Card Component
function LeaveCard({ request }) {
  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div className={`bg-[var(--color-bg-card)] border rounded-xl p-4 ${statusColors[request.status]?.split(' ')[2] || 'border-[var(--color-border)]'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="capitalize bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-sm">
              {request.leave_type}
            </span>
            <span className={`capitalize px-2 py-0.5 rounded text-sm ${statusColors[request.status]}`}>
              {request.status}
            </span>
          </div>
          <p className="font-medium">
            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
          </p>
          {request.reason && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {request.reason}
            </p>
          )}
        </div>
        {request.reviewed_by_name && (
          <p className="text-xs text-[var(--color-text-muted)]">
            By {request.reviewed_by_name}
          </p>
        )}
      </div>
    </div>
  );
}

// Leave Modal Component
function LeaveModal({ orgId, leaveTypes, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    leave_type: leaveTypes[0]?.name || 'Annual Leave',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post(`/attendance/org/${orgId}/leave`, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const leaveTypeOptions = leaveTypes.map(t => ({
    value: t.name,
    label: t.name,
    icon: 'mdi:calendar'
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Request Leave</h3>
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
            <label className="block text-sm font-medium mb-2">Leave Type</label>
            <CustomSelect
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              options={leaveTypeOptions}
              placeholder="Select leave type"
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

          <div>
            <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              placeholder="Brief explanation..."
              className="w-full resize-none"
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
              className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Leave Type Management Modal (Admin only)
function LeaveTypeModal({ orgId, leaveTypes, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [newType, setNewType] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const handleAdd = async () => {
    if (!newType.trim()) return;
    setLoading(true);
    try {
      await api.post(`/attendance/org/${orgId}/leave-types`, { 
        name: newType.trim(),
        color: newColor 
      });
      setNewType('');
      onUpdate();
    } catch (err) {
      console.error('Add type error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (typeId) => {
    try {
      await api.delete(`/attendance/org/${orgId}/leave-types/${typeId}`);
      onUpdate();
    } catch (err) {
      console.error('Delete type error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Manage Leave Types</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Add new type */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="New leave type name..."
            className="flex-1"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newType.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" /> : <Icon icon="mdi:plus" className="w-5 h-5" />}
          </button>
        </div>

        {/* Existing types */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {leaveTypes.map((type) => (
            <div key={type.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-elevated)] rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: type.color || '#6366f1' }}
                />
                <span>{type.name}</span>
              </div>
              {type.id && typeof type.id === 'string' && type.id.length > 10 && (
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                >
                  <Icon icon="mdi:delete" className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
