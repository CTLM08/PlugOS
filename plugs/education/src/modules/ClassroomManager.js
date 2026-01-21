import { generateId, generateJoinCode } from '../utils/helpers.js';
import { validateClassroom } from '../utils/validators.js';

/**
 * ClassroomManager - Manages classroom operations
 */
class ClassroomManager {
  /**
   * @param {Object} storage - Storage adapter instance
   * @param {Object} events - EventEmitter instance
   * @param {Object} studentManager - StudentManager instance
   */
  constructor(storage, events, studentManager) {
    this.storage = storage;
    this.events = events;
    this.studentManager = studentManager;
    this.collection = 'classrooms';
  }

  /**
   * Create a new classroom
   * @param {Object} data - Classroom data
   * @param {string} data.name - Classroom name
   * @param {string} [data.description] - Classroom description
   * @param {string} [data.teacherId] - Teacher ID
   * @param {string} [data.subject] - Subject name
   * @returns {Promise<Object>} Created classroom
   */
  async create(data) {
    validateClassroom(data);
    
    const classroom = {
      id: generateId('cls'),
      name: data.name.trim(),
      description: data.description || '',
      teacherId: data.teacherId || null,
      subject: data.subject || '',
      joinCode: generateJoinCode(),
      students: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = await this.storage.set(this.collection, classroom.id, classroom);
    this.events.emit('classroom:created', saved);
    return saved;
  }

  /**
   * Get a classroom by ID
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Object|null>} Classroom or null if not found
   */
  async get(classroomId) {
    return this.storage.get(this.collection, classroomId);
  }

  /**
   * Get a classroom by join code
   * @param {string} code - Join code
   * @returns {Promise<Object|null>} Classroom or null if not found
   */
  async getByJoinCode(code) {
    const results = await this.storage.query(this.collection,
      c => c.joinCode === code.toUpperCase()
    );
    return results[0] || null;
  }

  /**
   * Update a classroom
   * @param {string} classroomId - Classroom ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated classroom
   */
  async update(classroomId, updates) {
    validateClassroom(updates, true);
    
    const classroom = await this.get(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    const updated = {
      ...classroom,
      ...updates,
      name: updates.name ? updates.name.trim() : classroom.name,
      updatedAt: new Date().toISOString()
    };
    
    // Preserve immutable fields
    updated.id = classroom.id;
    updated.students = classroom.students;
    updated.createdAt = classroom.createdAt;
    
    const saved = await this.storage.set(this.collection, classroomId, updated);
    this.events.emit('classroom:updated', saved);
    return saved;
  }

  /**
   * Delete a classroom
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(classroomId) {
    const classroom = await this.get(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    // Remove enrollment from all students
    for (const studentId of classroom.students) {
      await this.studentManager._removeEnrollment(studentId, classroomId);
    }
    
    const result = await this.storage.delete(this.collection, classroomId);
    if (result) {
      this.events.emit('classroom:deleted', { id: classroomId });
    }
    return result;
  }

  /**
   * List all classrooms
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Array>} Array of classrooms
   */
  async list(filters = {}) {
    return this.storage.list(this.collection, filters);
  }

  /**
   * Enroll a student in a classroom
   * @param {string} classroomId - Classroom ID
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Updated classroom
   */
  async enrollStudent(classroomId, studentId) {
    const classroom = await this.get(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    const student = await this.studentManager.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    
    if (classroom.students.includes(studentId)) {
      throw new Error('Student is already enrolled in this classroom');
    }
    
    classroom.students.push(studentId);
    classroom.updatedAt = new Date().toISOString();
    
    await this.storage.set(this.collection, classroomId, classroom);
    await this.studentManager._addEnrollment(studentId, classroomId);
    
    this.events.emit('student:enrolled', { studentId, classroomId });
    return classroom;
  }

  /**
   * Remove a student from a classroom
   * @param {string} classroomId - Classroom ID
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Updated classroom
   */
  async removeStudent(classroomId, studentId) {
    const classroom = await this.get(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    if (!classroom.students.includes(studentId)) {
      throw new Error('Student is not enrolled in this classroom');
    }
    
    classroom.students = classroom.students.filter(id => id !== studentId);
    classroom.updatedAt = new Date().toISOString();
    
    await this.storage.set(this.collection, classroomId, classroom);
    await this.studentManager._removeEnrollment(studentId, classroomId);
    
    this.events.emit('student:unenrolled', { studentId, classroomId });
    return classroom;
  }

  /**
   * Get all students in a classroom
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<Array>} Array of students
   */
  async getRoster(classroomId) {
    const classroom = await this.get(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    const students = [];
    for (const studentId of classroom.students) {
      const student = await this.studentManager.get(studentId);
      if (student) {
        students.push(student);
      }
    }
    return students;
  }

  /**
   * Regenerate join code for a classroom
   * @param {string} classroomId - Classroom ID
   * @returns {Promise<string>} New join code
   */
  async regenerateJoinCode(classroomId) {
    const classroom = await this.get(classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    classroom.joinCode = generateJoinCode();
    classroom.updatedAt = new Date().toISOString();
    
    await this.storage.set(this.collection, classroomId, classroom);
    return classroom.joinCode;
  }

  /**
   * Join a classroom using a join code
   * @param {string} code - Join code
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Classroom
   */
  async joinWithCode(code, studentId) {
    const classroom = await this.getByJoinCode(code);
    if (!classroom) {
      throw new Error('Invalid join code');
    }
    
    return this.enrollStudent(classroom.id, studentId);
  }

  /**
   * Get classrooms by teacher ID
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<Array>} Array of classrooms
   */
  async getByTeacher(teacherId) {
    return this.storage.query(this.collection, c => c.teacherId === teacherId);
  }
}

export default ClassroomManager;
