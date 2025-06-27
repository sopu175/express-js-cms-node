-- MySQL Database Schema for Headless CMS
-- Created: 2024
-- Description: Complete database schema with demo data for headless CMS system

-- Create database
CREATE DATABASE IF NOT EXISTS headless_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE headless_cms;

-- Enable foreign key checks
SET foreign_key_checks = 1;

-- =====================================================
-- TABLES CREATION
-- =====================================================

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'viewer') DEFAULT 'editor',
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Content table
CREATE TABLE content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT,
    excerpt TEXT,
    type ENUM('post', 'page', 'article', 'banner', 'slider', 'menu', 'gallery', 'form') DEFAULT 'post',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    featured_image VARCHAR(500),
    meta_title VARCHAR(255),
    meta_description TEXT,
    tags TEXT,
    category VARCHAR(100),
    author_id INT,
    views INT DEFAULT 0,
    version INT DEFAULT 1,
    template VARCHAR(100) DEFAULT 'default',
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_author (author_id),
    INDEX idx_created (created_at),
    INDEX idx_category (category)
);

-- Modules table
CREATE TABLE modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('banner', 'slider', 'menu', 'gallery', 'form', 'text', 'table', 'list') NOT NULL,
    title VARCHAR(255),
    description TEXT,
    settings JSON,
    data JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    sort_order INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
);

-- Module items table
CREATE TABLE module_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    type ENUM('slide', 'menu_item', 'gallery_item', 'form_field', 'table_row', 'list_item', 'link') NOT NULL,
    title VARCHAR(500),
    content TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    settings JSON,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    INDEX idx_module_id (module_id),
    INDEX idx_sort_order (sort_order),
    INDEX idx_status (status)
);

-- Media table
CREATE TABLE media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    category VARCHAR(100) DEFAULT 'general',
    tags TEXT,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_category (category),
    INDEX idx_mime_type (mime_type)
);

-- Content blocks table
CREATE TABLE content_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    block_type ENUM('text', 'image', 'gallery', 'table', 'list', 'form', 'banner', 'slider', 'menu') NOT NULL,
    block_data JSON,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    INDEX idx_content_id (content_id),
    INDEX idx_sort_order (sort_order)
);

-- Forms table
CREATE TABLE forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_name (name)
);

-- Form fields table
CREATE TABLE form_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    field_type ENUM('text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'file', 'date', 'number') NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_placeholder VARCHAR(255),
    field_options JSON,
    is_required BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    INDEX idx_form_id (form_id),
    INDEX idx_sort_order (sort_order)
);

-- Form submissions table
CREATE TABLE form_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    submission_data JSON NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    INDEX idx_form_id (form_id),
    INDEX idx_created_at (created_at)
);

-- Content versions table
CREATE TABLE content_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    version INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_content_id (content_id),
    INDEX idx_version (version)
);

-- Sessions table
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Email configuration table
CREATE TABLE email_config (
    id INT PRIMARY KEY DEFAULT 1,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INT NOT NULL,
    smtp_secure BOOLEAN DEFAULT FALSE,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Email templates table
CREATE TABLE email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content LONGTEXT NOT NULL,
    text_content LONGTEXT,
    variables JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_name (name)
);

-- Email logs table
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_id INT,
    status ENUM('sent', 'failed') NOT NULL,
    message_id VARCHAR(255),
    error_message TEXT,
    sent_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Content module assignments table
CREATE TABLE content_module_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    module_id INT NOT NULL,
    position VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_content_module_position (content_id, module_id, position),
    INDEX idx_content_id (content_id),
    INDEX idx_module_id (module_id)
);

-- =====================================================
-- DEMO DATA INSERTION
-- =====================================================

-- Insert default admin user
INSERT INTO users (email, password, role, name, avatar) VALUES 
('admin@cms.com', '$2b$10$rQZ8qZ8qZ8qZ8qZ8qZ8qZOZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ', 'admin', 'Admin User', NULL);

-- Insert sample users
INSERT INTO users (email, password, role, name) VALUES 
('editor@cms.com', '$2b$10$rQZ8qZ8qZ8qZ8qZ8qZ8qZOZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ', 'editor', 'Content Editor'),
('viewer@cms.com', '$2b$10$rQZ8qZ8qZ8qZ8qZ8qZ8qZ8qZOZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ', 'viewer', 'Content Viewer');

-- Insert sample modules
INSERT INTO modules (name, type, title, description, settings, data, created_by, sort_order) VALUES 
('hero-banner', 'banner', 'Hero Banner', 'Main hero banner for homepage', 
 '{"autoplay": true, "duration": 5000, "showArrows": true, "showDots": true}',
 '{"background_color": "#1a1a1a", "text_color": "#ffffff", "overlay_opacity": 0.5}',
 1, 0),

('featured-slider', 'slider', 'Featured Content Slider', 'Slider for featured content',
 '{"autoplay": true, "duration": 4000, "transition": "slide", "showArrows": true, "showDots": true}',
 '{}',
 1, 1),

