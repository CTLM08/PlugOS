import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Task Manager plug is enabled
const checkPlugEnabled = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT op.id FROM org_plugs op
      JOIN plugs p ON op.plug_id = p.id
      WHERE op.org_id = $1 AND p.slug = 'task-manager'
    `, [req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Task Manager plug is not enabled' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
};

// Helper to get current user's employee ID
const getEmployeeId = async (orgId, email) => {
  const result = await pool.query(
    'SELECT id FROM employees WHERE org_id = $1 AND email = $2',
    [orgId, email]
  );
  return result.rows[0]?.id;
};

// Helper to fetch assignees for tasks
const fetchAssigneesForTasks = async (taskIds) => {
  if (!taskIds.length) return {};
  
  const result = await pool.query(`
    SELECT ta.task_id, ta.employee_id, ta.department_id,
           e.name as employee_name, e.avatar_url as employee_avatar,
           d.name as department_name
    FROM task_assignees ta
    LEFT JOIN employees e ON ta.employee_id = e.id
    LEFT JOIN departments d ON ta.department_id = d.id
    WHERE ta.task_id = ANY($1)
  `, [taskIds]);
  
  const assigneeMap = {};
  result.rows.forEach(row => {
    if (!assigneeMap[row.task_id]) assigneeMap[row.task_id] = [];
    assigneeMap[row.task_id].push({
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      employee_avatar: row.employee_avatar,
      department_id: row.department_id,
      department_name: row.department_name
    });
  });
  return assigneeMap;
};

// Helper to check if user is assigned to task (directly or via department)
const isUserAssignedToTask = async (taskId, employeeId, orgId) => {
  // Check direct employee assignment
  const directResult = await pool.query(
    'SELECT id FROM task_assignees WHERE task_id = $1 AND employee_id = $2',
    [taskId, employeeId]
  );
  if (directResult.rows.length > 0) return true;
  
  // Check department assignment
  const deptResult = await pool.query(`
    SELECT ta.id FROM task_assignees ta
    JOIN employees e ON e.department_id = ta.department_id
    WHERE ta.task_id = $1 AND e.id = $2
  `, [taskId, employeeId]);
  return deptResult.rows.length > 0;
};

// Get all tasks for org (with filters)
router.get('/org/:orgId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { status, priority, assigneeId, departmentId, search } = req.query;
    
    let query = `
      SELECT DISTINCT t.*, c.name as creator_name
      FROM tasks t
      LEFT JOIN employees c ON t.created_by = c.id
      LEFT JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.org_id = $1
    `;
    const params = [req.orgId];
    
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND t.priority = $${params.length}`;
    }
    if (assigneeId) {
      params.push(assigneeId);
      query += ` AND ta.employee_id = $${params.length}`;
    }
    if (departmentId) {
      params.push(departmentId);
      query += ` AND ta.department_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
    }
    
    query += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';
    
    const result = await pool.query(query, params);
    
    // Fetch assignees for all tasks
    const taskIds = result.rows.map(t => t.id);
    const assigneeMap = await fetchAssigneesForTasks(taskIds);
    
    // Attach assignees to tasks
    const tasksWithAssignees = result.rows.map(task => ({
      ...task,
      assignees: assigneeMap[task.id] || []
    }));
    
    res.json(tasksWithAssignees);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Create new task
router.post('/org/:orgId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, assignees } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const creatorId = await getEmployeeId(req.orgId, req.user.email);
    
    // Create task
    const taskResult = await pool.query(`
      INSERT INTO tasks (org_id, title, description, status, priority, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      req.orgId, 
      title, 
      description || null, 
      status || 'To Do', 
      priority || 'Medium', 
      due_date || null, 
      creatorId || null
    ]);
    
    const task = taskResult.rows[0];
    
    // Add assignees if provided
    if (assignees && assignees.length > 0) {
      for (const a of assignees) {
        await pool.query(`
          INSERT INTO task_assignees (task_id, employee_id, department_id)
          VALUES ($1, $2, $3)
        `, [task.id, a.employee_id || null, a.department_id || null]);
      }
    }
    
    // Fetch task with assignees
    const assigneeMap = await fetchAssigneesForTasks([task.id]);
    
    res.status(201).json({
      ...task,
      assignees: assigneeMap[task.id] || []
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get single task details with comments
router.get('/org/:orgId/:taskId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const taskResult = await pool.query(`
      SELECT t.*, c.name as creator_name
      FROM tasks t
      LEFT JOIN employees c ON t.created_by = c.id
      WHERE t.id = $1 AND t.org_id = $2
    `, [taskId, req.orgId]);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Fetch assignees
    const assigneeMap = await fetchAssigneesForTasks([taskId]);
    
    const commentsResult = await pool.query(`
      SELECT tc.*, e.name as employee_name, e.avatar_url as employee_avatar
      FROM task_comments tc
      JOIN employees e ON tc.employee_id = e.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [taskId]);
    
    res.json({
      ...taskResult.rows[0],
      assignees: assigneeMap[taskId] || [],
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Get task details error:', error);
    res.status(500).json({ error: 'Failed to get task details' });
  }
});

// Update task
router.put('/org/:orgId/:taskId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, due_date, assignees } = req.body;
    
    const result = await pool.query(`
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          due_date = COALESCE($5, due_date),
          updated_at = NOW()
      WHERE id = $6 AND org_id = $7
      RETURNING *
    `, [title, description, status, priority, due_date, taskId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update assignees if provided
    if (assignees !== undefined) {
      // Remove old assignees
      await pool.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
      
      // Add new assignees
      if (assignees && assignees.length > 0) {
        for (const a of assignees) {
          await pool.query(`
            INSERT INTO task_assignees (task_id, employee_id, department_id)
            VALUES ($1, $2, $3)
          `, [taskId, a.employee_id || null, a.department_id || null]);
        }
      }
    }
    
    // Fetch updated task with assignees
    const assigneeMap = await fetchAssigneesForTasks([taskId]);
    
    res.json({
      ...result.rows[0],
      assignees: assigneeMap[taskId] || []
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Quick status update (employees can update their own assigned tasks)
router.put('/org/:orgId/:taskId/status', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Check if user is admin/manager OR assigned to this task
    const employeeId = await getEmployeeId(req.orgId, req.user.email);
    const isAssigned = await isUserAssignedToTask(taskId, employeeId, req.orgId);
    
    // Get user role
    const roleResult = await pool.query(
      'SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2',
      [req.orgId, req.user.id]
    );
    const userRole = roleResult.rows[0]?.role;
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    
    if (!isAdminOrManager && !isAssigned) {
      return res.status(403).json({ error: 'You can only update status on tasks assigned to you' });
    }
    
    const result = await pool.query(`
      UPDATE tasks 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND org_id = $3
      RETURNING *
    `, [status, taskId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Delete task
router.delete('/org/:orgId/:taskId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const result = await pool.query(`
      DELETE FROM tasks WHERE id = $1 AND org_id = $2
      RETURNING id
    `, [taskId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Add comment to task
router.post('/org/:orgId/:taskId/comments', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const employeeId = await getEmployeeId(req.orgId, req.user.email);
    
    if (!employeeId) {
      return res.status(403).json({ error: 'User is not an employee of this organization' });
    }
    
    const result = await pool.query(`
      INSERT INTO task_comments (task_id, employee_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [taskId, employeeId, content]);
    
    const comment = result.rows[0];
    
    // Fetch employee details for the response
    const commentWithEmployee = await pool.query(`
      SELECT tc.*, e.name as employee_name, e.avatar_url as employee_avatar
      FROM task_comments tc
      JOIN employees e ON tc.employee_id = e.id
      WHERE tc.id = $1
    `, [comment.id]);
    
    res.status(201).json(commentWithEmployee.rows[0]);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get comments for task
router.get('/org/:orgId/:taskId/comments', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const result = await pool.query(`
      SELECT tc.*, e.name as author_name, e.avatar_url as author_avatar
      FROM task_comments tc
      LEFT JOIN employees e ON tc.employee_id = e.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [taskId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

export default router;
