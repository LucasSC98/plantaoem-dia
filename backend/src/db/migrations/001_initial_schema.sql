-- Migração 001: Criação das tabelas iniciais de casas, profissionais, plantões e checagens
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS houses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  assisted_person TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Cuidador(a)',
  phone TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'indigo',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id INTEGER NOT NULL,
  professional_id INTEGER,
  date TEXT NOT NULL,
  shift_period TEXT NOT NULL DEFAULT 'diurno',
  start_time TEXT NOT NULL DEFAULT '07:00',
  end_time TEXT NOT NULL DEFAULT '19:00',
  shift_type TEXT NOT NULL DEFAULT 'normal',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_house_id ON shifts(house_id);
CREATE INDEX IF NOT EXISTS idx_shifts_professional_id ON shifts(professional_id);
CREATE INDEX IF NOT EXISTS idx_checks_date ON checks(date);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(status);