('main-menu', 'menu', 'Main Navigation', 'Primary navigation menu',
 '{"layout": "horizontal", "dropdown": true, "mobile_responsive": true}',
 '{}',
 1, 2),

('photo-gallery', 'gallery', 'Photo Gallery', 'Image gallery component',
 '{"columns": 3, "lightbox": true, "lazy_load": true, "show_captions": true}',
 '{}',
 1, 3);

-- Insert banner module items
INSERT INTO module_items (module_id, type, title, content, image_url, link_url, settings, sort_order) VALUES 
(1, 'slide', 'Inspiring Innovation', 'Building the future with cutting-edge technology. Join us on our mission to create innovative solutions that make a difference in the world.',
 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg', '/get-started',
 '{"buttons": [{"text": "Get Started", "url": "/get-started", "style": "primary"}, {"text": "Learn More", "url": "/about", "style": "secondary"}], "alignment": "center"}',
 0);

-- Insert slider module items
INSERT INTO module_items (module_id, type, title, content, image_url, link_url, settings, sort_order) VALUES 
(2, 'slide', 'Title of The First Post', 'Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.',
 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg', '/post/first-post',
 '{"date": "2024-01-15"}', 0),

(2, 'slide', 'Title of The Second Post', 'Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.',
 'https://images.pexels.com/photos/3184299/pexels-photo-3184299.jpeg', '/post/second-post',
 '{"date": "2024-01-16"}', 1),

(2, 'slide', 'Title of The Third Post', 'Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.',
 'https://images.pexels.com/photos/3184300/pexels-photo-3184300.jpeg', '/post/third-post',
 '{"date": "2024-01-17"}', 2);

-- Insert menu module items
INSERT INTO module_items (module_id, type, title, content, link_url, settings, sort_order) VALUES 
(3, 'menu_item', 'Home', NULL, '/', '{"icon": "home", "children": []}', 0),
(3, 'menu_item', 'About', NULL, '/about', '{"icon": "info", "children": [{"label": "Our Story", "url": "/about/story"}, {"label": "Team", "url": "/about/team"}]}', 1),
(3, 'menu_item', 'Services', NULL, '/services', '{"icon": "briefcase", "children": [{"label": "Web Development", "url": "/services/web-development"}, {"label": "Mobile Apps", "url": "/services/mobile-apps"}, {"label": "Consulting", "url": "/services/consulting"}]}', 2),
(3, 'menu_item', 'Blog', NULL, '/blog', '{"icon": "book"}', 3),
(3, 'menu_item', 'Contact', NULL, '/contact', '{"icon": "mail"}', 4);

-- Insert gallery module items
INSERT INTO module_items (module_id, type, title, content, image_url, settings, sort_order) VALUES 
(4, 'gallery_item', 'Project Alpha', 'A comprehensive web application for business management',
 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
 '{"alt": "Project Alpha Screenshot", "category": "web-development"}', 0),

(4, 'gallery_item', 'Mobile App Beta', 'Cross-platform mobile application for e-commerce',
 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg',
 '{"alt": "Mobile App Beta Screenshot", "category": "mobile-development"}', 1),

(4, 'gallery_item', 'Dashboard Gamma', 'Analytics dashboard for data visualization',
 'https://images.pexels.com/photos/3184299/pexels-photo-3184299.jpeg',
 '{"alt": "Dashboard Gamma Screenshot", "category": "data-visualization"}', 2);

-- Insert sample forms
INSERT INTO forms (name, title, description, settings, created_by) VALUES 
('contact-form', 'Contact Us', 'Get in touch with us',
 '{"submit_message": "Thank you for your message!", "email_notification": true, "redirect_url": "/thank-you", "email_template_id": 1}',
 1);

-- Insert form fields
INSERT INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, is_required, sort_order) VALUES 
(1, 'text', 'name', 'Full Name', 'Enter your name', TRUE, 0),
(1, 'email', 'email', 'Email Address', 'Enter your email', TRUE, 1),
(1, 'select', 'subject', 'Subject', '', TRUE, 2),
(1, 'textarea', 'message', 'Message', 'Enter your message', TRUE, 3);

-- Update form field with options for select field
UPDATE form_fields SET field_options = '["General Inquiry", "Support", "Business"]' WHERE field_name = 'subject';

-- Insert sample content
INSERT INTO content (title, slug, content, excerpt, type, status, meta_title, meta_description, author_id, views) VALUES 
('Welcome to Our CMS', 'welcome', 
 '<h1>Welcome to Our Headless CMS</h1><p>This is a powerful content management system built with modern technologies.</p>',
 'Welcome to our powerful headless CMS system',
 'page', 'published', 
 'Welcome - Headless CMS', 'Welcome to our powerful headless content management system',
 1, 0),

