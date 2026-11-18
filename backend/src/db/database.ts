import { Pool, Client, PoolClient } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Carrega variáveis do root (.env.local / .env) geradas pelo `neon deploy` e do backend (.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pooledConnectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
const unpooledConnectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!pooledConnectionString) {
  throw new Error(
    '[DB] Variável DATABASE_URL não encontrada. Execute `neon deploy` ou configure o arquivo .env.'
  );
}

// Pool de conexões (Pooled -pooler) para o tráfego normal da aplicação
export const pool = new Pool({
  connectionString: pooledConnectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool do Postgres (Neon):', err);
});

/**
 * Executa uma função dentro de uma transação PostgreSQL segura (BEGIN / COMMIT / ROLLBACK)
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Executa as migrações SQL usando a conexão direta (DATABASE_URL_UNPOOLED),
 * conforme recomendado pelas boas práticas do Lakebase Postgres no Neon.
 */
export async function runMigrations(): Promise<void> {
  const client = new Client({
    connectionString: unpooledConnectionString || pooledConnectionString
  });

  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const candidateDirs = [
      path.resolve(__dirname, 'migrations'),
      path.resolve(__dirname, '../../src/db/migrations'),
      path.resolve(process.cwd(), 'src/db/migrations'),
      path.resolve(process.cwd(), 'backend/src/db/migrations')
    ];
    const migrationsDir = candidateDirs.find((dir) => fs.existsSync(dir));
    if (!migrationsDir) {
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const existing = await client.query('SELECT id FROM migrations WHERE name = $1', [file]);
      if (existing.rowCount === 0) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`[Neon Postgres] Migração aplicada com sucesso: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[Neon Postgres] Erro ao aplicar migração ${file}:`, err);
          throw err;
        }
      }
    }
  } finally {
    await client.end();
  }
}
