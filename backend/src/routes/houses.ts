import { Router, Request, Response } from 'express';
import { pool } from '../db/database';
import { validateHouseInput } from '../validators';
import { House } from '../types';

const router = Router();

// Listar todas as casas da empresa atual (Tenant)
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const result = await pool.query<House>(
      'SELECT * FROM houses WHERE organization_id = $1 ORDER BY active DESC, name ASC',
      [orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[API] Erro ao listar casas:', err);
    res.status(500).json({ error: 'Erro ao buscar casas cadastradas.' });
  }
});

// Buscar casa por ID (isolada por empresa)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const result = await pool.query<House>(
      'SELECT * FROM houses WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [id, orgId]
    );
    const house = result.rows[0];
    if (!house) {
      res.status(404).json({ error: 'Casa não encontrada nesta empresa.' });
      return;
    }
    res.json(house);
  } catch (err) {
    console.error('[API] Erro ao buscar casa:', err);
    res.status(500).json({ error: 'Erro interno ao buscar casa.' });
  }
});

// Cadastrar nova casa na empresa atual
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const validation = validateHouseInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, assisted_person, neighborhood, address, notes = '', active = 1 } = req.body;
    const result = await pool.query<House>(
      `INSERT INTO houses (organization_id, name, assisted_person, neighborhood, address, notes, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orgId,
        String(name).trim(),
        String(assisted_person).trim(),
        String(neighborhood).trim(),
        String(address).trim(),
        String(notes || '').trim(),
        active ? 1 : 0
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[API] Erro ao criar casa:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar casa.' });
  }
});

// Atualizar casa existente da empresa atual
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);

    const validation = validateHouseInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, assisted_person, neighborhood, address, notes = '', active = 1 } = req.body;
    const result = await pool.query<House>(
      `UPDATE houses
       SET name = $1, assisted_person = $2, neighborhood = $3, address = $4, notes = $5, active = $6
       WHERE id = $7 AND organization_id = $8
       RETURNING *`,
      [
        String(name).trim(),
        String(assisted_person).trim(),
        String(neighborhood).trim(),
        String(address).trim(),
        String(notes || '').trim(),
        active ? 1 : 0,
        id,
        orgId
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Casa não encontrada nesta empresa para edição.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[API] Erro ao atualizar casa:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar casa.' });
  }
});

// Remover casa da empresa atual
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const result = await pool.query(
      'DELETE FROM houses WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, orgId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Casa não encontrada nesta empresa para exclusão.' });
      return;
    }

    res.json({ message: 'Casa e seus plantões vinculados foram removidos com sucesso.', id });
  } catch (err) {
    console.error('[API] Erro ao excluir casa:', err);
    res.status(500).json({ error: 'Erro interno ao remover casa.' });
  }
});

export default router;
