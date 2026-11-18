import { Router, Request, Response } from 'express';
import { pool, withTransaction } from '../db/database';
import {
  generateSessionToken,
  hashPassword,
  slugify,
  verifyPassword
} from '../utils/security';
import { seedStarterDataForNewOrganization } from '../db/seed';
import { requireAuthMiddleware } from '../middleware/tenantAuth';
import { Organization, User } from '../types';

const router = Router();

// Retornar dados apenas do usuário logado e da SUA própria empresa
router.get('/me', requireAuthMiddleware, (req: Request, res: Response) => {
  res.json({
    organization: req.organization || null,
    user: req.user || null
  });
});

// Login corporativo por e-mail e senha
router.post('/login', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Informe seu e-mail e sua senha para entrar.' });
      return;
    }

    const userRes = await pool.query<User & { password_hash: string }>(
      'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );
    const userRow = userRes.rows[0];

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      res.status(401).json({ error: 'E-mail ou senha incorretos. Verifique suas credenciais.' });
      return;
    }

    const orgRes = await pool.query<Organization>(
      'SELECT * FROM organizations WHERE id = $1 LIMIT 1',
      [userRow.organization_id]
    );
    const org = orgRes.rows[0];

    if (!org) {
      res.status(404).json({ error: 'Empresa vinculada a este usuário não encontrada.' });
      return;
    }

    const token = generateSessionToken();
    await pool.query(
      'INSERT INTO sessions (token, user_id, organization_id) VALUES ($1, $2, $3)',
      [token, userRow.id, org.id]
    );

    res.json({
      token,
      organization: org,
      user: {
        id: userRow.id,
        organization_id: userRow.organization_id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        created_at: userRow.created_at
      }
    });
  } catch (err) {
    console.error('[API] Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});

// Cadastro de nova empresa e seu coordenador/administrador no SaaS
router.post('/register', async (req: Request, res: Response) => {
  try {
    const organizationName =
      typeof req.body?.organizationName === 'string' ? req.body.organizationName.trim() : '';
    const document = typeof req.body?.document === 'string' ? req.body.document.trim() : '';
    const plan = typeof req.body?.plan === 'string' ? req.body.plan.trim() : 'Profissional';
    const userName = typeof req.body?.userName === 'string' ? req.body.userName.trim() : '';
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const seedSampleData = Boolean(req.body?.seedSampleData);

    const errors: string[] = [];
    if (!organizationName || organizationName.length < 2) {
      errors.push('O nome da empresa é obrigatório (mínimo 2 caracteres).');
    }
    if (!userName || userName.length < 2) {
      errors.push('O seu nome é obrigatório.');
    }
    if (!email || !email.includes('@')) {
      errors.push('Informe um e-mail corporativo válido.');
    }
    if (!password || password.length < 4) {
      errors.push('A senha deve ter pelo menos 4 caracteres.');
    }

    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(' '), errors });
      return;
    }

    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );
    if ((existingEmail.rowCount ?? 0) > 0) {
      res.status(400).json({ error: 'Este e-mail já está em uso por outra conta.' });
      return;
    }

    let baseSlug = slugify(organizationName) || 'empresa';
    const existingSlug = await pool.query(
      'SELECT id FROM organizations WHERE slug = $1 LIMIT 1',
      [baseSlug]
    );
    if ((existingSlug.rowCount ?? 0) > 0) {
      baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const passwordHash = hashPassword(password);
    const token = generateSessionToken();

    const { createdOrg, createdUser } = await withTransaction(async (client) => {
      const orgResult = await client.query<Organization>(
        `INSERT INTO organizations (name, slug, document, plan)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [organizationName, baseSlug, document, plan || 'Profissional']
      );
      const org = orgResult.rows[0];

      const userResult = await client.query<User>(
        `INSERT INTO users (organization_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'Coordenação')
         RETURNING id, organization_id, name, email, role, created_at`,
        [org.id, userName, email, passwordHash]
      );
      const user = userResult.rows[0];

      if (seedSampleData) {
        await seedStarterDataForNewOrganization(client, org.id, organizationName);
      }

      await client.query(
        'INSERT INTO sessions (token, user_id, organization_id) VALUES ($1, $2, $3)',
        [token, user.id, org.id]
      );

      return { createdOrg: org, createdUser: user };
    });

    res.status(201).json({
      token,
      organization: createdOrg,
      user: createdUser
    });
  } catch (err) {
    console.error('[API] Erro ao registrar nova empresa SaaS:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar nova empresa.' });
  }
});

// Logout da conta atual
router.post('/logout', requireAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.sessionToken) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [req.sessionToken]);
    }
    res.json({ message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    console.error('[API] Erro ao encerrar sessão:', err);
    res.status(500).json({ error: 'Erro ao encerrar sessão.' });
  }
});

export default router;
