/**
 * Education Manager React Component
 * 
 * This is the main frontend component for the Education plug.
 * Copy this to your React app's plugs directory.
 * 
 * Dependencies:
 * - @iconify/react
 * - react-router-dom (for Link)
 * - Your app's AuthContext and api utility
 * 
 * Usage:
 * 1. Copy this file to: client/src/plugs/EducationManager/index.jsx
 * 2. Import in App.jsx: import EducationManager from './plugs/EducationManager';
 * 3. Add route: <Route path="/education" element={<EducationManager />} />
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

// Note: Update these imports to match your app structure
// import { useAuth } from '../../context/AuthContext';
// import api from '../../utils/api';

/**
 * Education Manager Component
 * @param {Object} props
 * @param {Object} props.auth - Auth context with { currentOrg, isManager, isAdmin }
 * @param {Object} props.api - API client with get, post, put, delete methods
 */
export default function EducationManager({ auth, api }) {
  // If using context, uncomment this and remove props
  // const { currentOrg, isManager, isAdmin } = useAuth();
  const { currentOrg, isManager, isAdmin } = auth || {};
  
  const [activeTab, setActiveTab] = useState('classrooms');
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

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg, activeTab, selectedClassroom]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'classrooms') {
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
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // ... Additional methods would be same as the full component
  // See the complete implementation in your PlugOS installation

  return (
    <div className="education-manager">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Icon icon="mdi:school" className="w-8 h-8 text-indigo-400" />
          Education Manager
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => { setActiveTab('classrooms'); setSelectedClassroom(null); }}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'classrooms' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400'
          }`}
        >
          <Icon icon="mdi:google-classroom" className="w-4 h-4 inline mr-2" />
          Classrooms
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            activeTab === 'students' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400'
          }`}
        >
          <Icon icon="mdi:account-school" className="w-4 h-4 inline mr-2" />
          Students
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div>
          {/* Content renders here based on activeTab */}
          <p className="text-gray-400">
            {activeTab === 'classrooms' 
              ? `${classrooms.length} classroom(s)` 
              : `${students.length} student(s)`}
          </p>
        </div>
      )}
    </div>
  );
}

// Export component info for plug registration
export const componentInfo = {
  name: 'EducationManager',
  route: '/education',
  slug: 'education-manager'
};
