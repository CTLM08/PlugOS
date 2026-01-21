import StorageAdapter from './StorageAdapter.js';
import { deepClone } from '../utils/helpers.js';

/**
 * MemoryAdapter - In-memory storage adapter
 * Data is stored in memory and lost when the process ends
 * Ideal for testing and development
 */
class MemoryAdapter extends StorageAdapter {
  constructor() {
    super();
    this.data = new Map();
  }

  /**
   * Ensure collection exists
   * @param {string} collection - Collection name
   */
  _ensureCollection(collection) {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }
  }

  async get(collection, id) {
    this._ensureCollection(collection);
    const item = this.data.get(collection).get(id);
    return item ? deepClone(item) : null;
  }

  async set(collection, id, data) {
    this._ensureCollection(collection);
    const item = deepClone({ ...data, id });
    this.data.get(collection).set(id, item);
    return deepClone(item);
  }

  async delete(collection, id) {
    this._ensureCollection(collection);
    return this.data.get(collection).delete(id);
  }

  async list(collection, filters = {}) {
    this._ensureCollection(collection);
    let items = Array.from(this.data.get(collection).values());
    
    // Apply simple filters
    for (const [key, value] of Object.entries(filters)) {
      items = items.filter(item => item[key] === value);
    }
    
    return items.map(item => deepClone(item));
  }

  async query(collection, predicate) {
    this._ensureCollection(collection);
    const items = Array.from(this.data.get(collection).values());
    return items.filter(predicate).map(item => deepClone(item));
  }

  async clear(collection) {
    this._ensureCollection(collection);
    this.data.get(collection).clear();
  }

  async clearAll() {
    this.data.clear();
  }
}

export default MemoryAdapter;
