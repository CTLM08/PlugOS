import EventEmitter from './events/EventEmitter.js';
import MemoryAdapter from './adapters/MemoryAdapter.js';
import StudentManager from './modules/StudentManager.js';
import ClassroomManager from './modules/ClassroomManager.js';
import AssignmentManager from './modules/AssignmentManager.js';
import AnnouncementManager from './modules/AnnouncementManager.js';

/**
 * EduSDK - Main SDK class for education platform features
 * 
 * @example
 * import { EduSDK } from 'edu-classroom-sdk';
 * 
 * const edu = new EduSDK();
 * 
 * // Create a classroom
 * const classroom = await edu.classrooms.create({
 *   name: 'Math 101',
 *   teacherId: 'teacher-1'
 * });
 * 
 * // Create and enroll a student
 * const student = await edu.students.create({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * await edu.classrooms.enrollStudent(classroom.id, student.id);
 */
class EduSDK {
  /**
   * Create a new EduSDK instance
   * @param {Object} [options] - Configuration options
   * @param {Object} [options.adapter] - Custom storage adapter (default: MemoryAdapter)
   */
  constructor(options = {}) {
    // Initialize event emitter
    this._events = new EventEmitter();
    
    // Initialize storage adapter
    this._adapter = options.adapter || new MemoryAdapter();
    
    // Initialize managers
    this._students = new StudentManager(this._adapter, this._events);
    this._classrooms = new ClassroomManager(this._adapter, this._events, this._students);
    this._assignments = new AssignmentManager(this._adapter, this._events, this._classrooms);
    this._announcements = new AnnouncementManager(this._adapter, this._events, this._classrooms);
  }

  /**
   * Student management module
   * @returns {StudentManager}
   */
  get students() {
    return this._students;
  }

  /**
   * Classroom management module
   * @returns {ClassroomManager}
   */
  get classrooms() {
    return this._classrooms;
  }

  /**
   * Assignment management module
   * @returns {AssignmentManager}
   */
  get assignments() {
    return this._assignments;
  }

  /**
   * Announcement management module
   * @returns {AnnouncementManager}
   */
  get announcements() {
    return this._announcements;
  }

  /**
   * Subscribe to SDK events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   * 
   * @example
   * edu.on('student:enrolled', ({ studentId, classroomId }) => {
   *   console.log(`Student ${studentId} joined ${classroomId}`);
   * });
   * 
   * // Available events:
   * // - student:created, student:updated, student:deleted
   * // - classroom:created, classroom:updated, classroom:deleted
   * // - student:enrolled, student:unenrolled
   * // - assignment:created, assignment:updated, assignment:deleted
   * // - assignment:submitted, assignment:graded
   * // - announcement:created, announcement:updated, announcement:deleted
   * // - announcement:commented
   */
  on(event, callback) {
    return this._events.on(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    return this._events.once(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    this._events.off(event, callback);
  }

  /**
   * Clear all data (useful for testing)
   * @returns {Promise<void>}
   */
  async clearAllData() {
    await this._adapter.clearAll();
  }

  /**
   * Get the storage adapter instance
   * @returns {Object} Storage adapter
   */
  get adapter() {
    return this._adapter;
  }
}

export default EduSDK;
