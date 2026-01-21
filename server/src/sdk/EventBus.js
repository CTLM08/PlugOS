/**
 * PlugOS Plugin SDK - EventBus
 * 
 * Event-driven communication system for plugins to react to system events
 * and communicate with each other.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   */
  once(event, handler) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event).add(handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
    if (this.onceListeners.has(event)) {
      this.onceListeners.get(event).delete(handler);
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  async emit(event, data) {
    const promises = [];

    // Regular listeners
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`EventBus error in handler for "${event}":`, error);
        }
      }
    }

    // Once listeners
    if (this.onceListeners.has(event)) {
      for (const handler of this.onceListeners.get(event)) {
        try {
          const result = handler(data);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`EventBus error in once handler for "${event}":`, error);
        }
      }
      this.onceListeners.get(event).clear();
    }

    // Wait for all async handlers
    await Promise.allSettled(promises);
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional, clears all if not provided)
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get count of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }
}

// System event constants
export const SystemEvents = {
  // User events
  USER_CREATED: 'user.created',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Organization events
  ORG_CREATED: 'org.created',
  ORG_UPDATED: 'org.updated',
  ORG_DELETED: 'org.deleted',

  // Plugin events
  PLUGIN_INSTALLED: 'plugin.installed',
  PLUGIN_ACTIVATED: 'plugin.activated',
  PLUGIN_DEACTIVATED: 'plugin.deactivated',
  PLUGIN_UNINSTALLED: 'plugin.uninstalled',

  // Plug events (for built-in plugs)
  PLUG_ENABLED: 'plug.enabled',
  PLUG_DISABLED: 'plug.disabled',
};

// Singleton instance
const eventBus = new EventBus();
export default eventBus;
export { EventBus };
