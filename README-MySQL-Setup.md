# MySQL Database Setup

This application has been converted from SQLite to MySQL for better performance, scalability, and production readiness.

## Prerequisites

1. **MySQL Server** - Install MySQL 8.0 or later
2. **Node.js** - Version 16 or later
3. **npm** - Package manager

## Quick Setup

### 1. Install MySQL

**On Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**On macOS (using Homebrew):**

```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**On Windows:**
Download and install from [MySQL official website](https://dev.mysql.com/downloads/mysql/)

### 2. Create Database and User

Connect to MySQL as root:

```bash
mysql -u root -p
```

Create database and user:

```sql
CREATE DATABASE headless_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cms_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON headless_cms.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Import Database Schema

Import the complete database schema with demo data:

```bash
mysql -u cms_user -p headless_cms < database.sql
```

### 4. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Update `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=cms_user
DB_PASSWORD=your_secure_password
DB_NAME=headless_cms
JWT_SECRET=your_very_secure_jwt_secret_here
JWT_REFRESH_SECRET=your_very_secure_jwt_refresh_secret_here
```

### 5. Install Dependencies

Install the new MySQL dependency:

```bash
npm install
```

### 6. Start the Application

```bash
npm run dev
```

## Database Features

### Tables Created

- **users** - User authentication and roles
- **content** - Pages, posts, and articles
- **modules** - Dynamic content modules (banners, sliders, menus, galleries)
- **module_items** - Items within modules
- **media** - File uploads and media management
- **content_blocks** - Flexible page building blocks
- **forms** - Dynamic form builder
- **form_fields** - Form field definitions
- **form_submissions** - Form submission data
- **content_versions** - Content versioning
- **sessions** - Session management
- **email_config** - Email configuration
- **email_templates** - Email template management
- **email_logs** - Email sending logs
- **content_module_assignments** - Content-module relationships

### Demo Data Included

- **Admin user**: admin@cms.com / admin123
- **Editor user**: editor@cms.com / editor123
- **Viewer user**: viewer@cms.com / viewer123
- **Sample modules**: Banner, slider, menu, gallery
- **Sample content**: Welcome page, About page, Blog post
- **Sample forms**: Contact form with fields
- **Email templates**: Contact notification, welcome email

### API Endpoints

#### Public Endpoints

- `GET /api/public/modules/:type` - Get modules by type
- `GET /api/public/content/:slug` - Get content with blocks
- `POST /api/forms/:id/submit` - Submit form data

#### Admin Endpoints (require authentication)

- `POST /api/auth/login` - User login
- `GET /api/content` - List all content
- `POST /api/content` - Create content
- `GET /api/modules` - List all modules
- `POST /api/modules` - Create module
- `GET /api/forms` - List all forms
- `POST /api/email/send` - Send email

### Performance Optimizations

- Connection pooling for MySQL
- Indexed columns for faster queries
- JSON columns for flexible data storage
- Views for common queries
- Stored procedures for complex operations

### Production Considerations

1. **Security**
   - Use strong passwords
   - Enable SSL for MySQL connections
   - Set up firewall rules
   - Use environment variables for secrets

2. **Performance**
   - Configure MySQL for your server specs
   - Enable query caching
   - Monitor slow queries
   - Set up database backups

3. **Scaling**
   - Consider read replicas for high traffic
   - Use Redis for session storage
   - Implement CDN for media files
   - Set up load balancing

## Troubleshooting

### Connection Issues

```bash
# Check MySQL service status
sudo systemctl status mysql

# Check if MySQL is listening on port 3306
netstat -tlnp | grep 3306

# Check database exists
mysql -u cms_user -p -e "SHOW DATABASES;"
```

### Permission Issues

```sql
-- Grant permissions if needed
GRANT ALL PRIVILEGES ON headless_cms.* TO 'cms_user'@'localhost';
FLUSH PRIVILEGES;
```

### Migration from SQLite

If you have existing SQLite data, you can export it and import to MySQL:

```bash
# Export SQLite data
sqlite3 server/database/cms.db .dump > sqlite_export.sql

# Modify the export file to be MySQL compatible
# Then import to MySQL
mysql -u cms_user -p headless_cms < modified_export.sql
```

## Database Management

### Backup

```bash
mysqldump -u cms_user -p headless_cms > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
mysql -u cms_user -p headless_cms < backup_file.sql
```

### Monitor Database

```sql
-- Check table sizes
SELECT
    table_name,
    round(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'headless_cms'
ORDER BY (data_length + index_length) DESC;

-- Check slow queries
SHOW PROCESSLIST;
```

## Support

For issues or questions:

1. Check the logs: `npm run dev` output
2. Verify database connection in the application
3. Check MySQL error logs: `/var/log/mysql/error.log`
4. Ensure all environment variables are set correctly
