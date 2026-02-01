import express from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check org membership
const checkOrgMember = async (req, res, next) => {
  const { orgId } = req.params;
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      'SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2',
      [userId, orgId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    req.orgRole = rows[0].role;
    next();
  } catch (error) {
    console.error('Error checking org membership:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all documents for an organization
router.get('/org/:orgId', authenticate, checkOrgMember, async (req, res) => {
  const { orgId } = req.params;
  const { folderId } = req.query;
  const userId = req.user.id;

  try {
    // If accessing a specific folder and user is an employee, check permissions
    if (folderId && req.orgRole === 'employee') {
      // Get user's department
      const memberResult = await pool.query(
        'SELECT department_id FROM org_members WHERE user_id = $1 AND org_id = $2',
        [userId, orgId]
      );
      const userDeptId = memberResult.rows[0]?.department_id;

      // Check if folder has permissions set
      const permResult = await pool.query(
        'SELECT COUNT(*) as perm_count FROM folder_permissions WHERE folder_id = $1',
        [folderId]
      );
      const hasPermissions = parseInt(permResult.rows[0].perm_count) > 0;

      if (hasPermissions) {
        // Check if user has access
        const accessResult = await pool.query(
          `SELECT 1 FROM folder_permissions 
           WHERE folder_id = $1 
             AND (user_id = $2 OR ($3::uuid IS NOT NULL AND department_id = $3))
           LIMIT 1`,
          [folderId, userId, userDeptId]
        );

        if (accessResult.rows.length === 0) {
          return res.status(403).json({ error: 'You do not have permission to access this folder' });
        }
      }
    }

    let query = `
      SELECT d.*, u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.org_id = $1
    `;
    const params = [orgId];

    if (folderId) {
      query += ' AND d.folder_id = $2';
      params.push(folderId);
    } else {
      query += ' AND d.folder_id IS NULL';
    }

    query += ' ORDER BY d.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get all folders for an organization (filtered by permissions)
router.get('/org/:orgId/folders', authenticate, checkOrgMember, async (req, res) => {
  const { orgId } = req.params;
  const userId = req.user.id;

  try {
    // If admin or manager, return all folders
    if (req.orgRole === 'admin' || req.orgRole === 'manager') {
      const { rows } = await pool.query(
        `SELECT f.*, u.name as created_by_name,
          (SELECT COUNT(*) FROM documents WHERE folder_id = f.id) as document_count
         FROM document_folders f
         LEFT JOIN users u ON f.created_by = u.id
         WHERE f.org_id = $1
         ORDER BY f.name ASC`,
        [orgId]
      );
      return res.json(rows);
    }

    // For employees, get their department
    const memberResult = await pool.query(
      'SELECT department_id FROM org_members WHERE user_id = $1 AND org_id = $2',
      [userId, orgId]
    );
    const userDeptId = memberResult.rows[0]?.department_id;

    // Get folders that have:
    // 1. No permissions set (accessible to all), OR
    // 2. User has direct permission, OR
    // 3. User's department has permission
    const { rows } = await pool.query(
      `SELECT DISTINCT f.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM documents WHERE folder_id = f.id) as document_count
       FROM document_folders f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.org_id = $1
         AND (
           -- No permissions set (folder is open to all)
           NOT EXISTS (SELECT 1 FROM folder_permissions WHERE folder_id = f.id)
           -- Or user has direct permission
           OR EXISTS (SELECT 1 FROM folder_permissions WHERE folder_id = f.id AND user_id = $2)
           -- Or user's department has permission
           OR ($3::uuid IS NOT NULL AND EXISTS (SELECT 1 FROM folder_permissions WHERE folder_id = f.id AND department_id = $3))
         )
       ORDER BY f.name ASC`,
      [orgId, userId, userDeptId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Get document metadata
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT d.*, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Download document content
router.get('/:id/download', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT d.name, d.file_type, dc.content
       FROM documents d
       JOIN document_content dc ON dc.document_id = d.id
       WHERE d.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = rows[0];
    res.json({
      name: doc.name,
      fileType: doc.file_type,
      content: doc.content
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Upload a new document
router.post('/org/:orgId', authenticate, checkOrgMember, async (req, res) => {
  const { orgId } = req.params;
  const { name, fileType, fileSize, content, folderId } = req.body;
  const userId = req.user.id;

  // Check if user is admin or manager
  if (req.orgRole === 'employee') {
    return res.status(403).json({ error: 'Only admins and managers can upload documents' });
  }

  // Validate file size (5MB limit)
  if (fileSize > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File size exceeds 5MB limit' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert document metadata
      const docResult = await client.query(
        `INSERT INTO documents (org_id, folder_id, name, file_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [orgId, folderId || null, name, fileType, fileSize, userId]
      );

      const document = docResult.rows[0];

      // Insert document content
      await client.query(
        `INSERT INTO document_content (document_id, content)
         VALUES ($1, $2)`,
        [document.id, content]
      );

      await client.query('COMMIT');

      res.status(201).json(document);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Create a new folder
router.post('/org/:orgId/folders', authenticate, checkOrgMember, async (req, res) => {
  const { orgId } = req.params;
  const { name, parentId } = req.body;
  const userId = req.user.id;

  // Check if user is admin or manager
  if (req.orgRole === 'employee') {
    return res.status(403).json({ error: 'Only admins and managers can create folders' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO document_folders (org_id, name, parent_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [orgId, name, parentId || null, userId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update document (move to folder, rename)
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, folderId } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE documents 
       SET name = COALESCE($1, name), 
           folder_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name, folderId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the document to check ownership and org membership
    const docResult = await pool.query(
      'SELECT org_id, uploaded_by FROM documents WHERE id = $1', 
      [id]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    const orgId = doc.org_id;
    const isOwner = doc.uploaded_by === req.user.id;

    // Check user's role in the org
    const memberResult = await pool.query(
      'SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2',
      [req.user.id, orgId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const isAdminOrManager = memberResult.rows[0].role !== 'employee';

    // Allow deletion if user is admin/manager OR if they are the owner
    if (!isAdminOrManager && !isOwner) {
      return res.status(403).json({ error: 'You can only delete documents you uploaded' });
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Delete folder
router.delete('/folders/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the folder to check org membership
    const folderResult = await pool.query('SELECT org_id FROM document_folders WHERE id = $1', [id]);
    
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const orgId = folderResult.rows[0].org_id;

    // Check if user is admin or manager
    const memberResult = await pool.query(
      'SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2',
      [req.user.id, orgId]
    );

    if (memberResult.rows.length === 0 || memberResult.rows[0].role === 'employee') {
      return res.status(403).json({ error: 'Only admins and managers can delete folders' });
    }

    await pool.query('DELETE FROM document_folders WHERE id = $1', [id]);
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Get document summary for dashboard
router.get('/org/:orgId/summary', authenticate, checkOrgMember, async (req, res) => {
  const { orgId } = req.params;

  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(DISTINCT folder_id) as total_folders,
        COALESCE(SUM(file_size), 0) as total_size
      FROM documents
      WHERE org_id = $1
    `, [orgId]);

    const recent = await pool.query(`
      SELECT name, file_type, created_at
      FROM documents
      WHERE org_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `, [orgId]);

    res.json({
      totalDocuments: parseInt(stats.rows[0].total_documents),
      totalFolders: parseInt(stats.rows[0].total_folders),
      totalSize: parseInt(stats.rows[0].total_size),
      recentDocuments: recent.rows
    });
  } catch (error) {
    console.error('Error fetching document summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Get folder permissions
router.get('/folders/:id/permissions', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT fp.*, 
        d.name as department_name,
        u.name as user_name, u.email as user_email
      FROM folder_permissions fp
      LEFT JOIN departments d ON fp.department_id = d.id
      LEFT JOIN users u ON fp.user_id = u.id
      WHERE fp.folder_id = $1
      ORDER BY fp.created_at DESC
    `, [id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching folder permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Add folder permission (admin only)
router.post('/folders/:id/permissions', authenticate, async (req, res) => {
  const { id } = req.params;
  const { departmentId, userId } = req.body;

  if (!departmentId && !userId) {
    return res.status(400).json({ error: 'Must specify either departmentId or userId' });
  }

  if (departmentId && userId) {
    return res.status(400).json({ error: 'Cannot specify both departmentId and userId' });
  }

  try {
    // Check folder exists and get org_id
    const folderResult = await pool.query('SELECT org_id FROM document_folders WHERE id = $1', [id]);
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const orgId = folderResult.rows[0].org_id;

    // Check if user is admin
    const memberResult = await pool.query(
      'SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2',
      [req.user.id, orgId]
    );

    if (memberResult.rows.length === 0 || memberResult.rows[0].role === 'employee') {
      return res.status(403).json({ error: 'Only admins and managers can manage permissions' });
    }

    // Insert permission
    const { rows } = await pool.query(`
      INSERT INTO folder_permissions (folder_id, department_id, user_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, departmentId || null, userId || null]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error adding folder permission:', error);
    res.status(500).json({ error: 'Failed to add permission' });
  }
});

// Remove folder permission (admin only)
router.delete('/folders/:folderId/permissions/:permId', authenticate, async (req, res) => {
  const { folderId, permId } = req.params;

  try {
    // Check folder exists and get org_id
    const folderResult = await pool.query('SELECT org_id FROM document_folders WHERE id = $1', [folderId]);
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const orgId = folderResult.rows[0].org_id;

    // Check if user is admin
    const memberResult = await pool.query(
      'SELECT role FROM org_members WHERE user_id = $1 AND org_id = $2',
      [req.user.id, orgId]
    );

    if (memberResult.rows.length === 0 || memberResult.rows[0].role === 'employee') {
      return res.status(403).json({ error: 'Only admins and managers can manage permissions' });
    }

    await pool.query('DELETE FROM folder_permissions WHERE id = $1', [permId]);
    res.json({ message: 'Permission removed successfully' });
  } catch (error) {
    console.error('Error removing folder permission:', error);
    res.status(500).json({ error: 'Failed to remove permission' });
  }
});

export default router;

