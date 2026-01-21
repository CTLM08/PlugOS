import { generateId } from '../utils/helpers.js';
import { validateAnnouncement } from '../utils/validators.js';

/**
 * AnnouncementManager - Manages classroom announcements
 */
class AnnouncementManager {
  /**
   * @param {Object} storage - Storage adapter instance
   * @param {Object} events - EventEmitter instance
   * @param {Object} classroomManager - ClassroomManager instance
   */
  constructor(storage, events, classroomManager) {
    this.storage = storage;
    this.events = events;
    this.classroomManager = classroomManager;
    this.collection = 'announcements';
  }

  /**
   * Create a new announcement
   * @param {Object} data - Announcement data
   * @param {string} data.classroomId - Classroom ID
   * @param {string} [data.title] - Announcement title
   * @param {string} data.content - Announcement content
   * @param {string} [data.authorId] - Author ID
   * @returns {Promise<Object>} Created announcement
   */
  async create(data) {
    validateAnnouncement(data);
    
    // Verify classroom exists
    const classroom = await this.classroomManager.get(data.classroomId);
    if (!classroom) {
      throw new Error('Classroom not found');
    }
    
    const announcement = {
      id: generateId('ann'),
      classroomId: data.classroomId,
      title: data.title ? data.title.trim() : '',
      content: data.content.trim(),
      authorId: data.authorId || null,
      attachments: data.attachments || [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = await this.storage.set(this.collection, announcement.id, announcement);
    this.events.emit('announcement:created', saved);
    return saved;
  }

  /**
   * Get an announcement by ID
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<Object|null>} Announcement or null if not found
   */
  async get(announcementId) {
    return this.storage.get(this.collection, announcementId);
  }

  /**
   * Update an announcement
   * @param {string} announcementId - Announcement ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated announcement
   */
  async update(announcementId, updates) {
    validateAnnouncement(updates, true);
    
    const announcement = await this.get(announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
    
    const updated = {
      ...announcement,
      ...updates,
      title: updates.title !== undefined ? updates.title.trim() : announcement.title,
      content: updates.content !== undefined ? updates.content.trim() : announcement.content,
      updatedAt: new Date().toISOString()
    };
    
    // Preserve immutable fields
    updated.id = announcement.id;
    updated.classroomId = announcement.classroomId;
    updated.createdAt = announcement.createdAt;
    
    const saved = await this.storage.set(this.collection, announcementId, updated);
    this.events.emit('announcement:updated', saved);
    return saved;
  }

  /**
   * Delete an announcement
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(announcementId) {
    const announcement = await this.get(announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
    
    const result = await this.storage.delete(this.collection, announcementId);
    if (result) {
      this.events.emit('announcement:deleted', { id: announcementId });
    }
    return result;
  }

  /**
   * Get all announcements for a classroom
   * @param {string} classroomId - Classroom ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of announcements
   * @param {boolean} [options.latest] - Sort by newest first
   * @returns {Promise<Array>} Array of announcements
   */
  async getByClassroom(classroomId, options = {}) {
    let announcements = await this.storage.query(this.collection, 
      a => a.classroomId === classroomId
    );
    
    // Sort by createdAt
    if (options.latest !== false) {
      announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      announcements = announcements.slice(0, options.limit);
    }
    
    return announcements;
  }

  /**
   * Add a comment to an announcement
   * @param {string} announcementId - Announcement ID
   * @param {Object} comment - Comment data
   * @param {string} comment.authorId - Comment author ID
   * @param {string} comment.content - Comment content
   * @returns {Promise<Object>} Updated announcement
   */
  async addComment(announcementId, comment) {
    const announcement = await this.get(announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
    
    if (!comment.content || comment.content.trim() === '') {
      throw new Error('Comment content is required');
    }
    
    const newComment = {
      id: generateId('cmt'),
      authorId: comment.authorId || null,
      content: comment.content.trim(),
      createdAt: new Date().toISOString()
    };
    
    announcement.comments.push(newComment);
    announcement.updatedAt = new Date().toISOString();
    
    const saved = await this.storage.set(this.collection, announcementId, announcement);
    this.events.emit('announcement:commented', { announcementId, comment: newComment });
    return saved;
  }

  /**
   * Delete a comment from an announcement
   * @param {string} announcementId - Announcement ID
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Updated announcement
   */
  async deleteComment(announcementId, commentId) {
    const announcement = await this.get(announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
    
    const commentIndex = announcement.comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }
    
    announcement.comments.splice(commentIndex, 1);
    announcement.updatedAt = new Date().toISOString();
    
    const saved = await this.storage.set(this.collection, announcementId, announcement);
    return saved;
  }
}

export default AnnouncementManager;
