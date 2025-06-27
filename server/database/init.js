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

    // Check if tables exist and create demo data if needed
    await checkAndCreateDemoData();
    console.log("📋 MySQL database ready");
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    console.log("\n💡 To fix this issue:");
    console.log("1. Make sure MySQL is running: docker-compose up -d");
    console.log("2. Or install MySQL manually and update .env file");
    console.log("3. Run: npm run setup:mysql");
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
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.log("⚠️  Tables don't exist. Please run the database setup:");
      console.log("   npm run setup:mysql");
    }
    throw error;
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
      VALUES (?, ?, ?, ?)
   `,
    ["editor@cms.com", editorPassword, "editor", "Content Editor"],
  );

  await runQuery(
    `
      INSERT IGNORE INTO users (email, password, role, name)
      VALUES (?, ?, ?, ?)
   `,
    ["viewer@cms.com", viewerPassword, "viewer", "Content Viewer"],
  );

  // Insert sample modules
  await runQuery(
    `
      INSERT IGNORE INTO modules (name, type, title, description, settings, data, created_by, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      "hero-banner",
      "banner",
      "Hero Banner",
      "Main hero banner for homepage",
      '{"autoplay": true, "duration": 5000, "showArrows": true, "showDots": true}',
      '{"background_color": "#1a1a1a", "text_color": "#ffffff", "overlay_opacity": 0.5}',
      1,
      0,
    ],
  );

  await runQuery(
    `
      INSERT IGNORE INTO modules (name, type, title, description, settings, data, created_by, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      "featured-slider",
      "slider",
      "Featured Content Slider",
      "Slider for featured content",
      '{"autoplay": true, "duration": 4000, "transition": "slide", "showArrows": true, "showDots": true}',
      "{}",
      1,
      1,
    ],
  );

  await runQuery(
    `
      INSERT IGNORE INTO modules (name, type, title, description, settings, data, created_by, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      "main-menu",
      "menu",
      "Main Navigation",
      "Primary navigation menu",
      '{"layout": "horizontal", "dropdown": true, "mobile_responsive": true}',
      "{}",
      1,
      2,
    ],
  );

  await runQuery(
    `
      INSERT IGNORE INTO modules (name, type, title, description, settings, data, created_by, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      "photo-gallery",
      "gallery",
      "Photo Gallery",
      "Image gallery component",
      '{"columns": 3, "lightbox": true, "lazy_load": true, "show_captions": true}',
      "{}",
      1,
      3,
    ],
  );

  // Insert module items for banner
  await runQuery(
    `
      INSERT IGNORE INTO module_items (module_id, type, title, content, image_url, link_url, settings, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      1,
      "slide",
      "Inspiring Innovation",
      "Building the future with cutting-edge technology. Join us on our mission to create innovative solutions that make a difference in the world.",
      "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg",
      "/get-started",
      '{"buttons": [{"text": "Get Started", "url": "/get-started", "style": "primary"}, {"text": "Learn More", "url": "/about", "style": "secondary"}], "alignment": "center"}',
      0,
    ],
  );

  // Insert module items for slider
  await runQuery(
    `
      INSERT IGNORE INTO module_items (module_id, type, title, content, image_url, link_url, settings, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      2,
      "slide",
      "Title of The First Post",
      "Subtitle: A short story of the post goes here as subtitle. Text: This content will have images and content in a nice way.",
      "https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg",
      "/post/first-post",
      '{"date": "2024-01-15"}',
      0,
    ],
  );

  // Insert sample forms
  await runQuery(
    `
      INSERT IGNORE INTO forms (name, title, description, settings, created_by)
      VALUES (?, ?, ?, ?, ?)
   `,
    [
      "contact-form",
      "Contact Us",
      "Get in touch with us",
      '{"submit_message": "Thank you for your message!", "email_notification": true, "redirect_url": "/thank-you", "email_template_id": 1}',
      1,
    ],
  );

  // Insert form fields
  await runQuery(
    `
      INSERT IGNORE INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [1, "text", "name", "Full Name", "Enter your name", "", true, 0],
  );

  await runQuery(
    `
      INSERT IGNORE INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [1, "email", "email", "Email Address", "Enter your email", "", true, 1],
  );

  await runQuery(
    `
      INSERT IGNORE INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      1,
      "select",
      "subject",
      "Subject",
      "",
      '["General Inquiry", "Support", "Business"]',
      true,
      2,
    ],
  );

  await runQuery(
    `
      INSERT IGNORE INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [1, "textarea", "message", "Message", "Enter your message", "", true, 3],
  );

  // Insert sample content
  await runQuery(
    `
      INSERT IGNORE INTO content (title, slug, content, excerpt, type, status, meta_title, meta_description, author_id, views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      "Welcome to Our CMS",
      "welcome",
      "<h1>Welcome to Our Headless CMS</h1><p>This is a powerful content management system built with modern technologies.</p>",
      "Welcome to our powerful headless CMS system",
      "page",
      "published",
      "Welcome - Headless CMS",
      "Welcome to our powerful headless content management system",
      1,
      0,
    ],
  );

  await runQuery(
    `
      INSERT IGNORE INTO content (title, slug, content, excerpt, type, status, meta_title, meta_description, author_id, views)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   `,
    [
      "About Us",
      "about",
      "<h1>About Our Company</h1><p>We are a technology company focused on innovation and excellence.</p>",
      "Learn about our company and mission",
      "page",
      "published",
      "About Us - Company Information",
      "Learn about our company, mission, and values",
      1,
      0,
    ],
  );

  // Insert email templates
  await runQuery(
    `
      INSERT IGNORE INTO email_templates (name, subject, html_content, text_content, variables, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
   `,
    [
      "contact-form-notification",
      "New Contact Form Submission",
      "<h2>New Contact Form Submission</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Subject:</strong> {{subject}}</p><p><strong>Message:</strong></p><p>{{message}}</p><hr><p><small>Submitted on {{date}} from {{ip}}</small></p>",
      "New Contact Form Submission\n\nName: {{name}}\nEmail: {{email}}\nSubject: {{subject}}\nMessage: {{message}}\n\nSubmitted on {{date}} from {{ip}}",
      '["name", "email", "subject", "message", "date", "ip"]',
      1,
    ],
  );
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
  console.log("Closing MySQL connections...");
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});
