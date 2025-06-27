import mysql from "mysql2/promise";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import bcryptjs from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool;
let db;
let useMySQL = false;

export function getDatabase() {
  return useMySQL ? pool : db;
}

export async function initializeDatabase() {
  // Try MySQL first, fallback to SQLite for development
  try {
    await initializeMySQL();
  } catch (mysqlError) {
    console.log(
      "📦 MySQL not available, falling back to SQLite for development",
    );
    console.log("💡 For production, set up MySQL using: npm run docker:up");
    await initializeSQLite();
  }
}

async function initializeMySQL() {
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
  useMySQL = true;

  // Check if tables exist and create demo data if needed
  await checkAndCreateDemoData();
  console.log("📋 MySQL database ready");
}

async function initializeSQLite() {
  const dbPath = path.join(__dirname, "cms.db");

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error("Error opening SQLite database:", err);
        reject(err);
        return;
      }
      console.log("📦 Connected to SQLite database (development mode)");
      useMySQL = false;

      try {
        await createSQLiteTables();
        await createDemoData();
        console.log("📋 SQLite database ready with demo data");
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function checkAndCreateDemoData() {
  try {
    if (useMySQL) {
      // Check if users table has data
      const [rows] = await pool.execute("SELECT COUNT(*) as count FROM users");

      if (rows[0].count === 0) {
        console.log("📝 Creating demo data...");
        await createDemoData();
        console.log("✅ Demo data created successfully");
      }
    }
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      console.log("⚠️  Tables don't exist. Please run the database setup:");
      console.log("   npm run setup:mysql");
    }
    throw error;
  }
}

async function createSQLiteTables() {
  const tables = [
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
         settings TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         published_at DATETIME,
         FOREIGN KEY (author_id) REFERENCES users (id)
      )`,

    `CREATE TABLE IF NOT EXISTS modules (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         type TEXT NOT NULL CHECK (type IN ('banner', 'slider', 'menu', 'gallery', 'form', 'text', 'table', 'list')),
         title TEXT,
         description TEXT,
         settings TEXT,
         data TEXT,
         status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
         sort_order INTEGER DEFAULT 0,
         created_by INTEGER,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

    `CREATE TABLE IF NOT EXISTS module_items (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         module_id INTEGER NOT NULL,
         type TEXT NOT NULL CHECK (type IN ('slide', 'menu_item', 'gallery_item', 'form_field', 'table_row', 'list_item', 'link')),
         title TEXT,
         content TEXT,
         image_url TEXT,
         link_url TEXT,
         settings TEXT,
         sort_order INTEGER DEFAULT 0,
         status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
      )`,

    `CREATE TABLE IF NOT EXISTS forms (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL,
         title TEXT NOT NULL,
         description TEXT,
         settings TEXT,
         status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
         created_by INTEGER,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

    `CREATE TABLE IF NOT EXISTS form_fields (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         form_id INTEGER NOT NULL,
         field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'file', 'date', 'number')),
         field_name TEXT NOT NULL,
         field_label TEXT NOT NULL,
         field_placeholder TEXT,
         field_options TEXT,
         is_required BOOLEAN DEFAULT 0,
         sort_order INTEGER DEFAULT 0,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
      )`,

    `CREATE TABLE IF NOT EXISTS sessions (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id INTEGER NOT NULL,
         refresh_token TEXT NOT NULL,
         expires_at DATETIME NOT NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
  ];

  for (const query of tables) {
    await runSQLiteQuery(query);
  }
}

function runSQLiteQuery(query, params = []) {
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

async function createDemoData() {
  const hashedPassword = await bcryptjs.hash("admin123", 10);

  // Insert default admin user
  const insertIgnore = useMySQL
    ? "INSERT IGNORE INTO"
    : "INSERT OR IGNORE INTO";

  await runQuery(
    `
      ${insertIgnore} users (email, password, role, name)
      VALUES (?, ?, ?, ?)
   `,
    ["admin@cms.com", hashedPassword, "admin", "Admin User"],
  );

  // Insert sample users (one by one for compatibility)
  const editorPassword = await bcryptjs.hash("editor123", 10);
  const viewerPassword = await bcryptjs.hash("viewer123", 10);

  await runQuery(
    `
      ${insertIgnore} users (email, password, role, name)
      VALUES (?, ?, ?, ?)
   `,
    ["editor@cms.com", editorPassword, "editor", "Content Editor"],
  );

  await runQuery(
    `
      ${insertIgnore} users (email, password, role, name)
      VALUES (?, ?, ?, ?)
   `,
    ["viewer@cms.com", viewerPassword, "viewer", "Content Viewer"],
  );

  // Insert sample modules
  await runQuery(
    `
      ${insertIgnore} modules (name, type, title, description, settings, data, created_by, sort_order)
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
      ${insertIgnore} modules (name, type, title, description, settings, data, created_by, sort_order)
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

  // Insert sample content
  await runQuery(
    `
      ${insertIgnore} content (title, slug, content, excerpt, type, status, meta_title, meta_description, author_id, views)
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

  // Insert sample forms
  await runQuery(
    `
      ${insertIgnore} forms (name, title, description, settings, created_by)
      VALUES (?, ?, ?, ?, ?)
   `,
    [
      "contact-form",
      "Contact Us",
      "Get in touch with us",
      '{"submit_message": "Thank you for your message!", "email_notification": true, "redirect_url": "/thank-you"}',
      1,
    ],
  );

  // Insert form fields
  await runQuery(
    `
      ${insertIgnore} form_fields (form_id, field_type, field_name, field_label, field_placeholder, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
   `,
    [1, "text", "name", "Full Name", "Enter your name", 1, 0],
  );

  await runQuery(
    `
      ${insertIgnore} form_fields (form_id, field_type, field_name, field_label, field_placeholder, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
   `,
    [1, "email", "email", "Email Address", "Enter your email", 1, 1],
  );
}

export async function runQuery(query, params = []) {
  try {
    if (useMySQL) {
      const [result] = await pool.execute(query, params);
      return result;
    } else {
      return await runSQLiteQuery(query, params);
    }
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getQuery(query, params = []) {
  try {
    if (useMySQL) {
      const [rows] = await pool.execute(query, params);
      return rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        });
      });
    }
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function allQuery(query, params = []) {
  try {
    if (useMySQL) {
      const [rows] = await pool.execute(query, params);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    }
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
