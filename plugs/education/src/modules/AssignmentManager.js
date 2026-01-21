import { generateId, formatDate } from '../utils/helpers.js';
import { validateAssignment, validateGrade } from '../utils/validators.js';

/**
 * AssignmentManager - Manages assignment operations
 */
class AssignmentManager {
  /**
   * @param {Object} storage - Storage adapter instance
   * @param {Object} events - EventEmitter instance
   * @param {Object} classroomManager - ClassroomManager instance
   */
  constructor(storage, events, classroomManager) {
    this.storage = storage;
    this.events = events;
    this.classroomManager = classroomManager;
    this.collection = 'assignments';
    this.submissionsCollection = 'submissions';
  }

  /**
   * Create a new assignment
   * @param {Object} data - Assignment data
   * @param {string} data.classroomId - Classroom ID
   * @param {string} data.title - Assignment title
   * @param {string} [data.description] - Assignment description
   * @param {Date|string} [data.dueDate] - Due date
   * @param {number} [data.points] - Maximum points
   * @param {string} [data.type] - Assignment type (assignment, quiz, material)
   * @returns {Promise<Object>} Created assignment
   */
  async create(data) {
    validateAssignment(data);
    
    // Verify classroom exists
    const classroom = await this.classroomManager.get(data.classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    const assignment = {
      id: generateId('asg'),
      classroomId: data.classroomId,
      title: data.title.trim(),
      description: data.description || '',
      dueDate: formatDate(data.dueDate),
      points: data.points || 100,
      type: data.type || 'assignment',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = await this.storage.set(this.collection, assignment.id, assignment);
    this.events.emit('assignment:created', saved);
    return saved;
  }

  /**
   * Get an assignment by ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object|null>} Assignment or null if not found
   */
  async get(assignmentId) {
    return this.storage.get(this.collection, assignmentId);
  }

  /**
   * Update an assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated assignment
   */
  async update(assignmentId, updates) {
    validateAssignment(updates, true);
    
    const assignment = await this.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    
    const updated = {
      ...assignment,
      ...updates,
      title: updates.title ? updates.title.trim() : assignment.title,
      dueDate: updates.dueDate !== undefined ? formatDate(updates.dueDate) : assignment.dueDate,
      updatedAt: new Date().toISOString()
    };
    
    // Preserve immutable fields
    updated.id = assignment.id;
    updated.classroomId = assignment.classroomId;
    updated.createdAt = assignment.createdAt;
    
    const saved = await this.storage.set(this.collection, assignmentId, updated);
    this.events.emit('assignment:updated', saved);
    return saved;
  }

  /**
   * Delete an assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(assignmentId) {
    const assignment = await this.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    
    // Delete all submissions for this assignment
    const submissions = await this.getSubmissions(assignmentId);
    for (const sub of submissions) {
      await this.storage.delete(this.submissionsCollection, sub.id);
    }
    
    const result = await this.storage.delete(this.collection, assignmentId);
    if (result) {
      this.events.emit('assignment:deleted', { id: assignmentId });
    }
    return result;
  }

  /**
   * Get all assignments for a classroom
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Array>} Array of assignments
   */
  async getByClassroom(classroomId) {
    return this.storage.query(this.collection, a => a.classroomId === classroomId);
  }

  /**
   * Submit an assignment
   * @param {string} assignmentId - Assignment ID
   * @param {string} studentId - Student ID
   * @param {Object} data - Submission data
   * @param {string} [data.content] - Submission content/text
   * @param {Array} [data.attachments] - Attachment URLs or references
   * @returns {Promise<Object>} Created submission
   */
  async submit(assignmentId, studentId, data = {}) {
    const assignment = await this.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    
    // Check if already submitted
    const existingSubmission = await this._getSubmission(assignmentId, studentId);
    
    const submission = {
      id: existingSubmission?.id || generateId('sub'),
      assignmentId,
      studentId,
      content: data.content || '',
      attachments: data.attachments || [],
      status: 'submitted',
      grade: existingSubmission?.grade || null,
      feedback: existingSubmission?.feedback || null,
      submittedAt: new Date().toISOString(),
      gradedAt: existingSubmission?.gradedAt || null,
      createdAt: existingSubmission?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Check if late
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      submission.status = 'late';
    }
    
    const saved = await this.storage.set(this.submissionsCollection, submission.id, submission);
    this.events.emit('assignment:submitted', { assignmentId, studentId, submission: saved });
    return saved;
  }

  /**
   * Grade a submission
   * @param {string} assignmentId - Assignment ID
   * @param {string} studentId - Student ID
   * @param {number} grade - Grade value
   * @param {string} [feedback] - Optional feedback
   * @returns {Promise<Object>} Updated submission
   */
  async grade(assignmentId, studentId, grade, feedback = '') {
    validateGrade({ grade });
    
    const assignment = await this.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    
    if (grade > assignment.points) {
      throw new Error(`Grade cannot exceed maximum points (${assignment.points})`);
    }
    
    const submission = await this._getSubmission(assignmentId, studentId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'graded';
    submission.gradedAt = new Date().toISOString();
    submission.updatedAt = new Date().toISOString();
    
    const saved = await this.storage.set(this.submissionsCollection, submission.id, submission);
    this.events.emit('assignment:graded', { assignmentId, studentId, grade, submission: saved });
    return saved;
  }

  /**
   * Get all submissions for an assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Array>} Array of submissions
   */
  async getSubmissions(assignmentId) {
    return this.storage.query(this.submissionsCollection, s => s.assignmentId === assignmentId);
  }

  /**
   * Get a student's submission for an assignment
   * @param {string} assignmentId - Assignment ID
   * @param {string} studentId - Student ID
   * @returns {Promise<Object|null>} Submission or null
   */
  async getStudentSubmission(assignmentId, studentId) {
    return this._getSubmission(assignmentId, studentId);
  }

  /**
   * Get all submissions by a student
   * @param {string} studentId - Student ID
   * @returns {Promise<Array>} Array of submissions
   */
  async getStudentSubmissions(studentId) {
    return this.storage.query(this.submissionsCollection, s => s.studentId === studentId);
  }

  /**
   * Get a student's grades for a classroom
   * @param {string} studentId - Student ID
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Object>} Grade summary
   */
  async getStudentGrades(studentId, classroomId) {
    const assignments = await this.getByClassroom(classroomId);
    const grades = [];
    let totalPoints = 0;
    let earnedPoints = 0;
    
    for (const assignment of assignments) {
      const submission = await this._getSubmission(assignment.id, studentId);
      grades.push({
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        maxPoints: assignment.points,
        grade: submission?.grade || null,
        status: submission?.status || 'not_submitted',
        feedback: submission?.feedback || null
      });
      
      if (submission?.grade !== null && submission?.grade !== undefined) {
        totalPoints += assignment.points;
        earnedPoints += submission.grade;
      }
    }
    
    return {
      studentId,
      classroomId,
      grades,
      summary: {
        totalAssignments: assignments.length,
        gradedAssignments: grades.filter(g => g.grade !== null).length,
        totalPoints,
        earnedPoints,
        percentage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null
      }
    };
  }

  /**
   * Internal: Get a specific submission
   */
  async _getSubmission(assignmentId, studentId) {
    const results = await this.storage.query(this.submissionsCollection,
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    return results[0] || null;
  }
}

export default AssignmentManager;
