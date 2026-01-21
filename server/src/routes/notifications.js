/**
 * Notifications Routes
 * 
 * API for managing user notifications.
 */

import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications/org/:orgId
 * Get notifications for the current user
 */
router.get('/org/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    
    let query = `
      SELECT n.*, 
        CASE 
          WHEN n.actor_id IS NOT NULL THEN u.name 
          ELSE NULL 
        END as actor_name
      FROM notifications n
      LEFT JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = $1 AND n.org_id = $2
    `;
    const params = [req.user.id, req.orgId];
    
    if (unreadOnly === 'true') {
      query += ' AND n.read_at IS NULL';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * GET /api/notifications/org/:orgId/unread-count
 * Get count of unread notifications
 */
router.get('/org/:orgId/unread-count', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = $1 AND org_id = $2 AND read_at IS NULL
    `, [req.user.id, req.orgId]);
    
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * PUT /api/notifications/org/:orgId/:notificationId/read
 * Mark a notification as read
 */
router.put('/org/:orgId/:notificationId/read', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE notifications 
      SET read_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND org_id = $3
      RETURNING *
    `, [req.params.notificationId, req.user.id, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PUT /api/notifications/org/:orgId/read-all
 * Mark all notifications as read
 */
router.put('/org/:orgId/read-all', authenticate, requireOrg, async (req, res) => {
  try {
    await pool.query(`
      UPDATE notifications 
      SET read_at = NOW() 
      WHERE user_id = $1 AND org_id = $2 AND read_at IS NULL
    `, [req.user.id, req.orgId]);
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/org/:orgId/:notificationId
 * Delete a notification
 */
router.delete('/org/:orgId/:notificationId', authenticate, requireOrg, async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2 AND org_id = $3
    `, [req.params.notificationId, req.user.id, req.orgId]);
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * Helper function to create a notification
 * Can be imported and used by other routes
 */
export async function createNotification({
  userId,
  orgId,
  type,
  title,
  message,
  actorId = null,
  link = null,
  data = {}
}) {
  try {
    const result = await pool.query(`
      INSERT INTO notifications (user_id, org_id, type, title, message, actor_id, link, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, orgId, type, title, message, actorId, link, data]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

/**
 * Helper function to notify all admins/managers in an org
 */
export async function notifyAdmins({
  orgId,
  type,
  title,
  message,
  actorId = null,
  link = null,
  data = {}
}) {
  try {
    // Get all admins and managers in the org
    const admins = await pool.query(`
      SELECT user_id FROM org_members 
      WHERE org_id = $1 AND role IN ('admin', 'manager')
    `, [orgId]);
    
    // Create notification for each
    for (const admin of admins.rows) {
      await createNotification({
        userId: admin.user_id,
        orgId,
        type,
        title,
        message,
        actorId,
        link,
        data
      });
    }
    
    return true;
  } catch (error) {
    console.error('Notify admins error:', error);
    return false;
  }
}

export default router;
