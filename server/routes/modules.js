import express from 'express';
import Joi from 'joi';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const moduleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('banner', 'slider', 'menu', 'gallery', 'form', 'text', 'table', 'list').required(),
  title: Joi.string().max(255).optional(),
  description: Joi.string().optional(),
  settings: Joi.object().optional(),
  data: Joi.object().optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
  sort_order: Joi.number().integer().min(0).default(0)
});

const moduleItemSchema = Joi.object({
  type: Joi.string().valid('slide', 'menu_item', 'gallery_item', 'form_field', 'table_row', 'list_item', 'link').required(),
  title: Joi.string().max(255).optional(),
  content: Joi.string().optional(),
  image_url: Joi.string().uri().optional(),
  link_url: Joi.string().uri().optional(),
  settings: Joi.object().optional(),
  sort_order: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active')
});

// Get all modules
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('m.type = ?');
      params.push(type);
    }

    if (status) {
      whereConditions.push('m.status = ?');
      params.push(status);
    }

    if (search) {
      whereConditions.push('(m.name LIKE ? OR m.title LIKE ? OR m.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM modules m
      ${whereClause}
    `;
    
    const countResult = await getQuery(countQuery, params);
    const total = countResult.total;

    // Get modules
    const modulesQuery = `
      SELECT 
        m.*,
        u.name as created_by_name
      FROM modules m
      LEFT JOIN users u ON m.created_by = u.id
      ${whereClause}
      ORDER BY m.sort_order ASC, m.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const modules = await allQuery(modulesQuery, [...params, parseInt(limit), offset]);

    // Parse JSON fields
    const parsedModules = modules.map(module => ({
      ...module,
      settings: module.settings ? JSON.parse(module.settings) : {},
      data: module.data ? JSON.parse(module.data) : {}
    }));

    res.json({
      modules: parsedModules,
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

// Get module by ID with items
router.get('/:id', async (req, res, next) => {
  try {
    const module = await getQuery(`
      SELECT 
        m.*,
        u.name as created_by_name
      FROM modules m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [req.params.id]);

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Get module items
    const items = await allQuery(`
      SELECT * FROM module_items 
      WHERE module_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `, [req.params.id]);

    // Parse JSON fields
    const parsedItems = items.map(item => ({
      ...item,
      settings: item.settings ? JSON.parse(item.settings) : {}
    }));

    res.json({
      ...module,
      settings: module.settings ? JSON.parse(module.settings) : {},
      data: module.data ? JSON.parse(module.data) : {},
      items: parsedItems
    });
  } catch (error) {
    next(error);
  }
});

// Create module
router.post('/', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { error, value } = moduleSchema.validate(req.body);
    if (error) throw error;

    const result = await runQuery(`
      INSERT INTO modules (name, type, title, description, settings, data, status, sort_order, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      value.name,
      value.type,
      value.title || '',
      value.description || '',
      JSON.stringify(value.settings || {}),
      JSON.stringify(value.data || {}),
      value.status,
      value.sort_order,
      req.user.id
    ]);

    const newModule = await getQuery(`
      SELECT 
        m.*,
        u.name as created_by_name
      FROM modules m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [result.lastID]);

    res.status(201).json({
      ...newModule,
      settings: newModule.settings ? JSON.parse(newModule.settings) : {},
      data: newModule.data ? JSON.parse(newModule.data) : {},
      items: []
    });
  } catch (error) {
    next(error);
  }
});

// Update module
router.put('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const module = await getQuery('SELECT * FROM modules WHERE id = ?', [req.params.id]);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const { error, value } = moduleSchema.validate(req.body);
    if (error) throw error;

    await runQuery(`
      UPDATE modules 
      SET name = ?, type = ?, title = ?, description = ?, settings = ?, data = ?, 
          status = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      value.name,
      value.type,
      value.title || '',
      value.description || '',
      JSON.stringify(value.settings || {}),
      JSON.stringify(value.data || {}),
      value.status,
      value.sort_order,
      req.params.id
    ]);

    const updatedModule = await getQuery(`
      SELECT 
        m.*,
        u.name as created_by_name
      FROM modules m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [req.params.id]);

    res.json({
      ...updatedModule,
      settings: updatedModule.settings ? JSON.parse(updatedModule.settings) : {},
      data: updatedModule.data ? JSON.parse(updatedModule.data) : {}
    });
  } catch (error) {
    next(error);
  }
});

// Delete module
router.delete('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const module = await getQuery('SELECT * FROM modules WHERE id = ?', [req.params.id]);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    await runQuery('DELETE FROM modules WHERE id = ?', [req.params.id]);

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add item to module
router.post('/:id/items', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const module = await getQuery('SELECT * FROM modules WHERE id = ?', [req.params.id]);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const { error, value } = moduleItemSchema.validate(req.body);
    if (error) throw error;

    const result = await runQuery(`
      INSERT INTO module_items (module_id, type, title, content, image_url, link_url, settings, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id,
      value.type,
      value.title || '',
      value.content || '',
      value.image_url || '',
      value.link_url || '',
      JSON.stringify(value.settings || {}),
      value.sort_order,
      value.status
    ]);

    const newItem = await getQuery('SELECT * FROM module_items WHERE id = ?', [result.lastID]);

    res.status(201).json({
      ...newItem,
      settings: newItem.settings ? JSON.parse(newItem.settings) : {}
    });
  } catch (error) {
    next(error);
  }
});

// Update module item
router.put('/:id/items/:itemId', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const item = await getQuery('SELECT * FROM module_items WHERE id = ? AND module_id = ?', [req.params.itemId, req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Module item not found' });
    }

    const { error, value } = moduleItemSchema.validate(req.body);
    if (error) throw error;

    await runQuery(`
      UPDATE module_items 
      SET type = ?, title = ?, content = ?, image_url = ?, link_url = ?, 
          settings = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      value.type,
      value.title || '',
      value.content || '',
      value.image_url || '',
      value.link_url || '',
      JSON.stringify(value.settings || {}),
      value.sort_order,
      value.status,
      req.params.itemId
    ]);

    const updatedItem = await getQuery('SELECT * FROM module_items WHERE id = ?', [req.params.itemId]);

    res.json({
      ...updatedItem,
      settings: updatedItem.settings ? JSON.parse(updatedItem.settings) : {}
    });
  } catch (error) {
    next(error);
  }
});

// Delete module item
router.delete('/:id/items/:itemId', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const item = await getQuery('SELECT * FROM module_items WHERE id = ? AND module_id = ?', [req.params.itemId, req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Module item not found' });
    }

    await runQuery('DELETE FROM module_items WHERE id = ?', [req.params.itemId]);

    res.json({ message: 'Module item deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get modules by type (public endpoint)
router.get('/type/:type', async (req, res, next) => {
  try {
    const modules = await allQuery(`
      SELECT 
        m.*,
        u.name as created_by_name
      FROM modules m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.type = ? AND m.status = 'active'
      ORDER BY m.sort_order ASC, m.created_at DESC
    `, [req.params.type]);

    // Get items for each module
    const modulesWithItems = await Promise.all(modules.map(async (module) => {
      const items = await allQuery(`
        SELECT * FROM module_items 
        WHERE module_id = ? AND status = 'active'
        ORDER BY sort_order ASC, created_at ASC
      `, [module.id]);

      return {
        ...module,
        settings: module.settings ? JSON.parse(module.settings) : {},
        data: module.data ? JSON.parse(module.data) : {},
        items: items.map(item => ({
          ...item,
          settings: item.settings ? JSON.parse(item.settings) : {}
        }))
      };
    }));

    res.json(modulesWithItems);
  } catch (error) {
    next(error);
  }
});

export default router;