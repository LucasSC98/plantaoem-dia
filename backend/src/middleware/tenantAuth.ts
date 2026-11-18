import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/database';
import { Organization, User } from '../types';

declare global {
  namespace Express {
    interface Request {
      organizationId: number;
      organization?: Organization;
      user?: User;
      sessionToken?: string;
    }
  }
}

export async function requireAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Acesso não autorizado. Faça login com o e-mail da sua empresa para continuar.'
      });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({
        error: 'Token de autenticação ausente. Faça login novamente.'
      });
      return;
    }

    const sessionRes = await pool.query<{
      token: string;
      organization_id: number;
      user_id: number;
      user_name: string;
      user_email: string;
      user_role: string;
      user_created_at: string;
      org_name: string;
      org_slug: string;
      org_document: string;
      org_plan: string;
      org_created_at: string;
    }>(
      `SELECT
        s.token,
        s.organization_id,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        u.created_at::text as user_created_at,
        o.name as org_name,
        o.slug as org_slug,
        o.document as org_document,
        o.plan as org_plan,
        o.created_at::text as org_created_at
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN organizations o ON o.id = s.organization_id
      WHERE s.token = $1`,
      [token]
    );

    const sessionRow = sessionRes.rows[0];
    if (!sessionRow) {
      res.status(401).json({
        error: 'Sessão inválida ou expirada. Faça login novamente.'
      });
      return;
    }

    req.organizationId = sessionRow.organization_id;
    req.sessionToken = sessionRow.token;
    req.user = {
      id: sessionRow.user_id,
      organization_id: sessionRow.organization_id,
      name: sessionRow.user_name,
      email: sessionRow.user_email,
      role: sessionRow.user_role,
      created_at: sessionRow.user_created_at
    };
    req.organization = {
      id: sessionRow.organization_id,
      name: sessionRow.org_name,
      slug: sessionRow.org_slug,
      document: sessionRow.org_document,
      plan: sessionRow.org_plan,
      created_at: sessionRow.org_created_at
    };

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Erro ao validar sessão no Postgres:', err);
    res.status(500).json({ error: 'Erro interno ao verificar autenticação.' });
  }
}
