import { db, runMigrations } from './database';
import { hashPassword } from '../utils/security';

export function seedStarterDataForNewOrganization(
  _organizationId: number,
  _companyName: string
): void {
  // Mantido vazio por padrão para que toda empresa comece com o banco limpo;
  // Os 3 dias de exemplos demonstrativos ficam separados no frontend sem poluir o banco.
}

export function seedDatabase(forceReset = false): void {
  runMigrations();

  const cuidareUser = db
    .prepare("SELECT id FROM users WHERE email = 'coordenacao@cuidare.com.br'")
    .get();

  if (cuidareUser && !forceReset) {
    return;
  }

  console.log('[DB] Inicializando contas empresariais (banco limpo, sem exemplos no SQLite)...');

  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM checks;');
    db.exec('DELETE FROM shifts;');
    db.exec('DELETE FROM professionals;');
    db.exec('DELETE FROM houses;');
    db.exec('DELETE FROM users;');
    db.exec('DELETE FROM organizations;');
    db.exec(
      "DELETE FROM sqlite_sequence WHERE name IN ('organizations', 'users', 'houses', 'professionals', 'shifts', 'checks');"
    );

    const passwordHash = hashPassword('123456');

    const insertOrg = db.prepare(`
      INSERT INTO organizations (id, name, slug, document, plan)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertOrg.run(1, 'Cuidare Home Care', 'cuidare', '12.345.678/0001-90', 'Profissional');
    insertOrg.run(
      2,
      'Vida Plena Assistência',
      'vida-plena',
      '98.765.432/0001-10',
      'Enterprise'
    );

    const insertUser = db.prepare(`
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run(
      1,
      'Coordenadora Cuidare',
      'coordenacao@cuidare.com.br',
      passwordHash,
      'Coordenadora'
    );
    insertUser.run(
      2,
      'Coordenadora Vida Plena',
      'coordenacao@vidaplena.com.br',
      passwordHash,
      'Coordenadora'
    );

    db.exec('COMMIT;');
    console.log('[DB] Contas configuradas com banco de escalas limpo.');
  } catch (error) {
    db.exec('ROLLBACK;');
    console.error('[DB] Erro ao inicializar banco:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase(true);
}
