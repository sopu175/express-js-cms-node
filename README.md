# Headless CMS with MySQL

A powerful headless content management system built with Express.js, React, and MySQL.

## 🚀 Quick Start (Recommended)

### Option 1: One-Click Setup (Docker)

**Linux/macOS:**

```bash
chmod +x quick-start.sh
./quick-start.sh
```

**Windows:**

```cmd
quick-start.bat
```

**Manual Docker Setup:**

```bash
# Start MySQL container
npm run docker:up

# Wait for MySQL to be ready (30 seconds)
# Then run database setup
npm run setup:mysql

# Start development server
npm run dev
```

### Option 2: Local MySQL Installation

1. **Install MySQL 8.0+**
2. **Create database and user:**
   ```sql
   CREATE DATABASE headless_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'cms_password';
   GRANT ALL PRIVILEGES ON headless_cms.* TO 'cms_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. **Update .env file with your credentials**
4. **Run setup:**
   ```bash
   npm install
   npm run setup:mysql
   npm run dev
   ```

## 📱 Access Points

- **CMS Admin Panel**: http://localhost:5173/
- **API Documentation**: http://localhost:3001/api/docs
- **phpMyAdmin** (Docker): http://localhost:8080/
- **MySQL Database**: localhost:3306

## 🔑 Default Login

- **Email**: admin@cms.com
- **Password**: admin123

## 📋 Features

### Content Management

- ✅ **Pages & Posts** - Create and manage content
- ✅ **Rich Text Editor** - WYSIWYG content editing
- ✅ **Media Library** - Upload and manage files
- ✅ **SEO Optimization** - Meta titles, descriptions, and more

### Dynamic Modules

- ✅ **Banners** - Hero sections and promotional banners
- ✅ **Sliders** - Image and content carousels
- ✅ **Menus** - Dynamic navigation menus
- ✅ **Galleries** - Photo galleries with lightbox
- ✅ **Forms** - Contact forms and data collection

### Advanced Features

- ✅ **User Management** - Admin, Editor, Viewer roles
- ✅ **Content Versioning** - Track content changes
- ✅ **Email System** - Templates and notifications
- ✅ **Analytics** - Content views and statistics
- ✅ **REST API** - Headless content delivery

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server (frontend + backend)
npm run dev:server       # Start backend only
npm run dev:client       # Start frontend only

# Database
npm run setup:mysql      # Setup database with demo data
npm run docker:up        # Start MySQL container
npm run docker:down      # Stop containers
npm run docker:logs      # View MySQL logs
npm run docker:restart   # Restart MySQL

# Production
npm run build            # Build frontend
npm start               # Start production server
```

## 📂 Project Structure

```
├── server/                 # Backend (Express.js)
│   ├── database/          # Database connection & setup
│   ├── routes/            # API endpoints
│   ├── middleware/        # Authentication & error handling
│   └── index.js          # Server entry point
├── src/                   # Frontend (React)
│   ├── components/        # Reusable components
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts
│   └── services/         # API services
├── database.sql          # MySQL schema & demo data
├── docker-compose.yml    # Docker configuration
└── quick-start.sh        # One-click setup script
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=cms_user
DB_PASSWORD=cms_password
DB_NAME=headless_cms

# Server
PORT=3001
NODE_ENV=development

# JWT Security
JWT_SECRET=your_secure_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## 📊 Database Schema

The system includes 15+ tables for comprehensive content management:

- **Core**: users, content, media
- **Modules**: modules, module_items
- **Forms**: forms, form_fields, form_submissions
- **Email**: email_templates, email_logs, email_config
- **Versioning**: content_versions, sessions
- **Relationships**: content_blocks, content_module_assignments

## 🌐 API Endpoints

### Public APIs (No Authentication)

```
GET  /api/public/modules/:type     # Get modules by type
GET  /api/public/content/:slug     # Get content by slug
POST /api/forms/:id/submit         # Submit form data
```

### Admin APIs (Authentication Required)

```
POST /api/auth/login               # User login
GET  /api/content                  # List content
POST /api/content                  # Create content
GET  /api/modules                  # List modules
POST /api/modules                  # Create module
GET  /api/forms                    # List forms
POST /api/email/send               # Send email
```

## 🚢 Production Deployment

### Docker Production

```bash
# Build production image
docker build -t headless-cms .

# Run with production database
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Set up MySQL on your server
2. Update environment variables
3. Build the frontend: `npm run build`
4. Start the server: `npm start`

## 🔒 Security Features

- ✅ JWT Authentication with refresh tokens
- ✅ Rate limiting on API endpoints
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation with Joi
- ✅ SQL injection prevention
- ✅ XSS protection

## 🆘 Troubleshooting

### MySQL Connection Issues

```bash
# Check if MySQL is running
npm run docker:logs

# Restart MySQL container
npm run docker:restart

# Verify database connection
mysql -h localhost -u cms_user -p headless_cms
```

### Common Issues

- **Port 3306 in use**: Stop other MySQL instances
- **Permission denied**: Check Docker permissions
- **Tables don't exist**: Run `npm run setup:mysql`

## 📚 Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://reactjs.org/)
- [Docker Setup](https://docs.docker.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
