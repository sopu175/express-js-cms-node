import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const contentSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  slug: Joi.string().min(1).max(255).optional(),
  content: Joi.string().allow('').optional(),
  excerpt: Joi.string().max(500).allow('').optional(),
  type: Joi.string().valid('post', 'page', 'article').default('post'),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  featured_image: Joi.string().allow('').optional(),
  meta_title: Joi.string().max(255).allow('').optional(),
  meta_description: Joi.string().max(500).allow('').optional(),
  tags: Joi.string().allow('').optional(),
  category: Joi.string().allow('').optional()
});

const updateContentSchema = contentSchema.fork(['title'], (schema) => schema.optional());

// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Get all content with pagination and filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      category,
      tags,
      author,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Build WHERE conditions
    if (type) {
      whereConditions.push('c.type = ?');
      params.push(type);
    }
    
    if (status) {
      whereConditions.push('c.status = ?');
      params.push(status);
    } else {
      // Default to published content for non-authenticated requests
      if (!req.user) {
        whereConditions.push('c.status = ?');
        params.push('published');
      }
    }
    
    if (category) {
      whereConditions.push('c.category = ?');
      params.push(category);
    }
    
    if (tags) {
      whereConditions.push('c.tags LIKE ?');
      params.push(`%${tags}%`);
    }
    
    if (author) {
      whereConditions.push('u.name LIKE ?');
      params.push(`%${author}%`);
    }
    
    if (search) {
      whereConditions.push('(c.title LIKE ? OR c.content LIKE ? OR c.excerpt LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Valid sort columns
    const validSortColumns = ['created_at', 'updated_at', 'title', 'views', 'published_at'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM content c
      JOIN users u ON c.author_id = u.id
      ${whereClause}
    `;
    
    const countResult = await getQuery(countQuery, params);
    const total = countResult.total;

    // Get content
    const contentQuery = `
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      ${whereClause}
      ORDER BY c.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const content = await allQuery(contentQuery, [...params, parseInt(limit), offset]);

    res.json({
      content,
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

// Get content by ID
router.get('/:id', async (req, res, next) => {
  try {
    const content = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user can access this content
    if (content.status !== 'published' && !req.user) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment view count
    await runQuery('UPDATE content SET views = views + 1 WHERE id = ?', [req.params.id]);
    content.views += 1;

    res.json(content);
  } catch (error) {
    next(error);
  }
});

// Get content by slug
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const content = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.slug = ?
    `, [req.params.slug]);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user can access this content
    if (content.status !== 'published' && !req.user) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Increment view count
    await runQuery('UPDATE content SET views = views + 1 WHERE id = ?', [content.id]);
    content.views += 1;

    res.json(content);
  } catch (error) {
    next(error);
  }
});

// Create content
router.post('/', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { error, value } = contentSchema.validate(req.body);
    if (error) throw error;

    let { slug, ...contentData } = value;
    
    // Generate slug if not provided
    if (!slug) {
      slug = generateSlug(contentData.title);
    } else {
      slug = generateSlug(slug);
    }

    // Ensure slug is unique
    let uniqueSlug = slug;
    let counter = 1;
    while (await getQuery('SELECT id FROM content WHERE slug = ?', [uniqueSlug])) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const result = await runQuery(`
      INSERT INTO content (
        title, slug, content, excerpt, type, status, featured_image,
        meta_title, meta_description, tags, category, author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      contentData.title,
      uniqueSlug,
      contentData.content || '',
      contentData.excerpt || '',
      contentData.type,
      contentData.status,
      contentData.featured_image || '',
      contentData.meta_title || '',
      contentData.meta_description || '',
      contentData.tags || '',
      contentData.category || '',
      req.user.id
    ]);

    // Create initial version
    await runQuery(`
      INSERT INTO content_versions (content_id, version, title, content, created_by)
      VALUES (?, 1, ?, ?, ?)
    `, [result.lastID, contentData.title, contentData.content || '', req.user.id]);

    const newContent = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [result.lastID]);

    res.status(201).json(newContent);
  } catch (error) {
    next(error);
  }
});

// Update content
router.put('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { error, value } = updateContentSchema.validate(req.body);
    if (error) throw error;

    const content = await getQuery('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user can edit this content
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let { slug, ...contentData } = value;
    
    // Generate slug if title changed
    if (contentData.title && contentData.title !== content.title) {
      if (!slug) {
        slug = generateSlug(contentData.title);
      } else {
        slug = generateSlug(slug);
      }

      // Ensure slug is unique (excluding current content)
      let uniqueSlug = slug;
      let counter = 1;
      while (await getQuery('SELECT id FROM content WHERE slug = ? AND id != ?', [uniqueSlug, req.params.id])) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    Object.entries(contentData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(value);
      }
    });

    if (slug) {
      updateFields.push('slug = ?');
      updateParams.push(slug);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateFields.push('version = version + 1');
    updateParams.push(req.params.id);

    await runQuery(`
      UPDATE content SET ${updateFields.join(', ')} WHERE id = ?
    `, updateParams);

    // Create new version if content changed
    if (contentData.title || contentData.content) {
      const updatedContent = await getQuery('SELECT * FROM content WHERE id = ?', [req.params.id]);
      await runQuery(`
        INSERT INTO content_versions (content_id, version, title, content, created_by)
        VALUES (?, ?, ?, ?, ?)
      `, [req.params.id, updatedContent.version, updatedContent.title, updatedContent.content, req.user.id]);
    }

    const updatedContent = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    res.json(updatedContent);
  } catch (error) {
    next(error);
  }
});

// Delete content
router.delete('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const content = await getQuery('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user can delete this content
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runQuery('DELETE FROM content WHERE id = ?', [req.params.id]);

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Publish content
router.post('/:id/publish', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const content = await getQuery('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user can publish this content
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runQuery(`
      UPDATE content 
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    const updatedContent = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    res.json(updatedContent);
  } catch (error) {
    next(error);
  }
});

// Unpublish content
router.post('/:id/unpublish', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const content = await getQuery('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user can unpublish this content
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runQuery(`
      UPDATE content 
      SET status = 'draft', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    const updatedContent = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    res.json(updatedContent);
  } catch (error) {
    next(error);
  }
});

// Get content versions
router.get('/:id/versions', authMiddleware, async (req, res, next) => {
  try {
    const content = await getQuery('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const versions = await allQuery(`
      SELECT 
        cv.*,
        u.name as created_by_name
      FROM content_versions cv
      JOIN users u ON cv.created_by = u.id
      WHERE cv.content_id = ?
      ORDER BY cv.version DESC
    `, [req.params.id]);

    res.json(versions);
  } catch (error) {
    next(error);
  }
});

export default router;