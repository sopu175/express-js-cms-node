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
  // Try MySQL first, fallback to SQLite if MySQL is not available
  try {
    await initializeMySQL();
  } catch (mysqlError) {
    console.log("📦 MySQL not available, falling back to SQLite");
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

  // Check if tables exist, if not run demo data insertion
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
      console.log("📦 Connected to SQLite database");
      useMySQL = false;

      try {
        await createSQLiteTables();
        await createDemoData();
        console.log("📋 SQLite database ready");
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
    console.log(
      "⚠️  Tables might not exist. Please run the database.sql file first.",
    );
    console.log("Error:", error.message);
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

  // Insert sample users
  const editorPassword = await bcryptjs.hash("editor123", 10);
  const viewerPassword = await bcryptjs.hash("viewer123", 10);

  // Insert users one by one for SQLite compatibility
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

  // Insert sample modules if they don't exist
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
  console.log("Closing database connections...");
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});
