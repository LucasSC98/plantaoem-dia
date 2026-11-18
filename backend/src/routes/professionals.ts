import { Router, Request, Response } from 'express';
import { pool, withTransaction } from '../db/database';
import { validateProfessionalInput } from '../validators';
import { Professional } from '../types';

const router = Router();

// Listar todos os profissionais da empresa atual (Tenant)
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const result = await pool.query<Professional>(
      'SELECT * FROM professionals WHERE organization_id = $1 ORDER BY active DESC, name ASC',
      [orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[API] Erro ao listar profissionais:', err);
    res.status(500).json({ error: 'Erro ao buscar profissionais cadastrados.' });
  }
});

// Buscar profissional por ID (isolado por empresa)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const result = await pool.query<Professional>(
      'SELECT * FROM professionals WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [id, orgId]
    );
    const prof = result.rows[0];
    if (!prof) {
      res.status(404).json({ error: 'Profissional não encontrado nesta empresa.' });
      return;
    }
    res.json(prof);
  } catch (err) {
    console.error('[API] Erro ao buscar profissional:', err);
    res.status(500).json({ error: 'Erro interno ao buscar profissional.' });
  }
});

// Cadastrar novo profissional na empresa atual
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const validation = validateProfessionalInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, role = 'Cuidador(a)', phone = '', avatar_color = 'indigo', active = 1 } = req.body;
    const result = await pool.query<Professional>(
      `INSERT INTO professionals (organization_id, name, role, phone, avatar_color, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        orgId,
        String(name).trim(),
        String(role).trim(),
        String(phone || '').trim(),
        String(avatar_color || 'indigo').trim(),
        active ? 1 : 0
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[API] Erro ao cadastrar profissional:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar profissional.' });
  }
});

// Atualizar profissional da empresa atual
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);

    const validation = validateProfessionalInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, role = 'Cuidador(a)', phone = '', avatar_color = 'indigo', active = 1 } = req.body;
    const result = await pool.query<Professional>(
      `UPDATE professionals
       SET name = $1, role = $2, phone = $3, avatar_color = $4, active = $5
       WHERE id = $6 AND organization_id = $7
       RETURNING *`,
      [
        String(name).trim(),
        String(role).trim(),
        String(phone || '').trim(),
        String(avatar_color || 'indigo').trim(),
        active ? 1 : 0,
        id,
        orgId
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Profissional não encontrado nesta empresa para edição.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[API] Erro ao atualizar profissional:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar profissional.' });
  }
});

// Remover profissional da empresa atual
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);

    const existing = await pool.query(
      'SELECT id FROM professionals WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [id, orgId]
    );
    if (existing.rowCount === 0) {
      res.status(404).json({ error: 'Profissional não encontrado nesta empresa para exclusão.' });
      return;
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE shifts
         SET professional_id = NULL,
             shift_type = CASE WHEN shift_type = 'no_schedule' THEN 'no_schedule' ELSE 'unassigned' END
         WHERE professional_id = $1 AND organization_id = $2`,
        [id, orgId]
      );
      await client.query(
        'DELETE FROM checks WHERE professional_id = $1 AND organization_id = $2',
        [id, orgId]
      );
      await client.query(
        'DELETE FROM professionals WHERE id = $1 AND organization_id = $2',
        [id, orgId]
      );
    });

    res.json({
      message:
        'Profissional removido com sucesso. Plantões vinculados foram marcados como "Sem profissional definido".',
      id
    });
  } catch (err) {
    console.error('[API] Erro ao remover profissional:', err);
    res.status(500).json({ error: 'Erro interno ao remover profissional.' });
  }
});

export default router;
