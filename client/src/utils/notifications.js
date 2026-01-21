/**
 * Browser Push Notification Utility
 * 
 * Handles requesting permission and showing browser notifications.
 */

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.checkPermission();
  }

  /**
   * Check current notification permission
   */
  checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
    return this.permission;
  }

  /**
   * Request notification permission from user
   * @returns {Promise<string>} Permission result
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a browser notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   */
  show(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notifications not permitted');
      return null;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      if (options.link) {
        window.location.href = options.link;
      }
      notification.close();
    };

    return notification;
  }

  /**
   * Check if notifications are supported
   */
  isSupported() {
    return 'Notification' in window;
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.permission === 'granted';
  }
}

// Singleton instance
const notificationService = new NotificationService();
export default notificationService;
