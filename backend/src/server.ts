import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runMigrations } from './db/database';
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

app.use(express.json());

// Inicializa migrações e seed demonstrativo Multi-tenant
runMigrations();
seedDatabase(false);

// Rota de saúde pública
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'plantao-em-dia-saas-api',
    timestamp: new Date().toISOString()
  });
});

// Rotas de autenticação (Login, Cadastro de Empresa, Sessão atual, Logout)
app.use('/api/auth', authRouter);

// Rotas protegidas — exigem login e isolam os dados exclusivamente pela empresa do usuário logado
app.use('/api/houses', requireAuthMiddleware, housesRouter);
app.use('/api/professionals', requireAuthMiddleware, professionalsRouter);
app.use('/api/shifts', requireAuthMiddleware, shiftsRouter);
app.use('/api/checks', requireAuthMiddleware, checksRouter);
app.use('/api/summary', requireAuthMiddleware, summaryRouter);

// Tratamento para rotas não encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint não encontrado na API.' });
});

// Middleware global de erro
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`[API] Servidor SaaS Plantão em Dia rodando em http://localhost:${PORT}`);
});
