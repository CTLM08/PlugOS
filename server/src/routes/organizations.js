import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get user's organizations
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.name, o.slug, om.role, o.created_at
      FROM organizations o 
      JOIN org_members om ON o.id = om.org_id 
      WHERE om.user_id = $1
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

// Get single organization
router.get('/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, created_at FROM organizations WHERE id = $1',
      [req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ ...result.rows[0], role: req.orgRole });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get organization' });
  }
});

// Get organization members
router.get('/:orgId/members', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, om.role, om.joined_at
      FROM users u
      JOIN org_members om ON u.id = om.user_id
      WHERE om.org_id = $1
      ORDER BY om.joined_at
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// Invite member to organization (admin/manager only)
router.post('/:orgId/members', authenticate, requireOrg, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role required' });
    }
    
    // Only admin can add other admins
    if (role === 'admin' && req.orgRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add other admins' });
    }
    
    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Check if already a member
    const existingMember = await pool.query(
      'SELECT id FROM org_members WHERE user_id = $1 AND org_id = $2',
      [userId, req.orgId]
    );
    
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' });
    }
    
    // Add member
    await pool.query(
      'INSERT INTO org_members (user_id, org_id, role) VALUES ($1, $2, $3)',
      [userId, req.orgId, role]
    );
    
    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Update member role (admin only)
router.patch('/:orgId/members/:memberId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const { memberId } = req.params;
    
    if (!role || !['admin', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required' });
    }
    
    await pool.query(
      'UPDATE org_members SET role = $1 WHERE user_id = $2 AND org_id = $3',
      [role, memberId, req.orgId]
    );
    
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Remove member (admin only)
router.delete('/:orgId/members/:memberId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Prevent removing self if last admin
    if (memberId === req.user.id) {
      const adminCount = await pool.query(
        "SELECT COUNT(*) FROM org_members WHERE org_id = $1 AND role = 'admin'",
        [req.orgId]
      );
      
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin' });
      }
    }
    
    await pool.query(
      'DELETE FROM org_members WHERE user_id = $1 AND org_id = $2',
      [memberId, req.orgId]
    );
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
