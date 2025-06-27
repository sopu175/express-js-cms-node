import express from 'express';
import { getQuery, allQuery } from '../database/init.js';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', async (req, res, next) => {
  try {
    // Content statistics
    const contentStats = await getQuery(`
      SELECT 
        COUNT(*) as total_content,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_content,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_content,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_content,
        SUM(views) as total_views
      FROM content
    `);

    // User statistics
    const userStats = await getQuery(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN role = 'editor' THEN 1 ELSE 0 END) as editor_users,
        SUM(CASE WHEN role = 'viewer' THEN 1 ELSE 0 END) as viewer_users
      FROM users
    `);

    // Media statistics
    const mediaStats = await getQuery(`
      SELECT 
        COUNT(*) as total_media,
        SUM(size) as total_storage
      FROM media
    `);

    // Recent content
    const recentContent = await allQuery(`
      SELECT 
        c.id,
        c.title,
        c.status,
        c.views,
        c.created_at,
        u.name as author_name
      FROM content c
      JOIN users u ON c.author_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    // Popular content
    const popularContent = await allQuery(`
      SELECT 
        c.id,
        c.title,
        c.views,
        c.status,
        u.name as author_name
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.status = 'published'
      ORDER BY c.views DESC
      LIMIT 5
    `);

    // Content by type
    const contentByType = await allQuery(`
      SELECT 
        type,
        COUNT(*) as count
      FROM content
      GROUP BY type
    `);

    // Content by status
    const contentByStatus = await allQuery(`
      SELECT 
        status,
        COUNT(*) as count
      FROM content
      GROUP BY status
    `);

    // Monthly content creation
    const monthlyContent = await allQuery(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM content
      WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({
      overview: {
        content: contentStats,
        users: userStats,
        media: mediaStats
      },
      recentContent,
      popularContent,
      charts: {
        contentByType,
        contentByStatus,
        monthlyContent
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get content analytics
router.get('/content', async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Determine date filter based on period
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "WHERE created_at >= date('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "WHERE created_at >= date('now', '-30 days')";
        break;
      case '90d':
        dateFilter = "WHERE created_at >= date('now', '-90 days')";
        break;
      case '1y':
        dateFilter = "WHERE created_at >= date('now', '-1 year')";
        break;
      default:
        dateFilter = "WHERE created_at >= date('now', '-30 days')";
    }

    // Top performing content
    const topContent = await allQuery(`
      SELECT 
        c.id,
        c.title,
        c.views,
        c.status,
        c.created_at,
        u.name as author_name
      FROM content c
      JOIN users u ON c.author_id = u.id
      ${dateFilter}
      ORDER BY c.views DESC
      LIMIT 10
    `);

    // Content performance by author
    const authorPerformance = await allQuery(`
      SELECT 
        u.name as author_name,
        COUNT(c.id) as content_count,
        SUM(c.views) as total_views,
        AVG(c.views) as avg_views
      FROM content c
      JOIN users u ON c.author_id = u.id
      ${dateFilter}
      GROUP BY u.id, u.name
      ORDER BY total_views DESC
    `);

    // Daily content views
    const dailyViews = await allQuery(`
      SELECT 
        date(created_at) as date,
        SUM(views) as views
      FROM content
      ${dateFilter}
      GROUP BY date(created_at)
      ORDER BY date DESC
    `);

    res.json({
      topContent,
      authorPerformance,
      dailyViews
    });
  } catch (error) {
    next(error);
  }
});

export default router;