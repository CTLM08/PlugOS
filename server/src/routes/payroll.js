import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Payroll Manager plug is enabled
const checkPlugEnabled = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT op.id FROM org_plugs op
      JOIN plugs p ON op.plug_id = p.id
      WHERE op.org_id = $1 AND p.slug = 'payroll-manager'
    `, [req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Payroll Manager plug is not enabled' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
};

// ==================== EMPLOYEE SALARIES ====================

// Get all employee salaries
router.get('/org/:orgId/salaries', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        es.*,
        u.name as user_name,
        u.email as user_email
      FROM employee_salaries es
      JOIN users u ON es.user_id = u.id
      WHERE es.org_id = $1
      ORDER BY u.name
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({ error: 'Failed to get salaries' });
  }
});

// Get employees without salary configured
router.get('/org/:orgId/employees-without-salary', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      JOIN org_members om ON u.id = om.user_id
      LEFT JOIN employee_salaries es ON u.id = es.user_id AND es.org_id = $1
      WHERE om.org_id = $1 AND es.id IS NULL
      ORDER BY u.name
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees without salary error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// Set/create employee salary
router.post('/org/:orgId/salaries', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { user_id, base_salary, hourly_rate, currency, effective_date } = req.body;
    
    if (!user_id || base_salary === undefined) {
      return res.status(400).json({ error: 'User ID and base salary are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO employee_salaries (org_id, user_id, base_salary, hourly_rate, currency, effective_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (org_id, user_id) 
      DO UPDATE SET 
        base_salary = EXCLUDED.base_salary,
        hourly_rate = EXCLUDED.hourly_rate,
        currency = EXCLUDED.currency,
        effective_date = EXCLUDED.effective_date,
        updated_at = NOW()
      RETURNING *
    `, [req.orgId, user_id, base_salary, hourly_rate || 0, currency || 'MYR', effective_date || new Date()]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Set salary error:', error);
    res.status(500).json({ error: 'Failed to set salary' });
  }
});

// Update employee salary
router.put('/org/:orgId/salaries/:id', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { base_salary, hourly_rate, currency, effective_date } = req.body;
    
    const result = await pool.query(`
      UPDATE employee_salaries
      SET base_salary = COALESCE($1, base_salary),
          hourly_rate = COALESCE($2, hourly_rate),
          currency = COALESCE($3, currency),
          effective_date = COALESCE($4, effective_date),
          updated_at = NOW()
      WHERE id = $5 AND org_id = $6
      RETURNING *
    `, [base_salary, hourly_rate, currency, effective_date, id, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary record not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ error: 'Failed to update salary' });
  }
});

// Delete employee salary
router.delete('/org/:orgId/salaries/:id', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM employee_salaries WHERE id = $1 AND org_id = $2 RETURNING id
    `, [id, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary record not found' });
    }
    
    res.json({ message: 'Salary deleted' });
  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({ error: 'Failed to delete salary' });
  }
});

// ==================== PAYROLL PERIODS ====================

// Get all payroll periods
router.get('/org/:orgId/periods', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pp.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM payslips ps WHERE ps.period_id = pp.id) as payslip_count
      FROM payroll_periods pp
      LEFT JOIN users u ON pp.created_by = u.id
      WHERE pp.org_id = $1
      ORDER BY pp.start_date DESC
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ error: 'Failed to get payroll periods' });
  }
});

// Create payroll period
router.post('/org/:orgId/periods', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, start date, and end date are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO payroll_periods (org_id, name, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.orgId, name, start_date, end_date, req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create period error:', error);
    res.status(500).json({ error: 'Failed to create payroll period' });
  }
});

// Update payroll period
router.put('/org/:orgId/periods/:id', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;
    
    // Check if period is finalized
    const existing = await pool.query(`
      SELECT status FROM payroll_periods WHERE id = $1 AND org_id = $2
    `, [id, req.orgId]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll period not found' });
    }
    
    if (existing.rows[0].status === 'finalized') {
      return res.status(400).json({ error: 'Cannot modify finalized payroll period' });
    }
    
    const result = await pool.query(`
      UPDATE payroll_periods
      SET name = COALESCE($1, name),
          start_date = COALESCE($2, start_date),
          end_date = COALESCE($3, end_date)
      WHERE id = $4 AND org_id = $5
      RETURNING *
    `, [name, start_date, end_date, id, req.orgId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update period error:', error);
    res.status(500).json({ error: 'Failed to update payroll period' });
  }
});

// Delete payroll period
router.delete('/org/:orgId/periods/:id', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if period is finalized
    const existing = await pool.query(`
      SELECT status FROM payroll_periods WHERE id = $1 AND org_id = $2
    `, [id, req.orgId]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll period not found' });
    }
    
    if (existing.rows[0].status === 'finalized') {
      return res.status(400).json({ error: 'Cannot delete finalized payroll period' });
    }
    
    await pool.query(`DELETE FROM payroll_periods WHERE id = $1`, [id]);
    
    res.json({ message: 'Payroll period deleted' });
  } catch (error) {
    console.error('Delete period error:', error);
    res.status(500).json({ error: 'Failed to delete payroll period' });
  }
});

// Generate payslips for a period
router.post('/org/:orgId/periods/:id/generate', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Get period info
    const periodResult = await client.query(`
      SELECT * FROM payroll_periods WHERE id = $1 AND org_id = $2
    `, [id, req.orgId]);
    
    if (periodResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payroll period not found' });
    }
    
    const period = periodResult.rows[0];
    
    if (period.status === 'finalized') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot regenerate payslips for finalized period' });
    }
    
    // Delete existing payslips for this period (regenerate)
    await client.query(`DELETE FROM payslips WHERE period_id = $1`, [id]);
    
    // Get all employees with salary configured
    const salariesResult = await client.query(`
      SELECT es.*, u.name as user_name
      FROM employee_salaries es
      JOIN users u ON es.user_id = u.id
      WHERE es.org_id = $1
    `, [req.orgId]);
    
    const payslips = [];
    
    for (const salary of salariesResult.rows) {
      // Calculate hours worked from attendance records
      const attendanceResult = await client.query(`
        SELECT 
          SUM(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600) as total_hours
        FROM attendance_records
        WHERE org_id = $1 
          AND user_id = $2 
          AND clock_in >= $3 
          AND clock_in <= $4
          AND clock_out IS NOT NULL
      `, [req.orgId, salary.user_id, period.start_date, period.end_date]);
      
      const hoursWorked = parseFloat(attendanceResult.rows[0]?.total_hours || 0);
      
      // Calculate pay (assuming 160 standard hours per month)
      const standardHours = 160;
      const overtimeHours = Math.max(0, hoursWorked - standardHours);
      const overtimePay = overtimeHours * parseFloat(salary.hourly_rate || 0);
      const baseSalary = parseFloat(salary.base_salary);
      const grossPay = baseSalary + overtimePay;
      const netPay = grossPay; // No deductions for now
      
      // Insert payslip
      const payslipResult = await client.query(`
        INSERT INTO payslips (org_id, user_id, period_id, base_salary, hours_worked, overtime_hours, overtime_pay, gross_pay, net_pay)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [req.orgId, salary.user_id, id, baseSalary, hoursWorked, overtimeHours, overtimePay, grossPay, netPay]);
      
      payslips.push({
        ...payslipResult.rows[0],
        user_name: salary.user_name
      });
    }
    
    // Update period status to processing
    await client.query(`
      UPDATE payroll_periods SET status = 'processing' WHERE id = $1
    `, [id]);
    
    await client.query('COMMIT');
    
    res.json({ 
      message: `Generated ${payslips.length} payslips`,
      payslips 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Generate payslips error:', error);
    res.status(500).json({ error: 'Failed to generate payslips' });
  } finally {
    client.release();
  }
});

