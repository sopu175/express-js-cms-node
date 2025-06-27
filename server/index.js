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
import emailRoutes from './routes/email.js';

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
app.use('/api/email', emailRoutes);

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

// Public API endpoint for content with blocks
app.get('/api/public/content/:slug', async (req, res, next) => {
  try {
    const { getQuery, allQuery } = await import('./database/init.js');
    
    // Get content
    const content = await getQuery(`
      SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.slug = ? AND c.status = 'published'
    `, [req.params.slug]);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get content blocks
    const blocks = await allQuery(`
      SELECT * FROM content_blocks 
      WHERE content_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `, [content.id]);

    // Parse blocks and fetch module data for module blocks
    const parsedBlocks = await Promise.all(blocks.map(async (block) => {
      const blockData = block.block_data ? JSON.parse(block.block_data) : {};
      
      if (block.block_type === 'banner' || block.block_type === 'slider' || 
          block.block_type === 'menu' || block.block_type === 'gallery' || 
          block.block_type === 'form') {
        
        if (blockData.module_id) {
          const module = await getQuery(`
            SELECT * FROM modules 
            WHERE id = ? AND status = 'active'
          `, [blockData.module_id]);

          if (module) {
            const moduleItems = await allQuery(`
              SELECT * FROM module_items 
              WHERE module_id = ? AND status = 'active'
              ORDER BY sort_order ASC, created_at ASC
            `, [module.id]);

            blockData.module = {
              ...module,
              settings: module.settings ? JSON.parse(module.settings) : {},
              data: module.data ? JSON.parse(module.data) : {},
              items: moduleItems.map(item => ({
                ...item,
                settings: item.settings ? JSON.parse(item.settings) : {}
              }))
            };
          }
        }
      }

      return {
        ...block,
        block_data: blockData
      };
    }));

    // Increment view count
    await import('./database/init.js').then(({ runQuery }) => 
      runQuery('UPDATE content SET views = views + 1 WHERE id = ?', [content.id])
    );

    res.json({
      ...content,
      blocks: parsedBlocks
    });
  } catch (error) {
    next(error);
  }
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Enhanced Headless CMS API',
    version: '2.0.0',
    description: 'RESTful API for headless content management with dynamic modules and email functionality',
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
        'PUT /api/forms/:id/fields': 'Bulk update form fields',
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
      email: {
        'GET /api/email/config': 'Get email configuration',
        'PUT /api/email/config': 'Update email configuration',
        'GET /api/email/templates': 'Get email templates',
        'POST /api/email/templates': 'Create email template',
        'PUT /api/email/templates/:id': 'Update email template',
        'DELETE /api/email/templates/:id': 'Delete email template',
        'POST /api/email/send': 'Send email',
        'GET /api/email/logs': 'Get email logs'
      },
      media: {
        'POST /api/media/upload': 'Upload media file',
        'GET /api/media': 'Get all media files',
        'DELETE /api/media/:id': 'Delete media file'
      },
      public: {
        'GET /api/public/modules/:type': 'Get public modules by type',
        'GET /api/public/content/:slug': 'Get public content with blocks by slug'
      }
    },
    examples: {
      content_with_blocks: {
        title: 'Sample Content with Blocks',
        slug: 'sample-content',
        content: 'Main content text',
        blocks: [
          {
            block_type: 'text',
            block_data: {
              heading: 'Section Title',
              content: 'Section content text'
            }
          },
          {
            block_type: 'banner',
            block_data: {
              module_id: 1,
              module: {
                name: 'hero-banner',
                type: 'banner',
                title: 'Hero Banner',
                settings: { autoplay: true, duration: 5000 },
                data: { background_color: '#1a1a1a' },
                items: []
              }
            }
          }
        ]
      },
      form_submission: {
        form_id: 1,
        submission_data: {
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'General Inquiry',
          message: 'Hello, I have a question...'
        }
      },
      email_template: {
        name: 'contact-notification',
        subject: 'New Contact: {{subject}}',
        html_content: '<h2>New Contact</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Message:</strong> {{message}}</p>',
        variables: ['name', 'email', 'subject', 'message']
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