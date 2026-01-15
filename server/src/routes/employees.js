import express from 'express';
import pool from '../config/db.js';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Employee Directory plug is enabled
const checkPlugEnabled = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT op.id FROM org_plugs op
      JOIN plugs p ON op.plug_id = p.id
      WHERE op.org_id = $1 AND p.slug = 'employee-directory'
    `, [req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Employee Directory plug is not enabled' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check plug status' });
  }
};

// Get all employees for organization
router.get('/org/:orgId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const { search, department } = req.query;
    
    let query = 'SELECT * FROM employees WHERE org_id = $1';
    const params = [req.orgId];
    
    if (search) {
      query += ' AND (name ILIKE $2 OR email ILIKE $2 OR position ILIKE $2)';
      params.push(`%${search}%`);
    }
    
    if (department) {
      query += ` AND department = $${params.length + 1}`;
      params.push(department);
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

// Get single employee
router.get('/org/:orgId/:employeeId', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND org_id = $2',
      [req.params.employeeId, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get employee' });
  }
});

// Create employee (admin/manager only) - optionally create user account
router.post('/org/:orgId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, phone, department, position, avatar_url, createAccount, role, department_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // If creating an account, email is required
    if (createAccount && !email) {
      return res.status(400).json({ error: 'Email is required to create a user account' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create employee record
      const empResult = await client.query(`
        INSERT INTO employees (org_id, name, email, phone, department, position, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [req.orgId, name, email, phone, department, position, avatar_url]);
      
      const employee = empResult.rows[0];
      let generatedPassword = null;
      let userId = null;
      
      // Create user account if requested
      if (createAccount && email) {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [email.toLowerCase()]
        );
        
        if (existingUser.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'A user account with this email already exists' });
        }
        
        // Generate random password (8 chars alphanumeric)
        generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
        
        // Import bcrypt dynamically
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.default.hash(generatedPassword, 10);
        
        // Create user
        const userResult = await client.query(
          'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id',
          [email.toLowerCase(), passwordHash, name]
        );
        userId = userResult.rows[0].id;
        
        // Add to organization
        await client.query(
          'INSERT INTO org_members (user_id, org_id, role, department_id) VALUES ($1, $2, $3, $4)',
          [userId, req.orgId, role || 'employee', department_id || null]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        ...employee,
        account_created: createAccount && email,
        generated_password: generatedPassword,
        user_id: userId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee (admin/manager only)
router.put('/org/:orgId/:employeeId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, phone, department, position, avatar_url } = req.body;
    const { employeeId } = req.params;
    
    const result = await pool.query(`
      UPDATE employees 
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          department = COALESCE($4, department),
          position = COALESCE($5, position),
          avatar_url = COALESCE($6, avatar_url)
      WHERE id = $7 AND org_id = $8
      RETURNING *
    `, [name, email, phone, department, position, avatar_url, employeeId, req.orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee (admin/manager only)
router.delete('/org/:orgId/:employeeId', authenticate, requireOrg, checkPlugEnabled, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.employeeId, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Get departments list
router.get('/org/:orgId/departments', authenticate, requireOrg, checkPlugEnabled, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT department FROM employees WHERE org_id = $1 AND department IS NOT NULL ORDER BY department',
      [req.orgId]
    );
    
    res.json(result.rows.map(r => r.department));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

// Reset employee password (admin only) - generates new secure random password
router.post('/org/:orgId/:employeeId/reset-password', authenticate, requireOrg, checkPlugEnabled, requireRole('admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Get employee to find their email
    const empResult = await pool.query(
      'SELECT email FROM employees WHERE id = $1 AND org_id = $2',
      [employeeId, req.orgId]
    );
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeEmail = empResult.rows[0].email;
    
    if (!employeeEmail) {
      return res.status(400).json({ error: 'Employee does not have an email address' });
    }
    
    // Find user with this email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [employeeEmail]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'No user account found for this employee' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Generate secure random password (12 chars with mixed case, numbers, and special chars)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let newPassword = '';
    
    // Ensure at least one of each required type
    newPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    newPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    newPassword += '0123456789'[Math.floor(Math.random() * 10)];
    newPassword += '!@#$%'[Math.floor(Math.random() * 5)];
    
    // Fill rest randomly
    for (let i = 0; i < 8; i++) {
      newPassword += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    newPassword = newPassword.split('').sort(() => Math.random() - 0.5).join('');
    
    // Hash and update password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(newPassword, 12);
    
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
    
    // Return the new password (admin should securely share this with employee)
    res.json({ 
      message: 'Password reset successfully',
      newPassword,
      warning: 'Please securely share this password with the employee. They should change it after first login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