// Finalize payroll period
router.post('/org/:orgId/periods/:id/finalize', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if payslips exist
    const payslipCount = await pool.query(`
      SELECT COUNT(*) as count FROM payslips WHERE period_id = $1
    `, [id]);
    
    if (parseInt(payslipCount.rows[0].count) === 0) {
      return res.status(400).json({ error: 'Generate payslips before finalizing' });
    }
    
    const result = await pool.query(`
      UPDATE payroll_periods
      SET status = 'finalized', finalized_at = NOW()
      WHERE id = $1 AND org_id = $2 AND status != 'finalized'
      RETURNING *
    `, [id, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll period not found or already finalized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Finalize period error:', error);
    res.status(500).json({ error: 'Failed to finalize payroll period' });
  }
});

// ==================== PAYSLIPS ====================

// Get my payslips
router.get('/org/:orgId/my-payslips', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.*,
        pp.name as period_name,
        pp.start_date as period_start,
        pp.end_date as period_end,
        pp.status as period_status
      FROM payslips ps
      JOIN payroll_periods pp ON ps.period_id = pp.id
      WHERE ps.org_id = $1 AND ps.user_id = $2
      ORDER BY pp.start_date DESC
    `, [req.orgId, req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get my payslips error:', error);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

// Get payslips for a period (admin only)
router.get('/org/:orgId/periods/:periodId/payslips', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { periodId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        ps.*,
        u.name as user_name,
        u.email as user_email
      FROM payslips ps
      JOIN users u ON ps.user_id = u.id
      WHERE ps.period_id = $1 AND ps.org_id = $2
      ORDER BY u.name
    `, [periodId, req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get period payslips error:', error);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

// Update payslip (add bonuses/deductions)
router.put('/org/:orgId/payslips/:id', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { deductions, bonuses, notes } = req.body;
    
    // Check if period is finalized
    const existing = await pool.query(`
      SELECT ps.*, pp.status as period_status
      FROM payslips ps
      JOIN payroll_periods pp ON ps.period_id = pp.id
      WHERE ps.id = $1 AND ps.org_id = $2
    `, [id, req.orgId]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    
    if (existing.rows[0].period_status === 'finalized') {
      return res.status(400).json({ error: 'Cannot modify payslip in finalized period' });
    }
    
    const payslip = existing.rows[0];
    const newDeductions = deductions !== undefined ? parseFloat(deductions) : parseFloat(payslip.deductions);
    const newBonuses = bonuses !== undefined ? parseFloat(bonuses) : parseFloat(payslip.bonuses);
    const grossPay = parseFloat(payslip.base_salary) + parseFloat(payslip.overtime_pay) + newBonuses;
    const netPay = grossPay - newDeductions;
    
    const result = await pool.query(`
      UPDATE payslips
      SET deductions = $1,
          bonuses = $2,
          gross_pay = $3,
          net_pay = $4,
          notes = COALESCE($5, notes)
      WHERE id = $6
      RETURNING *
    `, [newDeductions, newBonuses, grossPay, netPay, notes, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update payslip error:', error);
    res.status(500).json({ error: 'Failed to update payslip' });
  }
});

export default router;
