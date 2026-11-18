import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { validateCheckInput } from '../validators';
import { CheckRecord, Shift } from '../types';

const router = Router();

// Listar checagens da empresa atual (Tenant)
router.get('/', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const conditions: string[] = ['c.organization_id = ?'];
    const params: (string | number)[] = [orgId];

    if (typeof req.query.date === 'string' && req.query.date) {
      conditions.push('c.date = ?');
      params.push(req.query.date);
    }
    if (typeof req.query.startDate === 'string' && req.query.startDate) {
      conditions.push('c.date >= ?');
      params.push(req.query.startDate);
    }
    if (typeof req.query.endDate === 'string' && req.query.endDate) {
      conditions.push('c.date <= ?');
      params.push(req.query.endDate);
    }
    if (
      typeof req.query.status === 'string' &&
      (req.query.status === 'pending' || req.query.status === 'done')
    ) {
      conditions.push('c.status = ?');
      params.push(req.query.status);
    }
    if (req.query.houseId) {
      conditions.push('c.house_id = ?');
      params.push(Number(req.query.houseId));
    }
    if (req.query.professionalId) {
      conditions.push('c.professional_id = ?');
      params.push(Number(req.query.professionalId));
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const rows = db
      .prepare(`
        SELECT
          c.*,
          h.name AS house_name,
          h.assisted_person,
          h.neighborhood,
          h.address,
          p.name AS professional_name,
          p.role AS professional_role,
          p.avatar_color AS professional_avatar_color,
          s.start_time,
          s.end_time,
          s.shift_type
        FROM checks c
        INNER JOIN houses h ON h.id = c.house_id AND h.organization_id = c.organization_id
        LEFT JOIN professionals p ON p.id = c.professional_id AND p.organization_id = c.organization_id
        INNER JOIN shifts s ON s.id = c.shift_id AND s.organization_id = c.organization_id
        ${whereClause}
        ORDER BY c.date DESC, s.start_time ASC, h.name ASC
      `)
      .all(...params);

    res.json(rows);
  } catch (err) {
    console.error('[API] Erro ao listar checagens:', err);
    res.status(500).json({ error: 'Erro interno ao buscar checagens.' });
  }
});

// Alternar checagem como feita ou pendente (isolada pela empresa atual)
router.post('/toggle', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const {
      shift_id,
      house_id,
      professional_id,
      date,
      shift_period,
      status: explicitStatus,
      notes
    } = req.body || {};

    let targetShift: Shift | undefined;

    if (shift_id) {
      targetShift = db
        .prepare('SELECT * FROM shifts WHERE id = ? AND organization_id = ?')
        .get(Number(shift_id), orgId) as unknown as Shift | undefined;
    } else if (house_id && date) {
      const query = shift_period
        ? 'SELECT * FROM shifts WHERE organization_id = ? AND house_id = ? AND date = ? AND shift_period = ? LIMIT 1'
        : 'SELECT * FROM shifts WHERE organization_id = ? AND house_id = ? AND date = ? LIMIT 1';
      targetShift = (
        shift_period
          ? db.prepare(query).get(orgId, Number(house_id), String(date), String(shift_period))
          : db.prepare(query).get(orgId, Number(house_id), String(date))
      ) as unknown as Shift | undefined;
    }

    if (!targetShift) {
      res.status(404).json({
        error: 'Plantão correspondente não encontrado nesta empresa para realizar a checagem.'
      });
      return;
    }

    if (
      targetShift.shift_type === 'stay_in_24h_48h' ||
      targetShift.shift_period === '24h' ||
      targetShift.shift_period === '48h'
    ) {
      res.status(400).json({
        error: 'Este plantão é de 24h/48h (profissional permanece na casa) e não requer nova checagem.'
      });
      return;
    }

    if (targetShift.shift_type === 'no_schedule' || targetShift.shift_period === 'sem_escala') {
      res.status(400).json({
        error: 'Não há escala ativa para esta casa neste dia.'
      });
      return;
    }

    if (
      targetShift.shift_type === 'unassigned' ||
      (!targetShift.professional_id && !professional_id)
    ) {
      res.status(400).json({
        error: 'Defina primeiro o profissional escalado antes de marcar a checagem.'
      });
      return;
    }

    const existingCheck = db
      .prepare('SELECT * FROM checks WHERE shift_id = ? AND organization_id = ?')
      .get(targetShift.id, orgId) as unknown as CheckRecord | undefined;

    const currentStatus = existingCheck ? existingCheck.status : 'pending';
    const nextStatus: 'pending' | 'done' =
      explicitStatus === 'done' || explicitStatus === 'pending'
        ? explicitStatus
        : currentStatus === 'done'
          ? 'pending'
          : 'done';

    const checkedAt = nextStatus === 'done' ? new Date().toISOString() : null;
    const effectiveProfId =
      targetShift.professional_id || (professional_id ? Number(professional_id) : null);

    if (existingCheck) {
      db.prepare(`
        UPDATE checks
        SET status = ?,
            checked_at = ?,
            professional_id = ?,
            notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END
        WHERE id = ? AND organization_id = ?
      `).run(
        nextStatus,
        checkedAt,
        effectiveProfId,
        notes !== undefined ? String(notes) : null,
        notes !== undefined ? String(notes) : '',
        existingCheck.id,
        orgId
      );
    } else {
      db.prepare(`
        INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_at, checked_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Coordenação', ?)
      `).run(
        orgId,
        targetShift.id,
        targetShift.house_id,
        effectiveProfId,
        targetShift.date,
        targetShift.shift_period,
        nextStatus,
        checkedAt,
        notes ? String(notes) : ''
      );
    }

    const updatedCheck = db
      .prepare('SELECT * FROM checks WHERE shift_id = ? AND organization_id = ?')
      .get(targetShift.id, orgId) as unknown as CheckRecord;

    res.json(updatedCheck);
  } catch (err) {
    console.error('[API] Erro ao alternar checagem:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar status da checagem.' });
  }
});

// Atualizar uma checagem diretamente pelo ID (isolada pela empresa atual)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM checks WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as CheckRecord | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Registro de checagem não encontrado nesta empresa.' });
      return;
    }

    const validation = validateCheckInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const status = req.body.status as 'pending' | 'done';
    const notes = req.body.notes !== undefined ? String(req.body.notes).trim() : existing.notes;
    const checked_at = status === 'done' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE checks
      SET status = ?, checked_at = ?, notes = ?
      WHERE id = ? AND organization_id = ?
    `).run(status, checked_at, notes, id, orgId);

    const updated = db
      .prepare('SELECT * FROM checks WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as unknown as CheckRecord;

    res.json(updated);
  } catch (err) {
    console.error('[API] Erro ao atualizar checagem por ID:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar checagem.' });
  }
});

export default router;
