import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register new user + create organization
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, orgName } = req.body;
    
    // Validate input
    if (!email || !password || !name || !orgName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create slug from org name
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if slug exists
    const existingOrg = await pool.query(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug]
    );
    
    if (existingOrg.rows.length > 0) {
      return res.status(400).json({ error: 'Organization name already taken' });
    }
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, passwordHash, name]
      );
      const user = userResult.rows[0];
      
      // Create organization
      const orgResult = await client.query(
        'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
        [orgName, slug]
      );
      const org = orgResult.rows[0];
      
      // Add user as admin of organization
      await client.query(
        'INSERT INTO org_members (user_id, org_id, role) VALUES ($1, $2, $3)',
        [user.id, org.id, 'admin']
      );
      
      await client.query('COMMIT');
      
      // Generate JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
        organization: org,
        token
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Get user
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get user's organizations
    const orgsResult = await pool.query(`
      SELECT o.id, o.name, o.slug, om.role 
      FROM organizations o 
      JOIN org_members om ON o.id = om.org_id 
      WHERE om.user_id = $1
    `, [user.id]);
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      organizations: orgsResult.rows,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    // Get user's organizations with department info
    const orgsResult = await pool.query(`
      SELECT o.id, o.name, o.slug, om.role, om.department_id, d.name as department_name
      FROM organizations o 
      JOIN org_members om ON o.id = om.org_id 
      LEFT JOIN departments d ON om.department_id = d.id
      WHERE om.user_id = $1
    `, [req.user.id]);
    
    const organizations = orgsResult.rows.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: org.role,
      department: org.department_id ? {
        id: org.department_id,
        name: org.department_name
      } : null
    }));
    
    res.json({
      user: req.user,
      organizations
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Employee registration (join existing organization via invite)
router.post('/join', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check for valid invite
    const inviteResult = await pool.query(`
      SELECT 
        ei.id as invite_id,
        ei.org_id,
        ei.role,
        ei.department_id,
        o.name as org_name,
        o.slug as org_slug,
        d.name as department_name
      FROM employee_invites ei
      JOIN organizations o ON ei.org_id = o.id
      LEFT JOIN departments d ON ei.department_id = d.id
      WHERE LOWER(ei.email) = LOWER($1) AND ei.registered_at IS NULL
    `, [email]);
    
    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'No invite found for this email. Please contact your organization admin.' 
      });
    }
    
    const invite = inviteResult.rows[0];
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase(), passwordHash, name]
      );
      const user = userResult.rows[0];
      
      // Add user to organization with role and department from invite
      await client.query(
        'INSERT INTO org_members (user_id, org_id, role, department_id) VALUES ($1, $2, $3, $4)',
        [user.id, invite.org_id, invite.role, invite.department_id]
      );
      
      // Mark invite as registered
      await client.query(
        'UPDATE employee_invites SET registered_at = CURRENT_TIMESTAMP WHERE id = $1',
        [invite.invite_id]
      );
      
      await client.query('COMMIT');
      
      // Generate JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
        organization: { 
          id: invite.org_id, 
          name: invite.org_name, 
          slug: invite.org_slug,
          role: invite.role
        },
        department: invite.department_id ? {
          id: invite.department_id,
          name: invite.department_name
        } : null,
        token
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Change password (requires current password for security)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }
    
    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
