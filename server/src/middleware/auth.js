import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user belongs to organization
export const requireOrg = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.body.orgId || req.headers['x-org-id'];
    
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }
    
    const result = await pool.query(
      'SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2',
      [req.user.id, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }
    
    req.orgId = orgId;
    req.orgRole = result.rows[0].role;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Organization check failed' });
  }
};

// Role-based access control
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.orgRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
