import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all available plugs
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, slug, description, icon FROM plugs WHERE is_active = true'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get plugs' });
  }
});

// Get plugs enabled for an organization (filtered by department for non-admins)
router.get('/org/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    // Check if user is admin - use orgRole from middleware, not userRole
    if (req.orgRole === 'admin') {
      // Admins see all enabled plugs
      const result = await pool.query(`
        SELECT p.id, p.name, p.slug, p.description, p.icon, op.settings, op.enabled_at
        FROM plugs p
        JOIN org_plugs op ON p.id = op.plug_id
        WHERE op.org_id = $1 AND p.is_active = true
      `, [req.orgId]);
      
      return res.json(result.rows);
    }
    
    // Get user's department
    const memberResult = await pool.query(
      'SELECT department_id FROM org_members WHERE user_id = $1 AND org_id = $2',
      [req.user.id, req.orgId]
    );
    
    const departmentId = memberResult.rows[0]?.department_id;
    
    if (!departmentId) {
      // User has no department - show all enabled org plugs (lenient policy)
      const result = await pool.query(`
        SELECT p.id, p.name, p.slug, p.description, p.icon, op.settings, op.enabled_at
        FROM plugs p
        JOIN org_plugs op ON p.id = op.plug_id
        WHERE op.org_id = $1 AND p.is_active = true
      `, [req.orgId]);
      
      return res.json(result.rows);
    }
    
    // Get plugs assigned to user's department
    const result = await pool.query(`
      SELECT p.id, p.name, p.slug, p.description, p.icon, op.settings, op.enabled_at
      FROM plugs p
      JOIN org_plugs op ON p.id = op.plug_id
      JOIN department_plugs dp ON p.id = dp.plug_id
      WHERE op.org_id = $1 AND dp.department_id = $2 AND p.is_active = true
    `, [req.orgId, departmentId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Plugs error:', error);
    res.status(500).json({ error: 'Failed to get organization plugs' });
  }
});

// Enable a plug for organization (admin only)
router.post('/org/:orgId/enable/:plugId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { plugId } = req.params;
    const { settings } = req.body;
    
    // Check if plug exists
    const plugResult = await pool.query(
      'SELECT id, name FROM plugs WHERE id = $1 AND is_active = true',
      [plugId]
    );
    
    if (plugResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plug not found' });
    }
    
    // Enable plug
    await pool.query(`
      INSERT INTO org_plugs (org_id, plug_id, settings) 
      VALUES ($1, $2, $3)
      ON CONFLICT (org_id, plug_id) DO UPDATE SET settings = $3
    `, [req.orgId, plugId, settings || {}]);
    
    res.status(201).json({ message: `${plugResult.rows[0].name} enabled successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable plug' });
  }
});

// Disable a plug for organization (admin only)
router.delete('/org/:orgId/disable/:plugId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { plugId } = req.params;
    
    await pool.query(
      'DELETE FROM org_plugs WHERE org_id = $1 AND plug_id = $2',
      [req.orgId, plugId]
    );
    
    res.json({ message: 'Plug disabled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable plug' });
  }
});

// Check if org has a specific plug enabled
router.get('/org/:orgId/check/:plugSlug', authenticate, requireOrg, async (req, res) => {
  try {
    const { plugSlug } = req.params;
    
    const result = await pool.query(`
      SELECT op.id, op.settings
      FROM org_plugs op
      JOIN plugs p ON op.plug_id = p.id
      WHERE op.org_id = $1 AND p.slug = $2
    `, [req.orgId, plugSlug]);
    
    res.json({ 
      enabled: result.rows.length > 0,
      settings: result.rows[0]?.settings || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
});

export default router;
