import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Upload file
router.post('/upload', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { alt_text, caption } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const result = await runQuery(`
      INSERT INTO media (filename, original_name, mime_type, size, url, alt_text, caption, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      fileUrl,
      alt_text || '',
      caption || '',
      req.user.id
    ]);

    const mediaFile = await getQuery(`
      SELECT 
        m.*,
        u.name as uploaded_by_name
      FROM media m
      JOIN users u ON m.uploaded_by = u.id
      WHERE m.id = ?
    `, [result.lastID]);

    res.status(201).json(mediaFile);
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    next(error);
  }
});

// Get all media files
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('m.mime_type LIKE ?');
      params.push(`${type}%`);
    }

    if (search) {
      whereConditions.push('(m.original_name LIKE ? OR m.alt_text LIKE ? OR m.caption LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM media m
      ${whereClause}
    `;
    
    const countResult = await getQuery(countQuery, params);
    const total = countResult.total;

    // Get media files
    const mediaQuery = `
      SELECT 
        m.*,
        u.name as uploaded_by_name
      FROM media m
      JOIN users u ON m.uploaded_by = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const mediaFiles = await allQuery(mediaQuery, [...params, parseInt(limit), offset]);

    res.json({
      media: mediaFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get media file by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const mediaFile = await getQuery(`
      SELECT 
        m.*,
        u.name as uploaded_by_name
      FROM media m
      JOIN users u ON m.uploaded_by = u.id
      WHERE m.id = ?
    `, [req.params.id]);

    if (!mediaFile) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    res.json(mediaFile);
  } catch (error) {
    next(error);
  }
});

// Update media file metadata
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { alt_text, caption } = req.body;
    
    const mediaFile = await getQuery('SELECT * FROM media WHERE id = ?', [req.params.id]);
    if (!mediaFile) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    // Check if user can edit this media file
    if (req.user.role !== 'admin' && mediaFile.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runQuery(`
      UPDATE media 
      SET alt_text = ?, caption = ?
      WHERE id = ?
    `, [alt_text || '', caption || '', req.params.id]);

    const updatedMediaFile = await getQuery(`
      SELECT 
        m.*,
        u.name as uploaded_by_name
      FROM media m
      JOIN users u ON m.uploaded_by = u.id
      WHERE m.id = ?
    `, [req.params.id]);

    res.json(updatedMediaFile);
  } catch (error) {
    next(error);
  }
});

// Delete media file
router.delete('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const mediaFile = await getQuery('SELECT * FROM media WHERE id = ?', [req.params.id]);
    if (!mediaFile) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    // Check if user can delete this media file
    if (req.user.role !== 'admin' && mediaFile.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from filesystem
    const filePath = path.join(uploadsDir, mediaFile.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await runQuery('DELETE FROM media WHERE id = ?', [req.params.id]);

    res.json({ message: 'Media file deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;