import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to get current user's employee ID
const getEmployeeId = async (orgId, email) => {
  const result = await pool.query(
    'SELECT id FROM employees WHERE org_id = $1 AND email = $2',
    [orgId, email]
  );
  return result.rows[0]?.id || null;
};

// Get all workflows for org
router.get('/org/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.id, w.org_id, w.name, w.description, w.created_by, w.created_at, w.updated_at,
        COALESCE(jsonb_array_length(w.nodes), 0) as node_count
      FROM workflows w
      WHERE w.org_id = $1
      ORDER BY w.updated_at DESC
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

// Get single workflow
router.get('/org/:orgId/:workflowId', authenticate, requireOrg, async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM workflows
      WHERE id = $1 AND org_id = $2
    `, [workflowId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// Create workflow
router.post('/org/:orgId', authenticate, requireOrg, async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const employeeId = await getEmployeeId(req.orgId, req.user.email);
    
    const result = await pool.query(`
      INSERT INTO workflows (org_id, name, description, nodes, edges, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      req.orgId,
      name,
      description || null,
      JSON.stringify(nodes || []),
      JSON.stringify(edges || []),
      employeeId
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update workflow (save nodes and edges)
router.put('/org/:orgId/:workflowId', authenticate, requireOrg, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { name, description, nodes, edges } = req.body;
    
    const result = await pool.query(`
      UPDATE workflows
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          nodes = COALESCE($3, nodes),
          edges = COALESCE($4, edges),
          updated_at = NOW()
      WHERE id = $5 AND org_id = $6
      RETURNING *
    `, [
      name || null,
      description,
      nodes ? JSON.stringify(nodes) : null,
      edges ? JSON.stringify(edges) : null,
      workflowId,
      req.orgId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete workflow
router.delete('/org/:orgId/:workflowId', authenticate, requireOrg, async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM workflows WHERE id = $1 AND org_id = $2
      RETURNING id
    `, [workflowId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

export default router;