('About Us', 'about',
 '<h1>About Our Company</h1><p>We are a technology company focused on innovation and excellence.</p>',
 'Learn about our company and mission',
 'page', 'published',
 'About Us - Company Information', 'Learn about our company, mission, and values',
 1, 0),

('First Blog Post', 'first-blog-post',
 '<h1>Our First Blog Post</h1><p>This is our first blog post content...</p>',
 'Welcome to our blog with this first post',
 'post', 'published',
 'First Blog Post', 'Read our first blog post about getting started',
 1, 5);

-- Insert content blocks for the About page
INSERT INTO content_blocks (content_id, block_type, block_data, sort_order) VALUES 
(2, 'banner', '{"module_id": 1}', 0),
(2, 'text', '{"heading": "Our Story", "content": "<p>Founded in 2020, we have been at the forefront of technological innovation...</p>"}', 1),
(2, 'gallery', '{"module_id": 4}', 2);

-- Insert email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables, created_by) VALUES 
('contact-form-notification', 'New Contact Form Submission',
 '<h2>New Contact Form Submission</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Subject:</strong> {{subject}}</p><p><strong>Message:</strong></p><p>{{message}}</p><hr><p><small>Submitted on {{date}} from {{ip}}</small></p>',
 'New Contact Form Submission\n\nName: {{name}}\nEmail: {{email}}\nSubject: {{subject}}\nMessage: {{message}}\n\nSubmitted on {{date}} from {{ip}}',
 '["name", "email", "subject", "message", "date", "ip"]',
 1),

('welcome-email', 'Welcome to {{site_name}}',
 '<h1>Welcome to {{site_name}}!</h1><p>Hi {{name}},</p><p>Thank you for joining us. We''re excited to have you on board!</p><p>Best regards,<br>The {{site_name}} Team</p>',
 'Welcome to {{site_name}}!\n\nHi {{name}},\n\nThank you for joining us. We''re excited to have you on board!\n\nBest regards,\nThe {{site_name}} Team',
 '["name", "site_name"]',
 1);

-- Insert sample media entries
INSERT INTO media (filename, original_name, mime_type, size, url, alt_text, caption, category, uploaded_by) VALUES 
('banner-image-1.jpg', 'hero-banner.jpg', 'image/jpeg', 256000, 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg', 'Hero banner image', 'Main hero banner for homepage', 'banners', 1),
('slider-image-1.jpg', 'featured-content-1.jpg', 'image/jpeg', 189000, 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg', 'Featured content image 1', 'First featured content slide', 'sliders', 1),
('gallery-image-1.jpg', 'project-alpha.jpg', 'image/jpeg', 234000, 'https://images.pexels.com/photos/3184299/pexels-photo-3184299.jpeg', 'Project Alpha screenshot', 'Screenshot of Project Alpha', 'projects', 1);

-- =====================================================
-- STORED PROCEDURES (Optional)
-- =====================================================

DELIMITER //

-- Procedure to get content with blocks
CREATE PROCEDURE GetContentWithBlocks(IN content_slug VARCHAR(255))
BEGIN
    SELECT 
        c.*,
        u.name as author_name,
        u.email as author_email
    FROM content c
    JOIN users u ON c.author_id = u.id
    WHERE c.slug = content_slug AND c.status = 'published';
    
    SELECT 
        cb.*
    FROM content_blocks cb
    JOIN content c ON cb.content_id = c.id
    WHERE c.slug = content_slug
    ORDER BY cb.sort_order ASC, cb.created_at ASC;
END //

-- Procedure to get module with items
CREATE PROCEDURE GetModuleWithItems(IN module_id INT)
BEGIN
    SELECT * FROM modules WHERE id = module_id AND status = 'active';
    
    SELECT * FROM module_items 
    WHERE module_id = module_id AND status = 'active'
    ORDER BY sort_order ASC, created_at ASC;
END //

DELIMITER ;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for published content with author info
CREATE VIEW published_content_view AS
SELECT 
    c.id,
    c.title,
    c.slug,
    c.excerpt,
    c.type,
    c.featured_image,
    c.meta_title,
    c.meta_description,
    c.tags,
    c.category,
    c.views,
    c.created_at,
    c.published_at,
    u.name as author_name,
    u.email as author_email
FROM content c
JOIN users u ON c.author_id = u.id
WHERE c.status = 'published';

-- View for active modules with item counts
CREATE VIEW modules_with_counts AS
SELECT 
    m.*,
    COUNT(mi.id) as item_count
FROM modules m
LEFT JOIN module_items mi ON m.id = mi.module_id AND mi.status = 'active'
WHERE m.status = 'active'
GROUP BY m.id;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for better performance
CREATE INDEX idx_content_status_type ON content(status, type);
CREATE INDEX idx_content_published_date ON content(published_at DESC);
CREATE INDEX idx_module_items_module_status ON module_items(module_id, status);
CREATE INDEX idx_form_submissions_date ON form_submissions(created_at DESC);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Database schema created successfully with demo data!' as message;
