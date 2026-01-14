import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all invites for organization
router.get('/org/:orgId', authenticate, requireOrg, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ei.id, 
        ei.email, 
        ei.role, 
        ei.registered_at, 
        ei.created_at,
        d.id as department_id,
        d.name as department_name,
        u.name as invited_by_name
      FROM employee_invites ei
      LEFT JOIN departments d ON ei.department_id = d.id
      LEFT JOIN users u ON ei.invited_by = u.id
      WHERE ei.org_id = $1
      ORDER BY ei.created_at DESC
    `, [req.orgId]);
    
    const invites = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      registered_at: row.registered_at,
      created_at: row.created_at,
      department: row.department_id ? {
        id: row.department_id,
        name: row.department_name
      } : null,
      invited_by: row.invited_by_name
    }));
    
    res.json(invites);
  } catch (error) {
    console.error('Failed to get invites:', error);
    res.status(500).json({ error: 'Failed to get invites' });
  }
});

// Create invite (admin/manager only)
router.post('/org/:orgId', authenticate, requireOrg, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { email, department_id, role } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'employee'];
    const inviteRole = role || 'employee';
    if (!validRoles.includes(inviteRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Only admins can invite other admins
    if (inviteRole === 'admin' && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite other admins' });
    }
    
    // Check if user already exists with this email
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Verify department if provided
    if (department_id) {
      const deptCheck = await pool.query(
        'SELECT id FROM departments WHERE id = $1 AND org_id = $2',
        [department_id, req.orgId]
      );
      
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Department not found' });
      }
    }
    
    const result = await pool.query(`
      INSERT INTO employee_invites (org_id, email, department_id, role, invited_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, department_id, created_at
    `, [req.orgId, email.toLowerCase(), department_id || null, inviteRole, req.user.id]);
    
    // Get department name if exists
    let department = null;
    if (department_id) {
      const dept = await pool.query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
      if (dept.rows.length > 0) {
        department = dept.rows[0];
      }
    }
    
    res.status(201).json({
      ...result.rows[0],
      department
    });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'This email has already been invited' });
    }
    console.error('Failed to create invite:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Delete invite (admin only)
router.delete('/org/:orgId/:inviteId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { inviteId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM employee_invites WHERE id = $1 AND org_id = $2 RETURNING id',
      [inviteId, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    
    res.json({ message: 'Invite deleted successfully' });
  } catch (error) {
    console.error('Failed to delete invite:', error);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

// Check if email is invited (public endpoint for registration)
router.get('/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ei.id,
        ei.role,
        ei.registered_at,
        o.name as organization_name,
        o.slug as organization_slug,
        d.name as department_name
      FROM employee_invites ei
      JOIN organizations o ON ei.org_id = o.id
      LEFT JOIN departments d ON ei.department_id = d.id
      WHERE LOWER(ei.email) = LOWER($1) AND ei.registered_at IS NULL
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.json({ invited: false });
    }
    
    const invite = result.rows[0];
    res.json({
      invited: true,
      organization: invite.organization_name,
      organizationSlug: invite.organization_slug,
      role: invite.role,
      department: invite.department_name
    });
  } catch (error) {
    console.error('Failed to check invite:', error);
    res.status(500).json({ error: 'Failed to check invite status' });
  }
});

export default router;
