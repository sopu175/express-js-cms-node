#!/usr/bin/env node

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
};

const DB_NAME = process.env.DB_NAME || "headless_cms";

async function setupDatabase() {
  let connection;

  try {
    console.log("🔌 Connecting to MySQL server...");
    connection = await mysql.createConnection(DB_CONFIG);

    console.log("📝 Creating database...");
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );

    console.log("🗄️  Using database...");
    await connection.execute(`USE ${DB_NAME}`);

    console.log("📋 Reading SQL file...");
    const sqlFile = path.join(__dirname, "database.sql");

    if (!fs.existsSync(sqlFile)) {
      throw new Error(
        "database.sql file not found! Please make sure it exists in the project root.",
      );
    }

    const sql = fs.readFileSync(sqlFile, "utf8");

    // Split SQL commands and execute them
    const commands = sql.split(";").filter((cmd) => cmd.trim().length > 0);

    console.log("⚡ Executing SQL commands...");
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command && !command.startsWith("--")) {
        try {
          await connection.execute(command);
          if (i % 10 === 0) {
            console.log(
              `   Progress: ${i + 1}/${commands.length} commands executed`,
            );
          }
        } catch (error) {
          // Skip errors for duplicate entries (demo data)
          if (
            !error.message.includes("Duplicate entry") &&
            !error.message.includes("already exists")
          ) {
            console.warn(`   Warning on command ${i + 1}: ${error.message}`);
          }
        }
      }
    }

    console.log("✅ Database setup completed successfully!");
    console.log("");
    console.log("🎉 Demo Data Created:");
    console.log("   👤 Admin User: admin@cms.com / admin123");
    console.log("   👤 Editor User: editor@cms.com / editor123");
    console.log("   👤 Viewer User: viewer@cms.com / viewer123");
    console.log("");
    console.log("📚 API Documentation: http://localhost:3001/api/docs");
    console.log("");
    console.log("🚀 Ready to start development server with: npm run dev");
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("");
      console.log("💡 Troubleshooting:");
      console.log("   • Make sure MySQL server is running");
      console.log("   • Check your database credentials in .env file");
      console.log("   • Verify MySQL is listening on port 3306");
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
console.log("🛠️  MySQL Database Setup for Headless CMS");
console.log("==========================================");
setupDatabase();
