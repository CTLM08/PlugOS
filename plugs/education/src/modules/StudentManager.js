import { generateId } from '../utils/helpers.js';
import { validateStudent } from '../utils/validators.js';

/**
 * StudentManager - Manages student operations
 */
class StudentManager {
  /**
   * @param {Object} storage - Storage adapter instance
   * @param {Object} events - EventEmitter instance
   */
  constructor(storage, events) {
    this.storage = storage;
    this.events = events;
    this.collection = 'students';
  }

  /**
   * Create a new student
   * @param {Object} data - Student data
   * @param {string} data.name - Student name
   * @param {string} data.email - Student email
   * @param {Object} [data.profile] - Additional profile data
   * @returns {Promise<Object>} Created student
   */
  async create(data) {
    validateStudent(data);
    
    // Check for duplicate email
    const existing = await this.storage.query(this.collection, 
      s => s.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing.length > 0) {
      throw new Error('A student with this email already exists');
    }
    
    const student = {
      id: generateId('stu'),
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      profile: data.profile || {},
      enrolledClassrooms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = await this.storage.set(this.collection, student.id, student);
    this.events.emit('student:created', saved);
    return saved;
  }

  /**
   * Get a student by ID
   * @param {string} studentId - Student ID
   * @returns {Promise<Object|null>} Student or null if not found
   */
  async get(studentId) {
    return this.storage.get(this.collection, studentId);
  }

  /**
   * Get a student by email
   * @param {string} email - Student email
   * @returns {Promise<Object|null>} Student or null if not found
   */
  async getByEmail(email) {
    const results = await this.storage.query(this.collection,
      s => s.email.toLowerCase() === email.toLowerCase()
    );
    return results[0] || null;
  }

  /**
   * Update a student
   * @param {string} studentId - Student ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated student
   */
  async update(studentId, updates) {
    validateStudent(updates, true);
    
    const student = await this.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    
    // Check email uniqueness if updating email
    if (updates.email && updates.email.toLowerCase() !== student.email.toLowerCase()) {
      const existing = await this.getByEmail(updates.email);
      if (existing) {
        throw new Error('A student with this email already exists');
      }
    }
    
    const updated = {
      ...student,
      ...updates,
      email: updates.email ? updates.email.toLowerCase().trim() : student.email,
      name: updates.name ? updates.name.trim() : student.name,
      updatedAt: new Date().toISOString()
    };
    
    const saved = await this.storage.set(this.collection, studentId, updated);
    this.events.emit('student:updated', saved);
    return saved;
  }

  /**
   * Delete a student
   * @param {string} studentId - Student ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(studentId) {
    const student = await this.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    
    const result = await this.storage.delete(this.collection, studentId);
    if (result) {
      this.events.emit('student:deleted', { id: studentId });
    }
    return result;
  }

  /**
   * List all students
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Array>} Array of students
   */
  async list(filters = {}) {
    return this.storage.list(this.collection, filters);
  }

  /**
   * Search students by name or email
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching students
   */
  async search(query) {
    const lowerQuery = query.toLowerCase();
    return this.storage.query(this.collection, s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.email.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get classrooms a student is enrolled in
   * @param {string} studentId - Student ID
   * @returns {Promise<Array>} Array of classroom IDs
   */
  async getEnrolledClassrooms(studentId) {
    const student = await this.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    return student.enrolledClassrooms || [];
  }

  /**
   * Add classroom enrollment (internal use)
   * @param {string} studentId - Student ID
   * @param {string} classroomId - Classroom ID
   */
  async _addEnrollment(studentId, classroomId) {
    const student = await this.get(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    
    if (!student.enrolledClassrooms.includes(classroomId)) {
      student.enrolledClassrooms.push(classroomId);
      student.updatedAt = new Date().toISOString();
      await this.storage.set(this.collection, studentId, student);
    }
  }

  /**
   * Remove classroom enrollment (internal use)
   * @param {string} studentId - Student ID
   * @param {string} classroomId - Classroom ID
   */
  async _removeEnrollment(studentId, classroomId) {
    const student = await this.get(studentId);
    if (!student) return;
    
    student.enrolledClassrooms = student.enrolledClassrooms.filter(id => id !== classroomId);
    student.updatedAt = new Date().toISOString();
    await this.storage.set(this.collection, studentId, student);
  }
}

export default StudentManager;
