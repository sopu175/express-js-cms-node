import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const updateUserSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'editor', 'viewer').optional(),
  password: Joi.string().min(6).optional()
});

// Get all users (admin only)
router.get('/', requireRole(['admin']), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await getQuery(countQuery, params);
    const total = countResult.total;

    // Get users (exclude password)
    const usersQuery = `
      SELECT id, email, name, role, avatar, created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const users = await allQuery(usersQuery, [...params, parseInt(limit), offset]);

    res.json({
      users,
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

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getQuery(`
      SELECT id, email, name, role, avatar, created_at, updated_at
      FROM users WHERE id = ?
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user can view this profile
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) throw error;

    const user = await getQuery('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    const canEditUser = req.user.role === 'admin' || req.user.id === parseInt(req.params.id);
    if (!canEditUser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admins can change roles
    if (value.role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    // Check if email is already taken
    if (value.email && value.email !== user.email) {
      const existingUser = await getQuery('SELECT id FROM users WHERE email = ? AND id != ?', [value.email, req.params.id]);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    if (value.name) {
      updateFields.push('name = ?');
      updateParams.push(value.name);
    }

    if (value.email) {
      updateFields.push('email = ?');
      updateParams.push(value.email);
    }

    if (value.role) {
      updateFields.push('role = ?');
      updateParams.push(value.role);
    }

    if (value.password) {
      const hashedPassword = await bcrypt.hash(value.password, 10);
      updateFields.push('password = ?');
      updateParams.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(req.params.id);

    await runQuery(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
    `, updateParams);

    const updatedUser = await getQuery(`
      SELECT id, email, name, role, avatar, created_at, updated_at
      FROM users WHERE id = ?
    `, [req.params.id]);

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res, next) => {
  try {
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await runQuery('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    const canViewStats = req.user.role === 'admin' || req.user.id === parseInt(req.params.id);
    if (!canViewStats) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get content statistics
    const contentStats = await getQuery(`
      SELECT 
        COUNT(*) as total_content,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_content,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_content,
        SUM(views) as total_views
      FROM content 
      WHERE author_id = ?
    `, [req.params.id]);

    // Get media statistics
    const mediaStats = await getQuery(`
      SELECT 
        COUNT(*) as total_media,
        SUM(size) as total_storage
      FROM media 
      WHERE uploaded_by = ?
    `, [req.params.id]);

    res.json({
      content: contentStats,
      media: mediaStats
    });
  } catch (error) {
    next(error);
  }
});

export default router;