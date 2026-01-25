import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all categories for an organization
router.get('/org/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, icon, color, sort_order, created_at
      FROM plug_categories
      WHERE org_id = $1
      ORDER BY sort_order ASC, name ASC
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create a new category (admin only)
router.post('/org/:orgId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Get max sort order
    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM plug_categories WHERE org_id = $1',
      [req.orgId]
    );
    
    const result = await pool.query(`
      INSERT INTO plug_categories (org_id, name, icon, color, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, icon, color, sort_order, created_at
    `, [req.orgId, name.trim(), icon || 'mdi:folder', color || '#6366f1', maxOrder.rows[0].next_order]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category (admin only)
router.put('/org/:orgId/:categoryId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, icon, color, sort_order } = req.body;
    
    // Verify category belongs to org
    const existing = await pool.query(
      'SELECT id FROM plug_categories WHERE id = $1 AND org_id = $2',
      [categoryId, req.orgId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const result = await pool.query(`
      UPDATE plug_categories 
      SET name = COALESCE($1, name),
          icon = COALESCE($2, icon),
          color = COALESCE($3, color),
          sort_order = COALESCE($4, sort_order)
      WHERE id = $5 AND org_id = $6
      RETURNING id, name, icon, color, sort_order, created_at
    `, [name, icon, color, sort_order, categoryId, req.orgId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category (admin only) - plugs move to uncategorized
router.delete('/org/:orgId/:categoryId', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Verify category belongs to org
    const existing = await pool.query(
      'SELECT id FROM plug_categories WHERE id = $1 AND org_id = $2',
      [categoryId, req.orgId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Delete category (plugs will have category_id set to NULL due to ON DELETE SET NULL)
    await pool.query(
      'DELETE FROM plug_categories WHERE id = $1 AND org_id = $2',
      [categoryId, req.orgId]
    );
    
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Assign a plug to a category (admin only)
router.put('/org/:orgId/plug/:plugId/category', authenticate, requireOrg, requireRole('admin'), async (req, res) => {
  try {
    const { plugId } = req.params;
    const { categoryId } = req.body; // null to remove from category
    
    // Verify the plug is enabled for this org
    const orgPlug = await pool.query(
      'SELECT id FROM org_plugs WHERE org_id = $1 AND plug_id = $2',
      [req.orgId, plugId]
    );
    
    if (orgPlug.rows.length === 0) {
      return res.status(404).json({ error: 'Plug not enabled for this organization' });
    }
    
    // If categoryId provided, verify it belongs to this org
    if (categoryId) {
      const category = await pool.query(
        'SELECT id FROM plug_categories WHERE id = $1 AND org_id = $2',
        [categoryId, req.orgId]
      );
      
      if (category.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }
    
    // Update the plug's category
    await pool.query(
      'UPDATE org_plugs SET category_id = $1 WHERE org_id = $2 AND plug_id = $3',
      [categoryId || null, req.orgId, plugId]
    );
    
    res.json({ message: 'Plug category updated' });
  } catch (error) {
    console.error('Assign plug category error:', error);
    res.status(500).json({ error: 'Failed to update plug category' });
  }
});

// Get plugs with their categories for an org
router.get('/org/:orgId/with-plugs', authenticate, requireOrg, async (req, res) => {
  try {
    // Get all categories
    const categories = await pool.query(`
      SELECT id, name, icon, color, sort_order
      FROM plug_categories
      WHERE org_id = $1
      ORDER BY sort_order ASC, name ASC
    `, [req.orgId]);
    
    // Get enabled plugs with category info
    const plugs = await pool.query(`
      SELECT p.id, p.name, p.slug, p.icon, op.category_id
      FROM plugs p
      JOIN org_plugs op ON p.id = op.plug_id
      WHERE op.org_id = $1 AND p.is_active = true
    `, [req.orgId]);
    
    res.json({
      categories: categories.rows,
      plugs: plugs.rows
    });
  } catch (error) {
    console.error('Get categories with plugs error:', error);
    res.status(500).json({ error: 'Failed to get categories with plugs' });
  }
});

export default router;
