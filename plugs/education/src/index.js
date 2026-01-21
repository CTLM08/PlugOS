/**
 * edu-classroom-sdk
 * A JavaScript SDK for building education platforms with Google Classroom-like features
 * 
 * @module edu-classroom-sdk
 */

// Main SDK class
export { default as EduSDK } from './EduSDK.js';

// Storage adapters
export { default as StorageAdapter } from './adapters/StorageAdapter.js';
export { default as MemoryAdapter } from './adapters/MemoryAdapter.js';
export { default as LocalStorageAdapter } from './adapters/LocalStorageAdapter.js';

// Managers (for advanced usage)
export { default as StudentManager } from './modules/StudentManager.js';
export { default as ClassroomManager } from './modules/ClassroomManager.js';
export { default as AssignmentManager } from './modules/AssignmentManager.js';
export { default as AnnouncementManager } from './modules/AnnouncementManager.js';

// Utilities
export { default as EventEmitter } from './events/EventEmitter.js';
export * from './utils/helpers.js';
export * from './utils/validators.js';
