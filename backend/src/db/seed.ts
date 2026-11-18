import { PoolClient } from 'pg';
import { pool, runMigrations, withTransaction } from './database';
import { hashPassword } from '../utils/security';

export async function seedStarterDataForNewOrganization(
  client: PoolClient,
  organizationId: number,
  companyName: string
): Promise<void> {
  const h1Res = await client.query<{ id: number }>(
    `INSERT INTO houses (organization_id, name, assisted_person, neighborhood, address, notes, active)
     VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING id`,
    [
      organizationId,
      `Residência Central (${companyName})`,
      'Sr. Alberto (Exemplo)',
      'Centro',
      'Av. Principal, 100 · Apto 202',
      'Atendimento diurno padrão (Dados demonstrativos)'
    ]
  );
  const h1 = h1Res.rows[0].id;

  const p1Res = await client.query<{ id: number }>(
    `INSERT INTO professionals (organization_id, name, role, phone, avatar_color, active)
     VALUES ($1, 'Aline', 'Cuidadora Sênior', '(11) 99000-1111', 'indigo', 1) RETURNING id`,
    [organizationId]
  );
  const p1 = p1Res.rows[0].id;

  const todayIso = new Date().toISOString().slice(0, 10);
  const s1Res = await client.query<{ id: number }>(
    `INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
     VALUES ($1, $2, $3, $4, 'diurno', '07:00', '19:00', 'normal', 'Plantão inicial demonstrativo') RETURNING id`,
    [organizationId, h1, p1, todayIso]
  );

  await client.query(
    `INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
     VALUES ($1, $2, $3, $4, $5, 'diurno', 'pending', 'Coordenação', '')`,
    [organizationId, s1Res.rows[0].id, h1, p1, todayIso]
  );
}

export async function seedDatabase(forceReset = false): Promise<void> {
  await runMigrations();

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = 'coordenacao@cuidare.com.br' LIMIT 1"
  );

  if ((existingUser.rowCount ?? 0) > 0 && !forceReset) {
    return;
  }

  console.log('[Neon Postgres] Inicializando contas empresariais no banco...');

  await withTransaction(async (client) => {
    if (forceReset) {
      await client.query('DELETE FROM checks');
      await client.query('DELETE FROM shifts');
      await client.query('DELETE FROM professionals');
      await client.query('DELETE FROM houses');
      await client.query('DELETE FROM sessions');
      await client.query('DELETE FROM users');
      await client.query('DELETE FROM organizations');
    }

    const passwordHash = hashPassword('123456');

    const org1Res = await client.query<{ id: number }>(
      `INSERT INTO organizations (name, slug, document, plan)
       VALUES ('Cuidare Home Care', 'cuidare', '12.345.678/0001-90', 'Profissional')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const org1Id = org1Res.rows[0].id;

    const org2Res = await client.query<{ id: number }>(
      `INSERT INTO organizations (name, slug, document, plan)
       VALUES ('Vida Plena Assistência', 'vida-plena', '98.765.432/0001-10', 'Enterprise')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const org2Id = org2Res.rows[0].id;

    await client.query(
      `INSERT INTO users (organization_id, name, email, password_hash, role)
       VALUES ($1, 'Coordenadora Cuidare', 'coordenacao@cuidare.com.br', $2, 'Coordenadora')
       ON CONFLICT (email) DO UPDATE SET organization_id = EXCLUDED.organization_id, password_hash = EXCLUDED.password_hash`,
      [org1Id, passwordHash]
    );

    await client.query(
      `INSERT INTO users (organization_id, name, email, password_hash, role)
       VALUES ($1, 'Coordenadora Vida Plena', 'coordenacao@vidaplena.com.br', $2, 'Coordenadora')
       ON CONFLICT (email) DO UPDATE SET organization_id = EXCLUDED.organization_id, password_hash = EXCLUDED.password_hash`,
      [org2Id, passwordHash]
    );
  });

  console.log('[Neon Postgres] Contas empresariais configuradas com sucesso.');
}

if (require.main === module) {
  seedDatabase(true)
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
