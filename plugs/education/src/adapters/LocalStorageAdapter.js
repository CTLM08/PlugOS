import StorageAdapter from './StorageAdapter.js';
import { deepClone } from '../utils/helpers.js';

/**
 * LocalStorageAdapter - Browser localStorage adapter
 * Data persists in browser localStorage
 * Ideal for client-side web applications
 */
class LocalStorageAdapter extends StorageAdapter {
  constructor(prefix = 'edu_sdk_') {
    super();
    this.prefix = prefix;
    
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }
  }

  /**
   * Get storage key for a collection
   * @param {string} collection - Collection name
   * @returns {string} Storage key
   */
  _getKey(collection) {
    return `${this.prefix}${collection}`;
  }

  /**
   * Get collection data from localStorage
   * @param {string} collection - Collection name
   * @returns {Object} Collection data object
   */
  _getCollection(collection) {
    const key = this._getKey(collection);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  /**
   * Save collection data to localStorage
   * @param {string} collection - Collection name
   * @param {Object} data - Collection data object
   */
  _saveCollection(collection, data) {
    const key = this._getKey(collection);
    localStorage.setItem(key, JSON.stringify(data));
  }

  async get(collection, id) {
    const data = this._getCollection(collection);
    return data[id] ? deepClone(data[id]) : null;
  }

  async set(collection, id, itemData) {
    const data = this._getCollection(collection);
    const item = deepClone({ ...itemData, id });
    data[id] = item;
    this._saveCollection(collection, data);
    return deepClone(item);
  }

  async delete(collection, id) {
    const data = this._getCollection(collection);
    if (data[id]) {
      delete data[id];
      this._saveCollection(collection, data);
      return true;
    }
    return false;
  }

  async list(collection, filters = {}) {
    const data = this._getCollection(collection);
    let items = Object.values(data);
    
    // Apply simple filters
    for (const [key, value] of Object.entries(filters)) {
      items = items.filter(item => item[key] === value);
    }
    
    return items.map(item => deepClone(item));
  }

  async query(collection, predicate) {
    const data = this._getCollection(collection);
    const items = Object.values(data);
    return items.filter(predicate).map(item => deepClone(item));
  }

  async clear(collection) {
    const key = this._getKey(collection);
    localStorage.removeItem(key);
  }

  async clearAll() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}

export default LocalStorageAdapter;
