import { fileURLToPath } from "url";
import path from "path";
import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "cms.db");
let db;

export function getDatabase() {
   return db;
}

export async function initializeDatabase() {
   return new Promise((resolve, reject) => {
      db = new sqlite3.Database(dbPath, (err) => {
         if (err) {
            console.error("Error opening database:", err);
            reject(err);
            return;
         }
         console.log("📦 Connected to SQLite database");

         // Create tables
         createTables()
            .then(() => {
               console.log("📋 Database tables created");
               resolve();
            })
            .catch(reject);
      });
   });
}

async function createTables() {
   const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
      name TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

      // Content table (enhanced)
      `CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT,
      excerpt TEXT,
      type TEXT DEFAULT 'post' CHECK (type IN ('post', 'page', 'article', 'banner', 'slider', 'menu', 'gallery', 'form')),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      featured_image TEXT,
      meta_title TEXT,
      meta_description TEXT,
      tags TEXT,
      category TEXT,
      author_id INTEGER,
      views INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      template TEXT DEFAULT 'default',
      settings TEXT, -- JSON string for component-specific settings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      FOREIGN KEY (author_id) REFERENCES users (id)
    )`,

      // Dynamic modules table
      `CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('banner', 'slider', 'menu', 'gallery', 'form', 'text', 'table', 'list')),
      title TEXT,
      description TEXT,
      settings TEXT, -- JSON string for module configuration
      data TEXT, -- JSON string for module data
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      sort_order INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`,

      // Module items table (for dynamic content within modules)
      `CREATE TABLE IF NOT EXISTS module_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('slide', 'menu_item', 'gallery_item', 'form_field', 'table_row', 'list_item', 'link')),
      title TEXT,
      content TEXT,
      image_url TEXT,
      link_url TEXT,
      settings TEXT, -- JSON string for item-specific settings
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
    )`,

      // Media table (enhanced)
      `CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      alt_text TEXT,
      caption TEXT,
      category TEXT DEFAULT 'general',
      tags TEXT,
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )`,

      // Content blocks table (for flexible page building)
      `CREATE TABLE IF NOT EXISTS content_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'gallery', 'table', 'list', 'form', 'banner', 'slider', 'menu')),
      block_data TEXT, -- JSON string for block content
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES content (id) ON DELETE CASCADE
    )`,

      // Forms table
      `CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      settings TEXT, -- JSON string for form configuration
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`,

      // Form fields table
      `CREATE TABLE IF NOT EXISTS form_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'file', 'date', 'number')),
      field_name TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_placeholder TEXT,
      field_options TEXT, -- JSON string for select/radio options
      is_required BOOLEAN DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
    )`,

      // Form submissions table
      `CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      submission_data TEXT NOT NULL, -- JSON string of submitted data
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (form_id) REFERENCES forms (id)
    )`,

      // Content versions table
      `CREATE TABLE IF NOT EXISTS content_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (content_id) REFERENCES content (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`,

      // Sessions table for refresh tokens
      `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

      // Email configuration table
      `CREATE TABLE IF NOT EXISTS email_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER NOT NULL,
      smtp_secure BOOLEAN DEFAULT 0,
      smtp_user TEXT NOT NULL,
      smtp_password TEXT NOT NULL,
      from_name TEXT NOT NULL,
      from_email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

      // Email templates table
      `CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      text_content TEXT,
      variables TEXT, -- JSON array of variable names
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`,

      // Email logs table
      `CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_id INTEGER,
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
      message_id TEXT,
      error_message TEXT,
      sent_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES email_templates (id),
      FOREIGN KEY (sent_by) REFERENCES users (id)
    )`,

      // Content module assignments table
      `CREATE TABLE IF NOT EXISTS content_module_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      position TEXT NOT NULL, -- 'header', 'sidebar', 'footer', 'content'
      sort_order INTEGER DEFAULT 0,
      settings TEXT, -- JSON string for assignment-specific settings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES content (id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE,
      UNIQUE(content_id, module_id, position)
    )`
   ];

   const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug)",
      "CREATE INDEX IF NOT EXISTS idx_content_status ON content(status)",
      "CREATE INDEX IF NOT EXISTS idx_content_type ON content(type)",
      "CREATE INDEX IF NOT EXISTS idx_content_author ON content(author_id)",
      "CREATE INDEX IF NOT EXISTS idx_content_created ON content(created_at)",
      "CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media(uploaded_by)",
      "CREATE INDEX IF NOT EXISTS idx_media_category ON media(category)",
      "CREATE INDEX IF NOT EXISTS idx_modules_type ON modules(type)",
      "CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status)",
      "CREATE INDEX IF NOT EXISTS idx_module_items_module ON module_items(module_id)",
      "CREATE INDEX IF NOT EXISTS idx_content_blocks_content ON content_blocks(content_id)",
      "CREATE INDEX IF NOT EXISTS idx_form_fields_form ON form_fields(form_id)",
      "CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id)",
      "CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)",
      "CREATE INDEX IF NOT EXISTS idx_content_module_assignments_content ON content_module_assignments(content_id)",
      "CREATE INDEX IF NOT EXISTS idx_content_module_assignments_module ON content_module_assignments(module_id)"
   ];

   return new Promise((resolve, reject) => {
      const runQueries = async () => {
         try {
            // Create tables
            for (const query of tables) {
               await runQuery(query);
            }

            // Create indexes
            for (const query of indexes) {
               await runQuery(query);
            }

            // Create default admin user and sample data
            await createDefaultUser();
            await createSampleData();
            await createEmailTemplates();

            resolve();
         } catch (error) {
            reject(error);
         }
      };

      runQueries();
   });
}

