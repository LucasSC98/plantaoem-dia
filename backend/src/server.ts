import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { pool, runMigrations } from './db/database';
import { seedDatabase } from './db/seed';
import { requireAuthMiddleware } from './middleware/tenantAuth';
import authRouter from './routes/auth';
import housesRouter from './routes/houses';
import professionalsRouter from './routes/professionals';
import shiftsRouter from './routes/shifts';
import checksRouter from './routes/checks';
import summaryRouter from './routes/summary';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '5mb' }));

// Rota de saúde pública (verifica conexão ativa com o Lakebase Postgres no Neon)
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await pool.query<{ now: string }>('SELECT NOW()::text as now');
    res.json({
      status: 'ok',
      service: 'plantao-em-dia-saas-api',
      database: 'neon-lakebase-postgres',
      dbTime: dbCheck.rows[0]?.now,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err instanceof Error ? err.message : 'Database connection failed'
    });
  }
});

// Rotas de autenticação (Login, Cadastro de Empresa, Sessão atual, Logout)
app.use('/api/auth', authRouter);

// Rotas protegidas — exigem login e isolam os dados exclusivamente pela empresa do usuário logado
app.use('/api/houses', requireAuthMiddleware, housesRouter);
app.use('/api/professionals', requireAuthMiddleware, professionalsRouter);
app.use('/api/shifts', requireAuthMiddleware, shiftsRouter);
app.use('/api/checks', requireAuthMiddleware, checksRouter);
app.use('/api/summary', requireAuthMiddleware, summaryRouter);

// Tratamento para rotas /api/* não encontradas
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint não encontrado na API.' });
});

// Em produção (ex: Render Web Service unificado), serve também o frontend compilado (frontend/dist)
const candidateFrontendDist = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist')
];
const frontendDistDir = candidateFrontendDist.find((dir) =>
  fs.existsSync(path.join(dir, 'index.html'))
);

if (frontendDistDir) {
  app.use(express.static(frontendDistDir));
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
} else {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint não encontrado na API.' });
  });
}

// Middleware global de erro
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

async function startServer() {
  try {
    await runMigrations();
    await seedDatabase(false);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[API] Servidor SaaS Plantão em Dia (Neon Lakebase Postgres) rodando na porta ${PORT}`
      );
    });
  } catch (err) {
    console.error('[API] Falha ao iniciar servidor com Neon Postgres:', err);
    process.exit(1);
  }
}

startServer();
