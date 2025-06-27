import mysql from "mysql2/promise";
import bcryptjs from "bcryptjs";

let pool;

export function getDatabase() {
  return pool;
}

export async function initializeDatabase() {
  try {
    // Create MySQL connection pool
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "headless_cms",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "Z",
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log("📦 Connected to MySQL database");
    connection.release();

    // Check if tables exist, if not run demo data insertion
    await checkAndCreateDemoData();
    console.log("📋 Database ready");
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
}

async function checkAndCreateDemoData() {
  try {
    // Check if users table has data
    const [rows] = await pool.execute("SELECT COUNT(*) as count FROM users");

    if (rows[0].count === 0) {
      console.log("📝 Creating demo data...");
      await createDemoData();
      console.log("✅ Demo data created successfully");
    }
  } catch (error) {
    console.log(
      "⚠️  Tables might not exist. Please run the database.sql file first.",
    );
    console.log("Error:", error.message);
  }
}

async function createDemoData() {
  const hashedPassword = await bcryptjs.hash("admin123", 10);

  // Insert default admin user
  await runQuery(
    `
      INSERT IGNORE INTO users (email, password, role, name)
      VALUES (?, ?, ?, ?)
   `,
    ["admin@cms.com", hashedPassword, "admin", "Admin User"],
  );

  // Insert sample users
  const editorPassword = await bcryptjs.hash("editor123", 10);
  const viewerPassword = await bcryptjs.hash("viewer123", 10);

  await runQuery(
    `
      INSERT IGNORE INTO users (email, password, role, name)
      VALUES (?, ?, ?, ?), (?, ?, ?, ?)
   `,
    [
      "editor@cms.com",
      editorPassword,
      "editor",
      "Content Editor",
      "viewer@cms.com",
      viewerPassword,
      "viewer",
      "Content Viewer",
    ],
  );

  // Insert sample modules if they don't exist
  await runQuery(`
      INSERT IGNORE INTO modules (id, name, type, title, description, settings, data, created_by, sort_order)
      VALUES 
      (1, 'hero-banner', 'banner', 'Hero Banner', 'Main hero banner for homepage', 
       '{"autoplay": true, "duration": 5000, "showArrows": true, "showDots": true}',
       '{"background_color": "#1a1a1a", "text_color": "#ffffff", "overlay_opacity": 0.5}',
       1, 0),
      (2, 'featured-slider', 'slider', 'Featured Content Slider', 'Slider for featured content',
       '{"autoplay": true, "duration": 4000, "transition": "slide", "showArrows": true, "showDots": true}',
       '{}', 1, 1),
      (3, 'main-menu', 'menu', 'Main Navigation', 'Primary navigation menu',
       '{"layout": "horizontal", "dropdown": true, "mobile_responsive": true}',
       '{}', 1, 2),
      (4, 'photo-gallery', 'gallery', 'Photo Gallery', 'Image gallery component',
       '{"columns": 3, "lightbox": true, "lazy_load": true, "show_captions": true}',
       '{}', 1, 3)
   `);

  // Insert module items
  await runQuery(`
      INSERT IGNORE INTO module_items (id, module_id, type, title, content, image_url, link_url, settings, sort_order)
      VALUES 
      (1, 1, 'slide', 'Inspiring Innovation', 
       'Building the future with cutting-edge technology. Join us on our mission to create innovative solutions that make a difference in the world.',
       'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg', '/get-started',
       '{"buttons": [{"text": "Get Started", "url": "/get-started", "style": "primary"}, {"text": "Learn More", "url": "/about", "style": "secondary"}], "alignment": "center"}',
       0),
      (2, 2, 'slide', 'Title of The First Post', 
       'Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.',
       'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg', '/post/first-post',
       '{"date": "2024-01-15"}', 0),
      (3, 2, 'slide', 'Title of The Second Post',
       'Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.',
       'https://images.pexels.com/photos/3184299/pexels-photo-3184299.jpeg', '/post/second-post',
       '{"date": "2024-01-16"}', 1),
      (4, 2, 'slide', 'Title of The Third Post',
       'Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.',
       'https://images.pexels.com/photos/3184300/pexels-photo-3184300.jpeg', '/post/third-post',
       '{"date": "2024-01-17"}', 2)
   `);

  // Insert sample forms
  await runQuery(`
      INSERT IGNORE INTO forms (id, name, title, description, settings, created_by)
      VALUES (1, 'contact-form', 'Contact Us', 'Get in touch with us',
              '{"submit_message": "Thank you for your message!", "email_notification": true, "redirect_url": "/thank-you", "email_template_id": 1}',
              1)
   `);

  // Insert form fields
  await runQuery(`
      INSERT IGNORE INTO form_fields (id, form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
      VALUES 
      (1, 1, 'text', 'name', 'Full Name', 'Enter your name', '', TRUE, 0),
      (2, 1, 'email', 'email', 'Email Address', 'Enter your email', '', TRUE, 1),
      (3, 1, 'select', 'subject', 'Subject', '', '["General Inquiry", "Support", "Business"]', TRUE, 2),
      (4, 1, 'textarea', 'message', 'Message', 'Enter your message', '', TRUE, 3)
   `);

  // Insert sample content
  await runQuery(`
      INSERT IGNORE INTO content (id, title, slug, content, excerpt, type, status, meta_title, meta_description, author_id, views)
      VALUES 
      (1, 'Welcome to Our CMS', 'welcome', 
       '<h1>Welcome to Our Headless CMS</h1><p>This is a powerful content management system built with modern technologies.</p>',
       'Welcome to our powerful headless CMS system', 'page', 'published', 
       'Welcome - Headless CMS', 'Welcome to our powerful headless content management system', 1, 0),
      (2, 'About Us', 'about',
       '<h1>About Our Company</h1><p>We are a technology company focused on innovation and excellence.</p>',
       'Learn about our company and mission', 'page', 'published',
       'About Us - Company Information', 'Learn about our company, mission, and values', 1, 0),
      (3, 'First Blog Post', 'first-blog-post',
       '<h1>Our First Blog Post</h1><p>This is our first blog post content...</p>',
       'Welcome to our blog with this first post', 'post', 'published',
       'First Blog Post', 'Read our first blog post about getting started', 1, 5)
   `);

  // Insert email templates
  await runQuery(`
      INSERT IGNORE INTO email_templates (id, name, subject, html_content, text_content, variables, created_by)
      VALUES 
      (1, 'contact-form-notification', 'New Contact Form Submission',
       '<h2>New Contact Form Submission</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Subject:</strong> {{subject}}</p><p><strong>Message:</strong></p><p>{{message}}</p><hr><p><small>Submitted on {{date}} from {{ip}}</small></p>',
       'New Contact Form Submission\\n\\nName: {{name}}\\nEmail: {{email}}\\nSubject: {{subject}}\\nMessage: {{message}}\\n\\nSubmitted on {{date}} from {{ip}}',
       '["name", "email", "subject", "message", "date", "ip"]', 1),
      (2, 'welcome-email', 'Welcome to {{site_name}}',
       '<h1>Welcome to {{site_name}}!</h1><p>Hi {{name}},</p><p>Thank you for joining us. We are excited to have you on board!</p><p>Best regards,<br>The {{site_name}} Team</p>',
       'Welcome to {{site_name}}!\\n\\nHi {{name}},\\n\\nThank you for joining us. We are excited to have you on board!\\n\\nBest regards,\\nThe {{site_name}} Team',
       '["name", "site_name"]', 1)
   `);
}

export async function runQuery(query, params = []) {
  try {
    const [result] = await pool.execute(query, params);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getQuery(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows[0] || null;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function allQuery(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database connections...");
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});
