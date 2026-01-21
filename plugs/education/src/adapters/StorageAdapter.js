/**
 * StorageAdapter - Base interface for storage adapters
 * All storage adapters must implement these methods
 */
class StorageAdapter {
  /**
   * Get an item from a collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<Object|null>} The item or null if not found
   */
  async get(collection, id) {
    throw new Error('Method not implemented: get');
  }

  /**
   * Set an item in a collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @param {Object} data - Item data
   * @returns {Promise<Object>} The saved item
   */
  async set(collection, id, data) {
    throw new Error('Method not implemented: set');
  }

  /**
   * Delete an item from a collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async delete(collection, id) {
    throw new Error('Method not implemented: delete');
  }

  /**
   * List all items in a collection
   * @param {string} collection - Collection name
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of items
   */
  async list(collection, filters = {}) {
    throw new Error('Method not implemented: list');
  }

  /**
   * Query items in a collection with a predicate
   * @param {string} collection - Collection name
   * @param {Function} predicate - Filter function
   * @returns {Promise<Array>} Array of matching items
   */
  async query(collection, predicate) {
    throw new Error('Method not implemented: query');
  }

  /**
   * Clear all data in a collection
   * @param {string} collection - Collection name
   * @returns {Promise<void>}
   */
  async clear(collection) {
    throw new Error('Method not implemented: clear');
  }

  /**
   * Clear all data in all collections
   * @returns {Promise<void>}
   */
  async clearAll() {
    throw new Error('Method not implemented: clearAll');
  }
}

export default StorageAdapter;
