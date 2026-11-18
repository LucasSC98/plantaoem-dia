import { runMigrations, pool } from './database';

async function main() {
  try {
    await runMigrations();
    console.log('[Neon Postgres] Todas as migrações foram verificadas/aplicadas com sucesso.');
    await pool.end();
  } catch (error) {
    console.error('[Neon Postgres] Falha ao executar migrações:', error);
    process.exit(1);
  }
}

main();
