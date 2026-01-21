import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Notifications() {
  const { currentOrg } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    if (currentOrg) {
      fetchNotifications();
    }
  }, [currentOrg, filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = filter === 'unread' 
        ? `/notifications/org/${currentOrg.id}?unreadOnly=true`
        : `/notifications/org/${currentOrg.id}`;
      const { data } = await api.get(url);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/org/${currentOrg.id}/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/org/${currentOrg.id}/read-all`);
      setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/org/${currentOrg.id}/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      leave_request: 'mdi:calendar-clock',
      leave_approved: 'mdi:calendar-check',
      leave_rejected: 'mdi:calendar-remove',
      announcement: 'mdi:bullhorn',
      default: 'mdi:bell'
    };
    return icons[type] || icons.default;
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Icon icon="mdi:bell" className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border)]">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === 'all' ? 'bg-indigo-500 text-white' : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === 'unread' ? 'bg-indigo-500 text-white' : 'text-[var(--color-text-muted)] hover:text-white'
              }`}
            >
              Unread
            </button>
          </div>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-indigo-500/50 transition-all"
            >
              <Icon icon="mdi:check-all" className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Icon icon="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Icon icon="mdi:bell-off" className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-lg font-medium text-[var(--color-text-muted)]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 opacity-60">
              {filter === 'unread' ? "You're all caught up!" : "Notifications will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-4 p-4 transition-colors hover:bg-[var(--color-bg-elevated)] ${
                  !notification.read_at ? 'bg-indigo-500/5' : ''
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  !notification.read_at ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
                }`}>
                  <Icon icon={getNotificationIcon(notification.type)} className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${!notification.read_at ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                          {notification.title}
                        </p>
                        {!notification.read_at && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-60">
                        {formatTime(notification.created_at)}
                        {notification.actor_name && ` • by ${notification.actor_name}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read_at && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                          title="Mark as read"
                        >
                          <Icon icon="mdi:check" className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <Icon icon="mdi:delete" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
