import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Expense Manager plug is enabled
const checkPlugEnabled = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT op.id FROM org_plugs op
      JOIN plugs p ON op.plug_id = p.id
      WHERE op.org_id = $1 AND p.slug = 'expense-manager'
    `, [req.orgId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Expense Manager plug is not enabled' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
};

// ==================== EXPENSE CATEGORIES ====================

// Get all expense categories for an org
router.get('/org/:orgId/categories', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ec.*, 
        (SELECT COUNT(*) FROM expenses e WHERE e.category_id = ec.id) as expense_count
      FROM expense_categories ec
      WHERE ec.org_id = $1
      ORDER BY ec.name
    `, [req.orgId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({ error: 'Failed to get expense categories' });
  }
});

// Create expense category (admin only)
router.post('/org/:orgId/categories', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(`
      INSERT INTO expense_categories (org_id, name, icon)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.orgId, name.trim(), icon || 'mdi:tag']);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    console.error('Create expense category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Delete expense category (admin only)
router.delete('/org/:orgId/categories/:id', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM expense_categories WHERE id = $1 AND org_id = $2 RETURNING id
    `, [id, req.orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete expense category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ==================== EXPENSES ====================

// Get all expenses for an org (admin/manager only)
router.get('/org/:orgId/expenses', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { status, category_id } = req.query;

    let query = `
      SELECT e.*, 
        u.name as user_name, u.email as user_email,
        ec.name as category_name, ec.icon as category_icon,
        r.name as reviewer_name
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE e.org_id = $1
    `;
    const params = [req.orgId];
    let paramIndex = 2;

    if (status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category_id) {
      query += ` AND e.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    query += ` ORDER BY e.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Get my expenses
router.get('/org/:orgId/my-expenses', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
        ec.name as category_name, ec.icon as category_icon,
        r.name as reviewer_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE e.org_id = $1 AND e.user_id = $2
      ORDER BY e.created_at DESC
    `, [req.orgId, req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get my expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Submit a new expense
router.post('/org/:orgId/expenses', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { title, description, amount, currency, expense_date, category_id, receipt_data } = req.body;

    if (!title || !amount || !expense_date) {
      return res.status(400).json({ error: 'Title, amount, and expense date are required' });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const result = await pool.query(`
      INSERT INTO expenses (org_id, user_id, title, description, amount, currency, expense_date, category_id, receipt_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.orgId, req.user.id, title.trim(), description || null, amount, currency || 'MYR', expense_date, category_id || null, receipt_data || null]);

    // Send notification to admins
    try {
      const admins = await pool.query(`
        SELECT user_id FROM org_members WHERE org_id = $1 AND role = 'admin' AND user_id != $2
      `, [req.orgId, req.user.id]);

      for (const admin of admins.rows) {
        await pool.query(`
          INSERT INTO notifications (user_id, org_id, type, title, message, actor_id, link)
          VALUES ($1, $2, 'expense_submitted', 'New Expense Claim', $3, $4, '/expenses')
        `, [admin.user_id, req.orgId, `${req.user.name} submitted an expense claim: ${title.trim()} (${currency || 'MYR'} ${amount})`, req.user.id]);
      }
    } catch (notifError) {
      console.error('Failed to send expense notification:', notifError);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update own expense (only if still pending)
router.put('/org/:orgId/expenses/:id', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, currency, expense_date, category_id, receipt_data } = req.body;

    // Check ownership and status
    const existing = await pool.query(`
      SELECT * FROM expenses WHERE id = $1 AND org_id = $2
    `, [id, req.orgId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own expenses' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only edit pending expenses' });
    }

    const result = await pool.query(`
      UPDATE expenses
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          amount = COALESCE($3, amount),
          currency = COALESCE($4, currency),
          expense_date = COALESCE($5, expense_date),
          category_id = $6,
          receipt_data = $7,
          updated_at = NOW()
      WHERE id = $8 AND org_id = $9
      RETURNING *
    `, [title, description, amount, currency, expense_date, category_id || null, receipt_data !== undefined ? receipt_data : existing.rows[0].receipt_data, id, req.orgId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete own expense (only if still pending)
router.delete('/org/:orgId/expenses/:id', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(`
      SELECT * FROM expenses WHERE id = $1 AND org_id = $2
    `, [id, req.orgId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (existing.rows[0].user_id !== req.user.id && req.orgRole !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own expenses' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only delete pending expenses' });
    }

    await pool.query(`DELETE FROM expenses WHERE id = $1`, [id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Approve or reject an expense (admin/manager only)
router.put('/org/:orgId/expenses/:id/review', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const existing = await pool.query(`
      SELECT e.*, u.name as user_name FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1 AND e.org_id = $2
    `, [id, req.orgId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (existing.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Expense has already been reviewed' });
    }

    const result = await pool.query(`
      UPDATE expenses
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
      WHERE id = $4 AND org_id = $5
      RETURNING *
    `, [status, req.user.id, review_notes || null, id, req.orgId]);

    // Send notification to expense owner
    try {
      const expense = existing.rows[0];
      const statusText = status === 'approved' ? 'approved ✓' : 'rejected ✗';
      await pool.query(`
        INSERT INTO notifications (user_id, org_id, type, title, message, actor_id, link)
        VALUES ($1, $2, 'expense_reviewed', 'Expense ${statusText}', $3, $4, '/expenses')
      `, [expense.user_id, req.orgId, `Your expense "${expense.title}" has been ${statusText} by ${req.user.name}`, req.user.id]);
    } catch (notifError) {
      console.error('Failed to send review notification:', notifError);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Review expense error:', error);
    res.status(500).json({ error: 'Failed to review expense' });
  }
});

// ==================== ANALYTICS ====================

// Get expense analytics (admin/manager only)
router.get('/org/:orgId/analytics', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { period, start_date, end_date } = req.query; // period: 'day', 'month' or 'year'; start_date/end_date: 'YYYY-MM'
    const isYearly = period === 'year';
    const isDaily = period === 'day';

    const dateFormat = isYearly ? 'YYYY' : isDaily ? 'YYYY-MM-DD' : 'YYYY-MM';
    const labelFormat = isYearly ? 'YYYY' : isDaily ? 'DD Mon' : 'Mon YYYY';

    // Build date range filter
    let dateFilter = '';
    const baseParams = [req.orgId, dateFormat, labelFormat];
    let paramIdx = 4;

    if (start_date && end_date) {
      // Custom range: start_date and end_date are 'YYYY-MM', e.g. '2025-01'
      dateFilter = ` AND expense_date >= ($${paramIdx}::date) AND expense_date < (($${paramIdx + 1}::date) + INTERVAL '1 month')`;
      baseParams.push(`${start_date}-01`, `${end_date}-01`);
      paramIdx += 2;
    } else {
      // Default lookback
      dateFilter = isYearly
        ? ` AND expense_date >= NOW() - INTERVAL '5 years'`
        : isDaily
          ? ` AND expense_date >= NOW() - INTERVAL '30 days'`
          : ` AND expense_date >= NOW() - INTERVAL '12 months'`;
    }

    // Get expense totals grouped by period
    const chartData = await pool.query(`
      SELECT 
        TO_CHAR(expense_date, $2) as period_key,
        TO_CHAR(expense_date, $3) as label,
        SUM(amount) FILTER (WHERE status = 'approved') as approved_total,
        SUM(amount) FILTER (WHERE status = 'pending') as pending_total,
        SUM(amount) FILTER (WHERE status = 'rejected') as rejected_total,
        SUM(amount) as total,
        COUNT(*) as count
      FROM expenses
      WHERE org_id = $1${dateFilter}
      GROUP BY period_key, label
      ORDER BY period_key
    `, baseParams);

    // Build simpler date filter for summary / top queries (only orgId + dates)
    let simpleDateFilter = '';
    const summaryParams = [req.orgId];
    let sParamIdx = 2;
    if (start_date && end_date) {
      simpleDateFilter = ` AND expense_date >= ($${sParamIdx}::date) AND expense_date < (($${sParamIdx + 1}::date) + INTERVAL '1 month')`;
      summaryParams.push(`${start_date}-01`, `${end_date}-01`);
      sParamIdx += 2;
    }

    // Get overall summary stats
    const summary = await pool.query(`
      SELECT
        COUNT(*) as total_expenses,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as approved_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
        COALESCE(AVG(amount) FILTER (WHERE status = 'approved'), 0) as avg_approved
      FROM expenses
      WHERE org_id = $1${simpleDateFilter}
    `, summaryParams);

    // Get top categories
    const topCategories = await pool.query(`
      SELECT 
        ec.name, ec.icon,
        COUNT(*) as count,
        SUM(e.amount) as total
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.org_id = $1 AND e.status = 'approved'${simpleDateFilter.replace(/expense_date/g, 'e.expense_date')}
      GROUP BY ec.id, ec.name, ec.icon
      ORDER BY total DESC
      LIMIT 5
    `, summaryParams);

    // Get top spenders
    const topSpenders = await pool.query(`
      SELECT 
        u.name,
        COUNT(*) as count,
        SUM(e.amount) as total
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE e.org_id = $1 AND e.status = 'approved'${simpleDateFilter.replace(/expense_date/g, 'e.expense_date')}
      GROUP BY u.id, u.name
      ORDER BY total DESC
      LIMIT 5
    `, summaryParams);

    res.json({
      chart: chartData.rows,
      summary: summary.rows[0],
      topCategories: topCategories.rows,
      topSpenders: topSpenders.rows
    });
  } catch (error) {
    console.error('Expense analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
