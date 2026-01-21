import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function EducationManager() {
  const { currentOrg, isManager, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('education-tab') || 'classrooms';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data state
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [roster, setRoster] = useState([]);

  // Modals
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Classroom sub-tab (for detail view)
  const [classroomTab, setClassroomTab] = useState('announcements');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('education-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg, activeTab, selectedClassroom]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'classrooms' || activeTab === 'classroom') {
        const classRes = await api.get(`/education/org/${currentOrg.id}/classrooms`);
        setClassrooms(classRes.data);

        if (selectedClassroom) {
          const [assignRes, announceRes, rosterRes] = await Promise.all([
            api.get(`/education/org/${currentOrg.id}/classrooms/${selectedClassroom.id}/assignments`),
            api.get(`/education/org/${currentOrg.id}/classrooms/${selectedClassroom.id}/announcements`),
            api.get(`/education/org/${currentOrg.id}/classrooms/${selectedClassroom.id}/roster`)
          ]);
          setAssignments(assignRes.data);
          setAnnouncements(announceRes.data);
          setRoster(rosterRes.data);
        }
      }

      if (activeTab === 'students') {
        const studRes = await api.get(`/education/org/${currentOrg.id}/students`);
        setStudents(studRes.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (data) => {
    try {
      await api.post(`/education/org/${currentOrg.id}/classrooms`, data);
      setSuccess('Classroom created successfully!');
      setShowClassroomModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      throw err;
    }
  };

  const handleCreateStudent = async (data) => {
    try {
      await api.post(`/education/org/${currentOrg.id}/students`, data);
      setSuccess('Student created successfully!');
      setShowStudentModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      throw err;
    }
  };

  const handleCreateAssignment = async (data) => {
    try {
      await api.post(`/education/org/${currentOrg.id}/classrooms/${selectedClassroom.id}/assignments`, data);
      setSuccess('Assignment created successfully!');
      setShowAssignmentModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      throw err;
    }
  };

  const handleCreateAnnouncement = async (data) => {
    try {
      await api.post(`/education/org/${currentOrg.id}/classrooms/${selectedClassroom.id}/announcements`, data);
      setSuccess('Announcement posted successfully!');
      setShowAnnouncementModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      throw err;
    }
  };

  const handleEnrollStudent = async (studentId) => {
    try {
      await api.post(`/education/org/${currentOrg.id}/classrooms/${selectedClassroom.id}/enroll`, { studentId });
      setSuccess('Student enrolled successfully!');
      setShowEnrollModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to enroll student');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/education/org/${currentOrg.id}/students/${studentId}`);
      setSuccess('Student deleted successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete student');
    }
  };

  const handleDeleteClassroom = async (classroomId) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await api.delete(`/education/org/${currentOrg.id}/classrooms/${classroomId}`);
      setSuccess('Classroom deleted successfully!');
      setSelectedClassroom(null);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete classroom');
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Icon icon="mdi:school" className="w-8 h-8 text-indigo-400" />
          Education Manager
        </h2>
      </div>

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
          active={activeTab === 'classrooms'}
          onClick={() => { setActiveTab('classrooms'); setSelectedClassroom(null); }}
          icon="mdi:google-classroom"
          label="Classrooms"
        />
        <TabButton
          active={activeTab === 'students'}
          onClick={() => setActiveTab('students')}
          icon="mdi:account-school"
          label="Students"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Classrooms Tab */}
          {activeTab === 'classrooms' && !selectedClassroom && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold">All Classrooms</h3>
                {(isAdmin || isManager) && (
                  <button
                    onClick={() => setShowClassroomModal(true)}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Icon icon="mdi:plus" className="w-5 h-5" />
                    Create Classroom
                  </button>
                )}
              </div>

              {classrooms.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {classrooms.map((classroom) => (
                    <div
                      key={classroom.id}
                      className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-indigo-500/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedClassroom(classroom)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                          <Icon icon="mdi:google-classroom" className="w-6 h-6" />
                        </div>
                        {(isAdmin || isManager) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClassroom(classroom.id); }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                          >
                            <Icon icon="mdi:delete" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h4 className="font-semibold text-lg mb-1">{classroom.name}</h4>
                      <p className="text-sm text-[var(--color-text-muted)] mb-3">{classroom.description || 'No description'}</p>
                      <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Icon icon="mdi:account-group" className="w-4 h-4" />
                          {classroom.students?.length || 0} students
                        </span>
                        <span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                          <Icon icon="mdi:key" className="w-3 h-3" />
                          {classroom.joinCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                  <Icon icon="mdi:google-classroom" className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
                  <p className="text-[var(--color-text-muted)] mb-4">No classrooms yet</p>
                  {(isAdmin || isManager) && (
                    <button
                      onClick={() => setShowClassroomModal(true)}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      <Icon icon="mdi:plus" className="w-5 h-5" />
                      Create First Classroom
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Classroom Detail View */}
          {activeTab === 'classrooms' && selectedClassroom && (
            <div>
              {/* Classroom Header */}
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => { setSelectedClassroom(null); setClassroomTab('announcements'); }}
                  className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
                >
                  <Icon icon="mdi:arrow-left" className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedClassroom.name}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">{selectedClassroom.description}</p>
                </div>
                <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                  <Icon icon="mdi:key" className="w-4 h-4" />
                  Join Code: {selectedClassroom.joinCode}
                </span>
              </div>

              {/* Sub-tabs for classroom sections */}
              <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
                <button
                  onClick={() => setClassroomTab('announcements')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    classroomTab === 'announcements'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  <Icon icon="mdi:bullhorn" className="w-4 h-4" />
                  Announcements
                </button>
                <button
                  onClick={() => setClassroomTab('assignments')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    classroomTab === 'assignments'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  <Icon icon="mdi:clipboard-text" className="w-4 h-4" />
                  Assignments
                </button>
                <button
                  onClick={() => setClassroomTab('roster')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    classroomTab === 'roster'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  <Icon icon="mdi:account-group" className="w-4 h-4" />
                  Students ({roster.length})
                </button>
              </div>

              {/* Announcements Page */}
              {classroomTab === 'announcements' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Icon icon="mdi:bullhorn" className="w-5 h-5 text-indigo-400" />
                      Announcements
                    </h4>
                    {(isAdmin || isManager) && (
                      <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:plus" className="w-5 h-5" />
                        Post Announcement
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {announcements.length > 0 ? announcements.map((ann) => (
                      <div key={ann.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
                        {ann.title && <h5 className="font-semibold text-lg mb-2">{ann.title}</h5>}
                        <p className="text-[var(--color-text-muted)]">{ann.content}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-3">
                          {new Date(ann.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )) : (
                      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                        <Icon icon="mdi:bullhorn-outline" className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                        <p className="text-[var(--color-text-muted)]">No announcements yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assignments Page */}
              {classroomTab === 'assignments' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Icon icon="mdi:clipboard-text" className="w-5 h-5 text-indigo-400" />
                      Assignments
                    </h4>
                    {(isAdmin || isManager) && (
                      <button
                        onClick={() => setShowAssignmentModal(true)}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:plus" className="w-5 h-5" />
                        Create Assignment
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {assignments.length > 0 ? assignments.map((asg) => (
                      <div key={asg.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-lg">{asg.title}</h5>
                          <span className="text-sm bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg">
                            {asg.points} points
                          </span>
                        </div>
                        <p className="text-[var(--color-text-muted)] mb-3">{asg.description}</p>
                        {asg.dueDate && (
                          <p className="text-sm text-amber-400 flex items-center gap-1">
                            <Icon icon="mdi:calendar-clock" className="w-4 h-4" />
                            Due: {new Date(asg.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )) : (
                      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                        <Icon icon="mdi:clipboard-text-outline" className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                        <p className="text-[var(--color-text-muted)]">No assignments yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Students (Roster) Page */}
              {classroomTab === 'roster' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Icon icon="mdi:account-group" className="w-5 h-5 text-indigo-400" />
                      Enrolled Students ({roster.length})
                    </h4>
                    {(isAdmin || isManager) && (
                      <button
                        onClick={() => setShowEnrollModal(true)}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:account-plus" className="w-5 h-5" />
                        Enroll Student
                      </button>
                    )}
                  </div>
                  {roster.length > 0 ? (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                      <div className="divide-y divide-[var(--color-border)]">
                        {roster.map((student) => (
                          <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-[var(--color-bg-elevated)] transition-colors">
                            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-semibold text-lg">
                              {student.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-lg">{student.name}</p>
                              <p className="text-sm text-[var(--color-text-muted)]">{student.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                      <Icon icon="mdi:account-group-outline" className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                      <p className="text-[var(--color-text-muted)]">No students enrolled yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative">
                  <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students..."
                    className="pl-9 pr-4 py-2 text-sm bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg w-64"
                  />
                </div>
                {(isAdmin || isManager) && (
                  <button
                    onClick={() => setShowStudentModal(true)}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Icon icon="mdi:account-plus" className="w-5 h-5" />
                    Add Student
                  </button>
                )}
              </div>

              {filteredStudents.length > 0 ? (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <div className="divide-y divide-[var(--color-border)]">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-bg-elevated)] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-semibold">
                            {student.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-[var(--color-text-muted)]">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {student.enrolledClassrooms?.length || 0} classes
                          </span>
                          {(isAdmin || isManager) && (
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            >
                              <Icon icon="mdi:delete" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center">
                  <Icon icon="mdi:account-school" className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
                  <p className="text-[var(--color-text-muted)]">
                    {searchQuery ? 'No students found' : 'No students yet'}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showClassroomModal && (
        <ClassroomModal onClose={() => setShowClassroomModal(false)} onCreate={handleCreateClassroom} />
      )}
      {showStudentModal && (
        <StudentModal onClose={() => setShowStudentModal(false)} onCreate={handleCreateStudent} />
      )}
      {showAssignmentModal && (
        <AssignmentModal onClose={() => setShowAssignmentModal(false)} onCreate={handleCreateAssignment} />
      )}
      {showAnnouncementModal && (
        <AnnouncementModal onClose={() => setShowAnnouncementModal(false)} onCreate={handleCreateAnnouncement} />
      )}
      {showEnrollModal && (
        <EnrollModal
          students={students}
          enrolledIds={roster.map(s => s.id)}
          onClose={() => setShowEnrollModal(false)}
          onEnroll={handleEnrollStudent}
        />
      )}
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
          ? 'border-indigo-500 text-white'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-white'
      }`}
    >
      <Icon icon={icon} className="w-4 h-4" />
      {label}
    </button>
  );
}

// Modal Components
function ClassroomModal({ onClose, onCreate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', subject: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create classroom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Create Classroom</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Classroom Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Computer Science 101"
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Computer Science"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description..."
              className="w-full resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentModal({ onClose, onCreate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Add Student</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Student name"
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="student@example.com"
              required
              className="w-full"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentModal({ onClose, onCreate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', points: 100, dueDate: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Create Assignment</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Assignment title"
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Instructions..."
              className="w-full resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementModal({ onClose, onCreate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onCreate(formData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Post Announcement</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Title (Optional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              placeholder="What would you like to announce?"
              required
              className="w-full resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EnrollModal({ students, enrolledIds, onClose, onEnroll }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const availableStudents = students.filter(s => !enrolledIds.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Enroll Student</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {availableStudents.length > 0 ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-4 py-2"
              >
                <option value="">Choose a student...</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => selectedStudent && onEnroll(selectedStudent)}
                disabled={!selectedStudent}
                className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                Enroll
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-[var(--color-text-muted)] py-4">
            <p>All students are already enrolled or no students exist.</p>
            <button onClick={onClose} className="mt-4 py-2 px-4 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
