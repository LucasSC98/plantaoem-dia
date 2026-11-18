import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const dbRelativePath = process.env.DB_PATH || './data/plantao.sqlite';
const dbAbsolutePath = path.resolve(process.cwd(), dbRelativePath);
const dbDir = path.dirname(dbAbsolutePath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbAbsolutePath);

// Enable foreign keys and WAL mode for better concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const checkStmt = db.prepare('SELECT id FROM migrations WHERE name = ?');
  const insertStmt = db.prepare('INSERT INTO migrations (name) VALUES (?)');

  for (const file of files) {
    const existing = checkStmt.get(file);
    if (!existing) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec(sql);
        insertStmt.run(file);
        db.exec('COMMIT;');
        console.log(`[DB] Migração aplicada: ${file}`);
      } catch (err) {
        db.exec('ROLLBACK;');
        console.error(`[DB] Erro ao aplicar migração ${file}:`, err);
        throw err;
      }
    }
  }
}
