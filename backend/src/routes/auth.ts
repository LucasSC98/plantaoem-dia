import { Router, Request, Response } from 'express';
import { db } from '../db/database';
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

// Login corporativo por e-mail e senha (vincula o acesso exclusivamente à empresa daquele e-mail)
router.post('/login', (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Informe seu e-mail e sua senha para entrar.' });
      return;
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ?')
      .get(email) as unknown as
      | (User & { password_hash: string })
      | undefined;

    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      res.status(401).json({ error: 'E-mail ou senha incorretos. Verifique suas credenciais.' });
      return;
    }

    const org = db
      .prepare('SELECT * FROM organizations WHERE id = ?')
      .get(userRow.organization_id) as unknown as Organization | undefined;

    if (!org) {
      res.status(404).json({ error: 'Empresa vinculada a este usuário não encontrada.' });
      return;
    }

    const token = generateSessionToken();
    db.prepare('INSERT INTO sessions (token, user_id, organization_id) VALUES (?, ?, ?)').run(
      token,
      userRow.id,
      org.id
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
router.post('/register', (req: Request, res: Response) => {
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

    const existingEmail = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
      .get(email);
    if (existingEmail) {
      res.status(400).json({ error: 'Este e-mail já está em uso por outra conta.' });
      return;
    }

    let baseSlug = slugify(organizationName) || 'empresa';
    const existingSlug = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(baseSlug);
    if (existingSlug) {
      baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const passwordHash = hashPassword(password);
    const token = generateSessionToken();

    db.exec('BEGIN TRANSACTION;');
    let orgId: number;
    let userId: number;
    try {
      const orgResult = db
        .prepare(`
          INSERT INTO organizations (name, slug, document, plan)
          VALUES (?, ?, ?, ?)
        `)
        .run(organizationName, baseSlug, document, plan || 'Profissional');
      orgId = Number(orgResult.lastInsertRowid);

      const userResult = db
        .prepare(`
          INSERT INTO users (organization_id, name, email, password_hash, role)
          VALUES (?, ?, ?, ?, 'Coordenação')
        `)
        .run(orgId, userName, email, passwordHash);
      userId = Number(userResult.lastInsertRowid);

      if (seedSampleData) {
        seedStarterDataForNewOrganization(orgId, organizationName);
      }

      db.prepare('INSERT INTO sessions (token, user_id, organization_id) VALUES (?, ?, ?)').run(
        token,
        userId,
        orgId
      );

      db.exec('COMMIT;');
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }

    const createdOrg = db
      .prepare('SELECT * FROM organizations WHERE id = ?')
      .get(orgId) as unknown as Organization;
    const createdUser = db
      .prepare('SELECT id, organization_id, name, email, role, created_at FROM users WHERE id = ?')
      .get(userId) as unknown as User;

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
router.post('/logout', requireAuthMiddleware, (req: Request, res: Response) => {
  try {
    if (req.sessionToken) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
    }
    res.json({ message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    console.error('[API] Erro ao encerrar sessão:', err);
    res.status(500).json({ error: 'Erro ao encerrar sessão.' });
  }
});

export default router;
