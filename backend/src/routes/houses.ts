import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { validateHouseInput } from '../validators';
import { House } from '../types';

const router = Router();

// Listar todas as casas da empresa atual (Tenant)
router.get('/', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const houses = db
      .prepare('SELECT * FROM houses WHERE organization_id = ? ORDER BY active DESC, name ASC')
      .all(orgId) as unknown as House[];
    res.json(houses);
  } catch (err) {
    console.error('[API] Erro ao listar casas:', err);
    res.status(500).json({ error: 'Erro ao buscar casas cadastradas.' });
  }
});

// Buscar casa por ID (isolada por empresa)
router.get('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const house = db
      .prepare('SELECT * FROM houses WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as House | undefined;
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
router.post('/', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const validation = validateHouseInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, assisted_person, neighborhood, address, notes = '', active = 1 } = req.body;
    const stmt = db.prepare(`
      INSERT INTO houses (organization_id, name, assisted_person, neighborhood, address, notes, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      orgId,
      String(name).trim(),
      String(assisted_person).trim(),
      String(neighborhood).trim(),
      String(address).trim(),
      String(notes || '').trim(),
      active ? 1 : 0
    );

    const created = db
      .prepare('SELECT * FROM houses WHERE id = ? AND organization_id = ?')
      .get(Number(result.lastInsertRowid), orgId) as unknown as House;

    res.status(201).json(created);
  } catch (err) {
    console.error('[API] Erro ao criar casa:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar casa.' });
  }
});

// Atualizar casa existente da empresa atual
router.put('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM houses WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as House | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Casa não encontrada nesta empresa para edição.' });
      return;
    }

    const validation = validateHouseInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, assisted_person, neighborhood, address, notes = '', active = 1 } = req.body;
    db.prepare(`
      UPDATE houses
      SET name = ?, assisted_person = ?, neighborhood = ?, address = ?, notes = ?, active = ?
      WHERE id = ? AND organization_id = ?
    `).run(
      String(name).trim(),
      String(assisted_person).trim(),
      String(neighborhood).trim(),
      String(address).trim(),
      String(notes || '').trim(),
      active ? 1 : 0,
      id,
      orgId
    );

    const updated = db
      .prepare('SELECT * FROM houses WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as House;
    res.json(updated);
  } catch (err) {
    console.error('[API] Erro ao atualizar casa:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar casa.' });
  }
});

// Remover casa da empresa atual
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM houses WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as House | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Casa não encontrada nesta empresa para exclusão.' });
      return;
    }

    db.prepare('DELETE FROM houses WHERE id = ? AND organization_id = ?').run(id, orgId);
    res.json({ message: 'Casa e seus plantões vinculados foram removidos com sucesso.', id });
  } catch (err) {
    console.error('[API] Erro ao excluir casa:', err);
    res.status(500).json({ error: 'Erro interno ao remover casa.' });
  }
});

export default router;
