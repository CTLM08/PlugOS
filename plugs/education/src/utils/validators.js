/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate student data
 * @param {Object} data - Student data
 * @param {boolean} isUpdate - Whether this is an update operation
 * @throws {ValidationError} If validation fails
 */
export function validateStudent(data, isUpdate = false) {
  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('Student name is required', 'name');
    }
    if (!data.email || typeof data.email !== 'string') {
      throw new ValidationError('Student email is required', 'email');
    }
  }
  
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
  }
  
  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
    throw new ValidationError('Name must be a non-empty string', 'name');
  }
}

/**
 * Validate classroom data
 * @param {Object} data - Classroom data
 * @param {boolean} isUpdate - Whether this is an update operation
 * @throws {ValidationError} If validation fails
 */
export function validateClassroom(data, isUpdate = false) {
  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('Classroom name is required', 'name');
    }
  }
  
  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
    throw new ValidationError('Name must be a non-empty string', 'name');
  }
}

/**
 * Validate assignment data
 * @param {Object} data - Assignment data
 * @param {boolean} isUpdate - Whether this is an update operation
 * @throws {ValidationError} If validation fails
 */
export function validateAssignment(data, isUpdate = false) {
  if (!isUpdate) {
    if (!data.classroomId) {
      throw new ValidationError('Classroom ID is required', 'classroomId');
    }
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new ValidationError('Assignment title is required', 'title');
    }
  }
  
  if (data.title !== undefined && (typeof data.title !== 'string' || data.title.trim() === '')) {
    throw new ValidationError('Title must be a non-empty string', 'title');
  }
  
  if (data.points !== undefined && (typeof data.points !== 'number' || data.points < 0)) {
    throw new ValidationError('Points must be a non-negative number', 'points');
  }
  
  if (data.dueDate !== undefined && data.dueDate !== null) {
    const date = new Date(data.dueDate);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid due date', 'dueDate');
    }
  }
}

/**
 * Validate announcement data
 * @param {Object} data - Announcement data
 * @param {boolean} isUpdate - Whether this is an update operation
 * @throws {ValidationError} If validation fails
 */
export function validateAnnouncement(data, isUpdate = false) {
  if (!isUpdate) {
    if (!data.classroomId) {
      throw new ValidationError('Classroom ID is required', 'classroomId');
    }
    if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
      throw new ValidationError('Announcement content is required', 'content');
    }
  }
  
  if (data.content !== undefined && (typeof data.content !== 'string' || data.content.trim() === '')) {
    throw new ValidationError('Content must be a non-empty string', 'content');
  }
}

/**
 * Validate grade data
 * @param {Object} data - Grade data
 * @throws {ValidationError} If validation fails
 */
export function validateGrade(data) {
  if (data.grade === undefined || data.grade === null) {
    throw new ValidationError('Grade is required', 'grade');
  }
  
  if (typeof data.grade !== 'number' || data.grade < 0) {
    throw new ValidationError('Grade must be a non-negative number', 'grade');
  }
}
