import express from 'express';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';
import { EduSDK, MemoryAdapter } from 'plugos-plugs-education';

const router = express.Router();

// Create a shared storage adapter per organization
const orgAdapters = new Map();

function getOrgSDK(orgId) {
  if (!orgAdapters.has(orgId)) {
    orgAdapters.set(orgId, new EduSDK());
  }
  return orgAdapters.get(orgId);
}

// Middleware to check if Education plug is enabled
const checkPlugEnabled = async (req, res, next) => {
  try {
    // For now, just pass through - can add plug check later
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
};

// ==================== STUDENTS ====================

// Get all students
router.get('/org/:orgId/students', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const students = await edu.students.list();
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

// Create student
router.post('/org/:orgId/students', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const student = await edu.students.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get single student
router.get('/org/:orgId/students/:studentId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const student = await edu.students.get(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to get student' });
  }
});

// Update student
router.put('/org/:orgId/students/:studentId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const student = await edu.students.update(req.params.studentId, req.body);
    res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete student
router.delete('/org/:orgId/students/:studentId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    await edu.students.delete(req.params.studentId);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Search students
router.get('/org/:orgId/students/search/:query', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const students = await edu.students.search(req.params.query);
    res.json(students);
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({ error: 'Failed to search students' });
  }
});

// ==================== CLASSROOMS ====================

// Get all classrooms
router.get('/org/:orgId/classrooms', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const classrooms = await edu.classrooms.list();
    res.json(classrooms);
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ error: 'Failed to get classrooms' });
  }
});

// Create classroom
router.post('/org/:orgId/classrooms', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const classroom = await edu.classrooms.create({
      ...req.body,
      teacherId: req.user.id
    });
    res.status(201).json(classroom);
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get single classroom
router.get('/org/:orgId/classrooms/:classroomId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const classroom = await edu.classrooms.get(req.params.classroomId);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    res.json(classroom);
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({ error: 'Failed to get classroom' });
  }
});

// Update classroom
router.put('/org/:orgId/classrooms/:classroomId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const classroom = await edu.classrooms.update(req.params.classroomId, req.body);
    res.json(classroom);
  } catch (error) {
    console.error('Update classroom error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete classroom
router.delete('/org/:orgId/classrooms/:classroomId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    await edu.classrooms.delete(req.params.classroomId);
    res.json({ message: 'Classroom deleted' });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Enroll student in classroom
router.post('/org/:orgId/classrooms/:classroomId/enroll', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const { studentId } = req.body;
    const classroom = await edu.classrooms.enrollStudent(req.params.classroomId, studentId);
    res.json(classroom);
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove student from classroom
router.post('/org/:orgId/classrooms/:classroomId/unenroll', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const { studentId } = req.body;
    const classroom = await edu.classrooms.removeStudent(req.params.classroomId, studentId);
    res.json(classroom);
  } catch (error) {
    console.error('Unenroll student error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get classroom roster
router.get('/org/:orgId/classrooms/:classroomId/roster', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const roster = await edu.classrooms.getRoster(req.params.classroomId);
    res.json(roster);
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Join classroom with code
router.post('/org/:orgId/classrooms/join', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const { code, studentId } = req.body;
    const classroom = await edu.classrooms.joinWithCode(code, studentId);
    res.json(classroom);
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== ASSIGNMENTS ====================

// Get assignments for classroom
router.get('/org/:orgId/classrooms/:classroomId/assignments', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const assignments = await edu.assignments.getByClassroom(req.params.classroomId);
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
});

// Create assignment
router.post('/org/:orgId/classrooms/:classroomId/assignments', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const assignment = await edu.assignments.create({
      ...req.body,
      classroomId: req.params.classroomId
    });
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get single assignment
router.get('/org/:orgId/assignments/:assignmentId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const assignment = await edu.assignments.get(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Failed to get assignment' });
  }
});

// Update assignment
router.put('/org/:orgId/assignments/:assignmentId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const assignment = await edu.assignments.update(req.params.assignmentId, req.body);
    res.json(assignment);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete assignment
router.delete('/org/:orgId/assignments/:assignmentId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    await edu.assignments.delete(req.params.assignmentId);
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Submit assignment
router.post('/org/:orgId/assignments/:assignmentId/submit', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const { studentId, content, attachments } = req.body;
    const submission = await edu.assignments.submit(req.params.assignmentId, studentId, { content, attachments });
    res.status(201).json(submission);
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Grade submission
router.post('/org/:orgId/assignments/:assignmentId/grade', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const { studentId, grade, feedback } = req.body;
    const submission = await edu.assignments.grade(req.params.assignmentId, studentId, grade, feedback);
    res.json(submission);
  } catch (error) {
    console.error('Grade assignment error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get submissions for assignment
router.get('/org/:orgId/assignments/:assignmentId/submissions', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const submissions = await edu.assignments.getSubmissions(req.params.assignmentId);
    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get student grades
router.get('/org/:orgId/students/:studentId/grades/:classroomId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const grades = await edu.assignments.getStudentGrades(req.params.studentId, req.params.classroomId);
    res.json(grades);
  } catch (error) {
    console.error('Get student grades error:', error);
    res.status(500).json({ error: 'Failed to get student grades' });
  }
});

// ==================== ANNOUNCEMENTS ====================

// Get announcements for classroom
router.get('/org/:orgId/classrooms/:classroomId/announcements', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const announcements = await edu.announcements.getByClassroom(req.params.classroomId);
    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to get announcements' });
  }
});

// Create announcement
router.post('/org/:orgId/classrooms/:classroomId/announcements', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const announcement = await edu.announcements.create({
      ...req.body,
      classroomId: req.params.classroomId,
      authorId: req.user.id
    });
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add comment to announcement
router.post('/org/:orgId/announcements/:announcementId/comments', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const edu = getOrgSDK(req.orgId);
    const announcement = await edu.announcements.addComment(req.params.announcementId, {
      authorId: req.user.id,
      content: req.body.content
    });
    res.json(announcement);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
