import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database/init.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import mediaRoutes from './routes/media.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import modulesRoutes from './routes/modules.js';
import formsRoutes from './routes/forms.js';
import contentBlocksRoutes from './routes/content-blocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/content-blocks', contentBlocksRoutes);

// Public API endpoints for frontend consumption
app.get('/api/public/modules/:type', async (req, res, next) => {
  try {
    const { allQuery } = await import('./database/init.js');
    
    const modules = await allQuery(`
      SELECT 
        m.*
      FROM modules m
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

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Enhanced Headless CMS API',
    version: '2.0.0',
    description: 'RESTful API for headless content management with dynamic modules',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Authenticate user',
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/refresh': 'Refresh access token',
        'POST /api/auth/logout': 'Logout user'
      },
      content: {
        'GET /api/content': 'Get all content with pagination',
        'GET /api/content/:id': 'Get content by ID',
        'POST /api/content': 'Create new content',
        'PUT /api/content/:id': 'Update content',
        'DELETE /api/content/:id': 'Delete content',
        'GET /api/content/slug/:slug': 'Get content by slug',
        'POST /api/content/:id/publish': 'Publish content',
        'POST /api/content/:id/unpublish': 'Unpublish content'
      },
      modules: {
        'GET /api/modules': 'Get all modules',
        'GET /api/modules/:id': 'Get module by ID with items',
        'POST /api/modules': 'Create new module',
        'PUT /api/modules/:id': 'Update module',
        'DELETE /api/modules/:id': 'Delete module',
        'GET /api/modules/type/:type': 'Get modules by type',
        'POST /api/modules/:id/items': 'Add item to module',
        'PUT /api/modules/:id/items/:itemId': 'Update module item',
        'DELETE /api/modules/:id/items/:itemId': 'Delete module item'
      },
      forms: {
        'GET /api/forms': 'Get all forms',
        'GET /api/forms/:id': 'Get form by ID with fields',
        'POST /api/forms': 'Create new form',
        'PUT /api/forms/:id': 'Update form',
        'DELETE /api/forms/:id': 'Delete form',
        'POST /api/forms/:id/fields': 'Add field to form',
        'PUT /api/forms/:id/fields/:fieldId': 'Update form field',
        'DELETE /api/forms/:id/fields/:fieldId': 'Delete form field',
        'POST /api/forms/:id/submit': 'Submit form (public)',
        'GET /api/forms/:id/submissions': 'Get form submissions'
      },
      contentBlocks: {
        'GET /api/content-blocks/content/:contentId': 'Get content blocks',
        'POST /api/content-blocks': 'Create content block',
        'PUT /api/content-blocks/:id': 'Update content block',
        'DELETE /api/content-blocks/:id': 'Delete content block',
        'PUT /api/content-blocks/content/:contentId/reorder': 'Reorder content blocks'
      },
      media: {
        'POST /api/media/upload': 'Upload media file',
        'GET /api/media': 'Get all media files',
        'DELETE /api/media/:id': 'Delete media file'
      },
      public: {
        'GET /api/public/modules/:type': 'Get public modules by type'
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();