async function createDefaultUser() {
   const bcryptModule = await import("bcryptjs");
   const hashedPassword = await bcryptModule.default.hash("admin123", 10);

   const query = `
    INSERT OR IGNORE INTO users (email, password, role, name)
    VALUES (?, ?, ?, ?)
  `;

   return runQuery(query, ["admin@cms.com", hashedPassword, "admin", "Admin User"]);
}

async function createSampleData() {
   // Sample banner module
   const bannerSettings = JSON.stringify({
      autoplay: true,
      duration: 5000,
      showArrows: true,
      showDots: true,
   });

   const bannerData = JSON.stringify({
      background_color: "#1a1a1a",
      text_color: "#ffffff",
      overlay_opacity: 0.5,
   });

   await runQuery(
      `
    INSERT OR IGNORE INTO modules (name, type, title, description, settings, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
      ["hero-banner", "banner", "Hero Banner", "Main hero banner for homepage", bannerSettings, bannerData, 1]
   );

   // Sample slider module
   const sliderSettings = JSON.stringify({
      autoplay: true,
      duration: 4000,
      transition: "slide",
      showArrows: true,
      showDots: true,
   });

   await runQuery(
      `
    INSERT OR IGNORE INTO modules (name, type, title, description, settings, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
      ["featured-slider", "slider", "Featured Content Slider", "Slider for featured content", sliderSettings, 1]
   );

   // Sample menu module
   const menuSettings = JSON.stringify({
      layout: "horizontal",
      dropdown: true,
      mobile_responsive: true,
   });

   await runQuery(
      `
    INSERT OR IGNORE INTO modules (name, type, title, description, settings, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
      ["main-menu", "menu", "Main Navigation", "Primary navigation menu", menuSettings, 1]
   );

   // Sample gallery module
   const gallerySettings = JSON.stringify({
      columns: 3,
      lightbox: true,
      lazy_load: true,
      show_captions: true,
   });

   await runQuery(
      `
    INSERT OR IGNORE INTO modules (name, type, title, description, settings, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
      ["photo-gallery", "gallery", "Photo Gallery", "Image gallery component", gallerySettings, 1]
   );

   // Sample form
   await runQuery(
      `
    INSERT OR IGNORE INTO forms (name, title, description, settings, created_by)
    VALUES (?, ?, ?, ?, ?)
  `,
      [
         "contact-form",
         "Contact Us",
         "Get in touch with us",
         JSON.stringify({
            submit_message: "Thank you for your message!",
            email_notification: true,
            redirect_url: "/thank-you",
            email_template_id: 1
         }),
         1,
      ]
   );

   // Sample form fields
   const formFields = [
      { type: 'text', name: 'name', label: 'Full Name', placeholder: 'Enter your name', required: 1, order: 0 },
      { type: 'email', name: 'email', label: 'Email Address', placeholder: 'Enter your email', required: 1, order: 1 },
      { type: 'select', name: 'subject', label: 'Subject', options: JSON.stringify(['General Inquiry', 'Support', 'Business']), required: 1, order: 2 },
      { type: 'textarea', name: 'message', label: 'Message', placeholder: 'Enter your message', required: 1, order: 3 }
   ];

   for (const field of formFields) {
      await runQuery(`
        INSERT OR IGNORE INTO form_fields (form_id, field_type, field_name, field_label, field_placeholder, field_options, is_required, sort_order)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      `, [field.type, field.name, field.label, field.placeholder || '', field.options || '', field.required, field.order]);
   }
}

async function createEmailTemplates() {
   const templates = [
      {
         name: 'contact-form-notification',
         subject: 'New Contact Form Submission',
         html_content: `
           <h2>New Contact Form Submission</h2>
           <p><strong>Name:</strong> {{name}}</p>
           <p><strong>Email:</strong> {{email}}</p>
           <p><strong>Subject:</strong> {{subject}}</p>
           <p><strong>Message:</strong></p>
           <p>{{message}}</p>
           <hr>
           <p><small>Submitted on {{date}} from {{ip}}</small></p>
         `,
         text_content: `
           New Contact Form Submission
           
           Name: {{name}}
           Email: {{email}}
           Subject: {{subject}}
           Message: {{message}}
           
           Submitted on {{date}} from {{ip}}
         `,
         variables: JSON.stringify(['name', 'email', 'subject', 'message', 'date', 'ip'])
      },
      {
         name: 'welcome-email',
         subject: 'Welcome to {{site_name}}',
         html_content: `
           <h1>Welcome to {{site_name}}!</h1>
           <p>Hi {{name}},</p>
           <p>Thank you for joining us. We're excited to have you on board!</p>
           <p>Best regards,<br>The {{site_name}} Team</p>
         `,
         text_content: `
           Welcome to {{site_name}}!
           
           Hi {{name}},
           
           Thank you for joining us. We're excited to have you on board!
           
           Best regards,
           The {{site_name}} Team
         `,
         variables: JSON.stringify(['name', 'site_name'])
      }
   ];

   for (const template of templates) {
      await runQuery(`
        INSERT OR IGNORE INTO email_templates (name, subject, html_content, text_content, variables, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [template.name, template.subject, template.html_content, template.text_content, template.variables, 1]);
   }
}

function runQuery(query, params = []) {
   return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
         if (err) {
            reject(err);
         } else {
            resolve(this);
         }
      });
   });
}

export { runQuery };

export function getQuery(query, params = []) {
   return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
         if (err) {
            reject(err);
         } else {
            resolve(row);
         }
      });
   });
}

export function allQuery(query, params = []) {
   return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
         if (err) {
            reject(err);
         } else {
            resolve(rows);
         }
      });
   });
}