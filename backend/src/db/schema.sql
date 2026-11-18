-- Schema principal do banco de dados SQLite (Plantão em Dia — SaaS Multi-tenant)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  document TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'Profissional',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS houses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  assisted_person TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Cuidador(a)',
  phone TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'indigo',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL DEFAULT 1,
  house_id INTEGER NOT NULL,
  professional_id INTEGER,
  date TEXT NOT NULL,
  shift_period TEXT NOT NULL DEFAULT 'diurno',
  start_time TEXT NOT NULL DEFAULT '07:00',
  end_time TEXT NOT NULL DEFAULT '19:00',
  shift_type TEXT NOT NULL DEFAULT 'normal',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL DEFAULT 1,
  shift_id INTEGER NOT NULL UNIQUE,
  house_id INTEGER NOT NULL,
  professional_id INTEGER,
  date TEXT NOT NULL,
  shift_period TEXT NOT NULL DEFAULT 'diurno',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  checked_at TEXT,
  checked_by TEXT NOT NULL DEFAULT 'Coordenação',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL
);
