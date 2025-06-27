import express from 'express';
import Joi from 'joi';
import { getQuery, runQuery, allQuery } from '../database/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const contentBlockSchema = Joi.object({
  content_id: Joi.number().integer().required(),
  block_type: Joi.string().valid('text', 'image', 'gallery', 'table', 'list', 'form', 'banner', 'slider', 'menu').required(),
  block_data: Joi.object().required(),
  sort_order: Joi.number().integer().min(0).default(0)
});

// Get content blocks for a specific content
router.get('/content/:contentId', async (req, res, next) => {
  try {
    const blocks = await allQuery(`
      SELECT * FROM content_blocks 
      WHERE content_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `, [req.params.contentId]);

    // Parse JSON fields
    const parsedBlocks = blocks.map(block => ({
      ...block,
      block_data: block.block_data ? JSON.parse(block.block_data) : {}
    }));

    res.json(parsedBlocks);
  } catch (error) {
    next(error);
  }
});

// Create content block
router.post('/', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { error, value } = contentBlockSchema.validate(req.body);
    if (error) throw error;

    // Verify content exists
    const content = await getQuery('SELECT * FROM content WHERE id = ?', [value.content_id]);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const result = await runQuery(`
      INSERT INTO content_blocks (content_id, block_type, block_data, sort_order)
      VALUES (?, ?, ?, ?)
    `, [
      value.content_id,
      value.block_type,
      JSON.stringify(value.block_data),
      value.sort_order
    ]);

    const newBlock = await getQuery('SELECT * FROM content_blocks WHERE id = ?', [result.lastID]);

    res.status(201).json({
      ...newBlock,
      block_data: newBlock.block_data ? JSON.parse(newBlock.block_data) : {}
    });
  } catch (error) {
    next(error);
  }
});

// Update content block
router.put('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const block = await getQuery('SELECT * FROM content_blocks WHERE id = ?', [req.params.id]);
    if (!block) {
      return res.status(404).json({ error: 'Content block not found' });
    }

    const { block_type, block_data, sort_order } = req.body;

    await runQuery(`
      UPDATE content_blocks 
      SET block_type = ?, block_data = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      block_type || block.block_type,
      JSON.stringify(block_data || {}),
      sort_order !== undefined ? sort_order : block.sort_order,
      req.params.id
    ]);

    const updatedBlock = await getQuery('SELECT * FROM content_blocks WHERE id = ?', [req.params.id]);

    res.json({
      ...updatedBlock,
      block_data: updatedBlock.block_data ? JSON.parse(updatedBlock.block_data) : {}
    });
  } catch (error) {
    next(error);
  }
});

// Delete content block
router.delete('/:id', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const block = await getQuery('SELECT * FROM content_blocks WHERE id = ?', [req.params.id]);
    if (!block) {
      return res.status(404).json({ error: 'Content block not found' });
    }

    await runQuery('DELETE FROM content_blocks WHERE id = ?', [req.params.id]);

    res.json({ message: 'Content block deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Reorder content blocks
router.put('/content/:contentId/reorder', authMiddleware, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { blocks } = req.body; // Array of { id, sort_order }
    
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ error: 'Blocks must be an array' });
    }

    // Update sort order for each block
    for (const block of blocks) {
      await runQuery(`
        UPDATE content_blocks 
        SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND content_id = ?
      `, [block.sort_order, block.id, req.params.contentId]);
    }

    res.json({ message: 'Blocks reordered successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;