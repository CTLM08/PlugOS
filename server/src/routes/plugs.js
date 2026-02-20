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
        SELECT p.id, p.name, p.slug, p.description, p.icon, op.settings, op.enabled_at, op.category_id
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
        SELECT p.id, p.name, p.slug, p.description, p.icon, op.settings, op.enabled_at, op.category_id
        FROM plugs p
        JOIN org_plugs op ON p.id = op.plug_id
        WHERE op.org_id = $1 AND p.is_active = true
      `, [req.orgId]);
      
      return res.json(result.rows);
    }
    
    // Get plugs assigned to user's department
    const result = await pool.query(`
      SELECT p.id, p.name, p.slug, p.description, p.icon, op.settings, op.enabled_at, op.category_id
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

// Get summary data for dashboard plug cards
router.get('/org/:orgId/summary', authenticate, requireOrg, async (req, res) => {
  try {
    const summary = {};
    
    // Get enabled plugs for this org
    const enabledPlugs = await pool.query(`
      SELECT p.slug FROM plugs p
      JOIN org_plugs op ON p.id = op.plug_id
      WHERE op.org_id = $1 AND p.is_active = true
    `, [req.orgId]);
    
    const enabledSlugs = enabledPlugs.rows.map(p => p.slug);
    
    // Employee Directory summary
    if (enabledSlugs.includes('employee-directory')) {
      const empResult = await pool.query(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(DISTINCT department) FILTER (WHERE department IS NOT NULL) as total_departments
        FROM employees WHERE org_id = $1
      `, [req.orgId]);
      
      const deptResult = await pool.query(`
        SELECT department as name, COUNT(*) as count
        FROM employees 
        WHERE org_id = $1 AND department IS NOT NULL
        GROUP BY department
        ORDER BY count DESC
        LIMIT 5
      `, [req.orgId]);
      
      summary['employee-directory'] = {
        totalEmployees: parseInt(empResult.rows[0]?.total_employees || 0),
        totalDepartments: parseInt(empResult.rows[0]?.total_departments || 0),
        departmentDistribution: deptResult.rows.map(d => ({
          name: d.name,
          count: parseInt(d.count)
        }))
      };
    }
    
    // Attendance Tracker summary
    if (enabledSlugs.includes('attendance-tracker')) {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's attendance stats
      const attendanceResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as present_count
        FROM attendance_records 
        WHERE org_id = $1 AND DATE(clock_in) = $2
      `, [req.orgId, today]);
      
      // Get total org members
      const membersResult = await pool.query(`
        SELECT COUNT(*) as total FROM org_members WHERE org_id = $1
      `, [req.orgId]);
      
      // Get pending leave requests
      const leaveResult = await pool.query(`
        SELECT COUNT(*) as pending FROM leave_requests 
        WHERE org_id = $1 AND status = 'pending'
      `, [req.orgId]);
      
      const presentCount = parseInt(attendanceResult.rows[0]?.present_count || 0);
      const totalMembers = parseInt(membersResult.rows[0]?.total || 0);
      const attendanceRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
      
      summary['attendance-tracker'] = {
        todayPresent: presentCount,
        totalMembers: totalMembers,
        attendanceRate: attendanceRate,
        pendingLeaves: parseInt(leaveResult.rows[0]?.pending || 0)
      };
    }
    
    // Payroll Manager summary
    if (enabledSlugs.includes('payroll-manager')) {
      // Get latest/current payroll period
      const periodResult = await pool.query(`
        SELECT 
          pp.id, pp.name, pp.status, pp.start_date, pp.end_date,
          (SELECT COUNT(*) FROM payslips ps WHERE ps.period_id = pp.id) as payslip_count,
          (SELECT COALESCE(SUM(net_pay), 0) FROM payslips ps WHERE ps.period_id = pp.id) as total_payroll
        FROM payroll_periods pp
        WHERE pp.org_id = $1
        ORDER BY pp.start_date DESC
        LIMIT 1
      `, [req.orgId]);
      
      // Get configured salaries count
      const salaryResult = await pool.query(`
        SELECT COUNT(*) as configured FROM employee_salaries WHERE org_id = $1
      `, [req.orgId]);
      
      const period = periodResult.rows[0];
      
      summary['payroll-manager'] = {
        currentPeriod: period?.name || null,
        periodStatus: period?.status || null,
        totalPayroll: parseFloat(period?.total_payroll || 0),
        employeesProcessed: parseInt(period?.payslip_count || 0),
        salariesConfigured: parseInt(salaryResult.rows[0]?.configured || 0)
      };
    }
    
    // Document Manager summary
    if (enabledSlugs.includes('document-manager')) {
      const docResult = await pool.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT folder_id) as total_folders,
          COALESCE(SUM(file_size), 0) as total_size
        FROM documents WHERE org_id = $1
      `, [req.orgId]);
      
      summary['document-manager'] = {
        totalDocuments: parseInt(docResult.rows[0]?.total_documents || 0),
        totalFolders: parseInt(docResult.rows[0]?.total_folders || 0),
        totalSize: parseInt(docResult.rows[0]?.total_size || 0)
      };
    }
    
    // Task Manager summary
    if (enabledSlugs.includes('task-manager')) {
      const taskResult = await pool.query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status != 'Completed' AND due_date < NOW()) as overdue_tasks,
          COUNT(*) FILTER (WHERE status = 'To Do') as todo_count,
          COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_count,
          COUNT(*) FILTER (WHERE status = 'Review') as review_count,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed_count
        FROM tasks WHERE org_id = $1
      `, [req.orgId]);
      
      const stats = taskResult.rows[0];
      summary['task-manager'] = {
        totalTasks: parseInt(stats.total_tasks || 0),
        overdueTasks: parseInt(stats.overdue_tasks || 0),
        statusBreakdown: {
          todo: parseInt(stats.todo_count || 0),
          inProgress: parseInt(stats.in_progress_count || 0),
          review: parseInt(stats.review_count || 0),
          completed: parseInt(stats.completed_count || 0)
        }
      };
    }
    
    // Expense Manager summary
    if (enabledSlugs.includes('expense-manager')) {
      const expResult = await pool.query(`
        SELECT 
          COUNT(*) as total_expenses,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as approved_total,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_total
        FROM expenses WHERE org_id = $1
      `, [req.orgId]);

      const topCat = await pool.query(`
        SELECT ec.name, COUNT(*) as count
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.org_id = $1 AND e.status = 'approved'
        GROUP BY ec.id, ec.name
        ORDER BY count DESC
        LIMIT 1
      `, [req.orgId]);

      const stats = expResult.rows[0];
      summary['expense-manager'] = {
        totalExpenses: parseInt(stats.total_expenses || 0),
        pendingCount: parseInt(stats.pending_count || 0),
        approvedCount: parseInt(stats.approved_count || 0),
        approvedTotal: parseFloat(stats.approved_total || 0),
        pendingTotal: parseFloat(stats.pending_total || 0),
        topCategory: topCat.rows[0]?.name || null
      };
    }
    
    res.json(summary);
  } catch (error) {
    console.error('Plugs summary error:', error);
    res.status(500).json({ error: 'Failed to get plug summaries' });
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
