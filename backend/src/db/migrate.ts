import { runMigrations } from './database';

try {
  runMigrations();
  console.log('[DB] Todas as migrações foram verificadas/aplicadas com sucesso.');
} catch (error) {
  console.error('[DB] Falha ao executar migrações:', error);
  process.exit(1);
}
