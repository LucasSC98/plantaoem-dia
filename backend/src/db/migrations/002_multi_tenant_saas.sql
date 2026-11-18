-- Migração 002: Estrutura SaaS Multi-tenant (Organizações, Usuários, Sessões e Isolamento por organization_id)

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

-- Garante que exista ao menos a organização padrão (id=1) antes de associar registros existentes
INSERT OR IGNORE INTO organizations (id, name, slug, document, plan)
VALUES (1, 'Cuidar Bem Home Care', 'cuidar-bem', '12.345.678/0001-90', 'Profissional');

-- Adiciona organization_id nas tabelas de domínio
ALTER TABLE houses ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE professionals ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shifts ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE checks ADD COLUMN organization_id INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_houses_org ON houses(organization_id);
CREATE INDEX IF NOT EXISTS idx_professionals_org ON professionals(organization_id);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_checks_org ON checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
