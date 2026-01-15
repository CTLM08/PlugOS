import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Attendance Tracker plug is enabled
const checkPlugEnabled = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT op.id FROM org_plugs op
      JOIN plugs p ON op.plug_id = p.id
      WHERE op.org_id = $1 AND p.slug = 'attendance-tracker'
    `, [req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Attendance Tracker plug is not enabled' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
};

// ==================== CLOCK IN/OUT ====================

// Get current clock status (is user clocked in?)
router.get('/org/:orgId/status', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    // Find any open attendance record (clocked in but not out) for today
    const result = await pool.query(`
      SELECT id, clock_in, notes 
      FROM attendance_records 
      WHERE org_id = $1 AND user_id = $2 AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
    `, [req.orgId, req.user.id]);
    
    if (result.rows.length > 0) {
      res.json({ 
        clockedIn: true, 
        record: result.rows[0] 
      });
    } else {
      res.json({ clockedIn: false, record: null });
    }
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get clock status' });
  }
});

// Clock in
router.post('/org/:orgId/clock-in', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { notes } = req.body;
    
    // Check if already clocked in
    const existing = await pool.query(`
      SELECT id FROM attendance_records 
      WHERE org_id = $1 AND user_id = $2 AND clock_out IS NULL
    `, [req.orgId, req.user.id]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in. Please clock out first.' });
    }
    
    const result = await pool.query(`
      INSERT INTO attendance_records (org_id, user_id, clock_in, notes)
      VALUES ($1, $2, NOW(), $3)
      RETURNING *
    `, [req.orgId, req.user.id, notes || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Clock-in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/org/:orgId/clock-out', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { notes } = req.body;
    
    // Find current open record
    const existing = await pool.query(`
      SELECT id FROM attendance_records 
      WHERE org_id = $1 AND user_id = $2 AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1
    `, [req.orgId, req.user.id]);
    
    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'Not currently clocked in.' });
    }
    
    const result = await pool.query(`
      UPDATE attendance_records 
      SET clock_out = NOW(), notes = COALESCE($1, notes)
      WHERE id = $2
      RETURNING *
    `, [notes, existing.rows[0].id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Clock-out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Get my attendance records
router.get('/org/:orgId/my-attendance', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT * FROM attendance_records 
      WHERE org_id = $1 AND user_id = $2
    `;
    const params = [req.orgId, req.user.id];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND clock_in >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND clock_in <= $${params.length}`;
    }
    
    query += ' ORDER BY clock_in DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('My attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance records' });
  }
});

// Get team attendance (managers/admins only)
router.get('/org/:orgId/team', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { date, department, search } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        ar.*,
        u.name as user_name,
        u.email as user_email,
        e.department as department
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN employees e ON e.org_id = ar.org_id AND e.email = u.email
      WHERE ar.org_id = $1 
        AND DATE(ar.clock_in) = $2
    `;
    const params = [req.orgId, targetDate];
    
    if (department) {
      params.push(department);
      query += ` AND e.department = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY ar.clock_in DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Team attendance error:', error);
    res.status(500).json({ error: 'Failed to get team attendance' });
  }
});

// ==================== LEAVE REQUESTS ====================

// Submit leave request
router.post('/org/:orgId/leave', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }
    
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    const result = await pool.query(`
      INSERT INTO leave_requests (org_id, user_id, leave_type, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.orgId, req.user.id, leave_type, start_date, end_date, reason || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

// Get my leave requests
router.get('/org/:orgId/leave', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lr.*,
        reviewer.name as reviewed_by_name
      FROM leave_requests lr
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.org_id = $1 AND lr.user_id = $2
      ORDER BY lr.created_at DESC
    `, [req.orgId, req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('My leave error:', error);
    res.status(500).json({ error: 'Failed to get leave requests' });
  }
});

// Get pending leave requests (managers/admins only)
router.get('/org/:orgId/leave/pending', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lr.*,
        u.name as user_name,
        u.email as user_email
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.org_id = $1 AND lr.status = 'pending'
      ORDER BY lr.created_at ASC
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Pending leave error:', error);
    res.status(500).json({ error: 'Failed to get pending leave requests' });
  }
});

// Review leave request (approve/reject) - managers/admins only
router.put('/org/:orgId/leave/:leaveId/review', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
    }
    
    const result = await pool.query(`
      UPDATE leave_requests 
      SET status = $1, reviewed_by = $2, reviewed_at = NOW()
      WHERE id = $3 AND org_id = $4 AND status = 'pending'
      RETURNING *
    `, [status, req.user.id, leaveId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found or already reviewed' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Review leave error:', error);
    res.status(500).json({ error: 'Failed to review leave request' });
  }
});

// Get all leave requests (managers/admins only)
router.get('/org/:orgId/leave/all', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lr.*,
        u.name as user_name,
        u.email as user_email,
        reviewer.name as reviewed_by_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.org_id = $1
      ORDER BY lr.created_at DESC
      LIMIT 100
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('All leave error:', error);
    res.status(500).json({ error: 'Failed to get leave requests' });
  }
});

// ==================== LEAVE TYPES ====================

// Get leave types for organization
router.get('/org/:orgId/leave-types', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM leave_types WHERE org_id = $1 ORDER BY name
    `, [req.orgId]);
    
    // If no custom types, return defaults
    if (result.rows.length === 0) {
      return res.json([
        { id: 'annual', name: 'Annual Leave', color: '#22c55e' },
        { id: 'sick', name: 'Sick Leave', color: '#ef4444' },
        { id: 'personal', name: 'Personal Leave', color: '#6366f1' },
        { id: 'unpaid', name: 'Unpaid Leave', color: '#a0a0a0' }
      ]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Leave types error:', error);
    res.status(500).json({ error: 'Failed to get leave types' });
  }
});

// Add new leave type (admin only)
router.post('/org/:orgId/leave-types', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Leave type name is required' });
    }
    
    const result = await pool.query(`
      INSERT INTO leave_types (org_id, name, color)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.orgId, name.trim(), color || '#6366f1']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Leave type already exists' });
    }
    console.error('Add leave type error:', error);
    res.status(500).json({ error: 'Failed to add leave type' });
  }
});

// Delete leave type (admin only)
router.delete('/org/:orgId/leave-types/:typeId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { typeId } = req.params;
    
    await pool.query(`
      DELETE FROM leave_types WHERE id = $1 AND org_id = $2
    `, [typeId, req.orgId]);
    
    res.json({ message: 'Leave type deleted' });
  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({ error: 'Failed to delete leave type' });
  }
});

export default router;
