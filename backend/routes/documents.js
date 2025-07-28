const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { getRow, getRows, runQuery } = require('../database/init');
const { requirePermission, getUserContext } = require('../middleware/privilege');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Helper function to encrypt file content
const encryptFile = (buffer, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  
  let encrypted = cipher.update(buffer, null, 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Helper function to decrypt file content
const decryptFile = (encryptedData, key) => {
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', null);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted;
};

// GET /api/documents - Get all documents (with privilege filtering)
router.get('/', requirePermission('documents', 'read'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    let query = `
      SELECT 
        d.*,
        dc.name as category_name,
        dc.color as category_color,
        dc.icon as category_icon,
        u.name as uploaded_by_name,
        dept.name as department_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.status = 'active'
    `;
    
    const params = [];

    // Apply privilege-based filtering
    if (userContext.privilege_level < 4) {
      // Level 1-3: Can only see own documents or department documents
      if (userContext.privilege_level === 1) {
        query += ' AND d.uploaded_by = ?';
        params.push(userContext.user_id);
      } else if (userContext.privilege_level <= 3) {
        query += ' AND (d.uploaded_by = ? OR d.department_id = ?)';
        params.push(userContext.user_id, userContext.department_id);
      }
    }

    query += ' ORDER BY d.created_at DESC';

    const documents = await getRows(query, params);
    
    res.json({
      success: true,
      documents: documents.map(doc => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : [],
        metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
      }))
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/categories - Get document categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await getRows('SELECT * FROM document_categories WHERE is_active = 1 ORDER BY name');
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching document categories:', error);
    res.status(500).json({ error: 'Failed to fetch document categories' });
  }
});

// POST /api/documents - Upload new document
router.post('/', requirePermission('documents', 'create'), upload.single('file'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, description, category_id, department_id, tags } = req.body;

    // Generate encryption key for this document
    const encryptionKey = crypto.randomBytes(32).toString('base64');
    const encryptionKeyHash = crypto.createHash('sha256').update(encryptionKey).digest('hex');

    // Encrypt the file
    const fileBuffer = await fs.readFile(req.file.path);
    const encryptedData = encryptFile(fileBuffer, encryptionKey);

    // Save encrypted file
    const encryptedFilePath = req.file.path + '.encrypted';
    await fs.writeFile(encryptedFilePath, JSON.stringify(encryptedData));

    // Delete original unencrypted file
    await fs.unlink(req.file.path);

    // Insert document record
    const result = await runQuery(`
      INSERT INTO documents (
        title, description, filename, original_filename, file_size, mime_type,
        file_path, storage_type, category_id, department_id, uploaded_by,
        is_encrypted, encryption_key_hash, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description,
      req.file.filename + '.encrypted',
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      encryptedFilePath,
      'local',
      category_id || null,
      department_id || userContext.department_id,
      userContext.user_id,
      1,
      encryptionKeyHash,
      tags ? JSON.stringify(JSON.parse(tags)) : '[]',
      JSON.stringify({ uploaded_via: 'web_interface' })
    ]);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document_id: result.id
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/documents/:id - Get specific document
router.get('/:id', requirePermission('documents', 'read'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const document = await getRow(`
      SELECT 
        d.*,
        dc.name as category_name,
        dc.color as category_color,
        dc.icon as category_icon,
        u.name as uploaded_by_name,
        dept.name as department_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = ? AND d.status = 'active'
    `, [req.params.id]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && document.uploaded_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          document.uploaded_by !== userContext.user_id && 
          document.department_id !== userContext.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({
      success: true,
      document: {
        ...document,
        tags: document.tags ? JSON.parse(document.tags) : [],
        metadata: document.metadata ? JSON.parse(document.metadata) : {}
      }
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// GET /api/documents/:id/download - Download document
router.get('/:id/download', requirePermission('documents', 'read'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const document = await getRow('SELECT * FROM documents WHERE id = ? AND status = "active"', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && document.uploaded_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          document.uploaded_by !== userContext.user_id && 
          document.department_id !== userContext.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (document.storage_type === 'local' && document.file_path) {
      // For now, return the file path - in production, you'd decrypt and stream the file
      res.json({
        success: true,
        message: 'Document download ready',
        file_path: document.file_path,
        original_filename: document.original_filename,
        mime_type: document.mime_type
      });
    } else if (document.storage_type === 'google_docs' || document.storage_type === 'google_drive') {
      // Google Docs/Drive integration will be implemented later
      res.json({
        success: true,
        message: 'Google document access',
        google_doc_id: document.google_doc_id,
        google_drive_id: document.google_drive_id
      });
    } else {
      res.status(400).json({ error: 'Unsupported storage type' });
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', requirePermission('documents', 'update'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const { title, description, category_id, tags } = req.body;

    // Check if document exists and user has access
    const document = await getRow('SELECT * FROM documents WHERE id = ? AND status = "active"', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && document.uploaded_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          document.uploaded_by !== userContext.user_id && 
          document.department_id !== userContext.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update document
    await runQuery(`
      UPDATE documents 
      SET title = ?, description = ?, category_id = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      description,
      category_id || null,
      tags ? JSON.stringify(JSON.parse(tags)) : '[]',
      req.params.id
    ]);

    res.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id - Delete document (soft delete)
router.delete('/:id', requirePermission('documents', 'delete'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const document = await getRow('SELECT * FROM documents WHERE id = ? AND status = "active"', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && document.uploaded_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          document.uploaded_by !== userContext.user_id && 
          document.department_id !== userContext.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Soft delete
    await runQuery('UPDATE documents SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/:id/versions - Create new version
router.post('/:id/versions', requirePermission('documents', 'update'), upload.single('file'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalDocument = await getRow('SELECT * FROM documents WHERE id = ? AND status = "active"', [req.params.id]);
    
    if (!originalDocument) {
      return res.status(404).json({ error: 'Original document not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && originalDocument.uploaded_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          originalDocument.uploaded_by !== userContext.user_id && 
          originalDocument.department_id !== userContext.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Generate encryption key for new version
    const encryptionKey = crypto.randomBytes(32).toString('base64');
    const encryptionKeyHash = crypto.createHash('sha256').update(encryptionKey).digest('hex');

    // Encrypt the file
    const fileBuffer = await fs.readFile(req.file.path);
    const encryptedData = encryptFile(fileBuffer, encryptionKey);

    // Save encrypted file
    const encryptedFilePath = req.file.path + '.encrypted';
    await fs.writeFile(encryptedFilePath, JSON.stringify(encryptedData));

    // Delete original unencrypted file
    await fs.unlink(req.file.path);

    // Mark old version as not latest
    await runQuery('UPDATE documents SET is_latest_version = 0 WHERE id = ?', [req.params.id]);

    // Create new version
    const newVersion = originalDocument.version + 1;
    const result = await runQuery(`
      INSERT INTO documents (
        title, description, filename, original_filename, file_size, mime_type,
        file_path, storage_type, category_id, department_id, uploaded_by,
        is_encrypted, encryption_key_hash, version, is_latest_version,
        parent_document_id, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      originalDocument.title,
      originalDocument.description,
      req.file.filename + '.encrypted',
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      encryptedFilePath,
      'local',
      originalDocument.category_id,
      originalDocument.department_id,
      userContext.user_id,
      1,
      encryptionKeyHash,
      newVersion,
      1,
      req.params.id,
      originalDocument.tags,
      JSON.stringify({ 
        ...JSON.parse(originalDocument.metadata || '{}'),
        version_created_by: userContext.user_id,
        version_created_at: new Date().toISOString()
      })
    ]);

    res.json({
      success: true,
      message: 'Document version created successfully',
      document_id: result.id,
      version: newVersion
    });
  } catch (error) {
    console.error('Error creating document version:', error);
    res.status(500).json({ error: 'Failed to create document version' });
  }
});

// GET /api/documents/:id/versions - Get document versions
router.get('/:id/versions', requirePermission('documents', 'read'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const document = await getRow('SELECT * FROM documents WHERE id = ? AND status = "active"', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && document.uploaded_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          document.uploaded_by !== userContext.user_id && 
          document.department_id !== userContext.department_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get all versions of this document
    const versions = await getRows(`
      SELECT 
        d.*,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE (d.id = ? OR d.parent_document_id = ?) AND d.status = "active"
      ORDER BY d.version DESC
    `, [req.params.id, req.params.id]);

    res.json({
      success: true,
      versions: versions.map(version => ({
        ...version,
        tags: version.tags ? JSON.parse(version.tags) : [],
        metadata: version.metadata ? JSON.parse(version.metadata) : {}
      }))
    });
  } catch (error) {
    console.error('Error fetching document versions:', error);
    res.status(500).json({ error: 'Failed to fetch document versions' });
  }
});

module.exports = router; 