import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all departments for organization
router.get('/org/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM departments WHERE org_id = $1 ORDER BY name',
      [req.orgId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get departments:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

// Create department (admin only)
router.post('/org/:orgId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO departments (org_id, name) VALUES ($1, $2) RETURNING *',
      [req.orgId, name.trim()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Department already exists' });
    }
    console.error('Failed to create department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department (admin only)
router.put('/org/:orgId/:deptId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    const { deptId } = req.params;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    const result = await pool.query(
      'UPDATE departments SET name = $1 WHERE id = $2 AND org_id = $3 RETURNING *',
      [name.trim(), deptId, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    console.error('Failed to update department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department (admin only)
router.delete('/org/:orgId/:deptId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { deptId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM departments WHERE id = $1 AND org_id = $2 RETURNING id',
      [deptId, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Failed to delete department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// Get plugs assigned to a department
router.get('/org/:orgId/:deptId/plugs', authenticate, requireOrg, async (req, res) => {
  try {
    const { deptId } = req.params;
    
    const result = await pool.query(`
      SELECT p.id, p.name, p.slug, p.description, p.icon, dp.created_at as assigned_at
      FROM plugs p
      JOIN department_plugs dp ON p.id = dp.plug_id
      WHERE dp.department_id = $1 AND p.is_active = true
    `, [deptId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get department plugs:', error);
    res.status(500).json({ error: 'Failed to get department plugs' });
  }
});

// Assign plug to department (admin only)
router.post('/org/:orgId/:deptId/plugs/:plugId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { deptId, plugId } = req.params;
    
    // Verify department belongs to org
    const deptCheck = await pool.query(
      'SELECT id FROM departments WHERE id = $1 AND org_id = $2',
      [deptId, req.orgId]
    );
    
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Verify plug exists and is enabled for org
    const plugCheck = await pool.query(`
      SELECT p.id FROM plugs p
      JOIN org_plugs op ON p.id = op.plug_id
      WHERE p.id = $1 AND op.org_id = $2 AND p.is_active = true
    `, [plugId, req.orgId]);
    
    if (plugCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Plug is not enabled for this organization' });
    }
    
    await pool.query(
      'INSERT INTO department_plugs (department_id, plug_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [deptId, plugId]
    );
    
    res.status(201).json({ message: 'Plug assigned to department' });
  } catch (error) {
    console.error('Failed to assign plug to department:', error);
    res.status(500).json({ error: 'Failed to assign plug to department' });
  }
});

// Remove plug from department (admin only)
router.delete('/org/:orgId/:deptId/plugs/:plugId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { deptId, plugId } = req.params;
    
    await pool.query(
      'DELETE FROM department_plugs WHERE department_id = $1 AND plug_id = $2',
      [deptId, plugId]
    );
    
    res.json({ message: 'Plug removed from department' });
  } catch (error) {
    console.error('Failed to remove plug from department:', error);
    res.status(500).json({ error: 'Failed to remove plug from department' });
  }
});

export default router;
