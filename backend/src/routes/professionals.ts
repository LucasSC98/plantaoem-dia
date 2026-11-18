import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { validateProfessionalInput } from '../validators';
import { Professional } from '../types';

const router = Router();

// Listar todos os profissionais da empresa atual (Tenant)
router.get('/', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const professionals = db
      .prepare('SELECT * FROM professionals WHERE organization_id = ? ORDER BY active DESC, name ASC')
      .all(orgId) as unknown as Professional[];
    res.json(professionals);
  } catch (err) {
    console.error('[API] Erro ao listar profissionais:', err);
    res.status(500).json({ error: 'Erro ao buscar profissionais cadastrados.' });
  }
});

// Buscar profissional por ID (isolado por empresa)
router.get('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const prof = db
      .prepare('SELECT * FROM professionals WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as Professional | undefined;
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
router.post('/', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const validation = validateProfessionalInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, role = 'Cuidador(a)', phone = '', avatar_color = 'indigo', active = 1 } = req.body;
    const stmt = db.prepare(`
      INSERT INTO professionals (organization_id, name, role, phone, avatar_color, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      orgId,
      String(name).trim(),
      String(role).trim(),
      String(phone || '').trim(),
      String(avatar_color || 'indigo').trim(),
      active ? 1 : 0
    );

    const created = db
      .prepare('SELECT * FROM professionals WHERE id = ? AND organization_id = ?')
      .get(Number(result.lastInsertRowid), orgId) as unknown as Professional;

    res.status(201).json(created);
  } catch (err) {
    console.error('[API] Erro ao cadastrar profissional:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar profissional.' });
  }
});

// Atualizar profissional da empresa atual
router.put('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM professionals WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as Professional | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Profissional não encontrado nesta empresa para edição.' });
      return;
    }

    const validation = validateProfessionalInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const { name, role = 'Cuidador(a)', phone = '', avatar_color = 'indigo', active = 1 } = req.body;
    db.prepare(`
      UPDATE professionals
      SET name = ?, role = ?, phone = ?, avatar_color = ?, active = ?
      WHERE id = ? AND organization_id = ?
    `).run(
      String(name).trim(),
      String(role).trim(),
      String(phone || '').trim(),
      String(avatar_color || 'indigo').trim(),
      active ? 1 : 0,
      id,
      orgId
    );

    const updated = db
      .prepare('SELECT * FROM professionals WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as Professional;
    res.json(updated);
  } catch (err) {
    console.error('[API] Erro ao atualizar profissional:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar profissional.' });
  }
});

// Remover profissional da empresa atual
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM professionals WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as Professional | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Profissional não encontrado nesta empresa para exclusão.' });
      return;
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE shifts
        SET professional_id = NULL,
            shift_type = CASE WHEN shift_type = 'no_schedule' THEN 'no_schedule' ELSE 'unassigned' END
        WHERE professional_id = ? AND organization_id = ?
      `).run(id, orgId);

      db.prepare('DELETE FROM checks WHERE professional_id = ? AND organization_id = ?').run(
        id,
        orgId
      );
      db.prepare('DELETE FROM professionals WHERE id = ? AND organization_id = ?').run(id, orgId);
      db.exec('COMMIT;');
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }

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
