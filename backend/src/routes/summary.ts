import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { getEnrichedShiftsForQuery } from './shifts';
import { seedDatabase } from '../db/seed';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '2026-11-02';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '2026-11-08';
    const selectedDate = typeof req.query.date === 'string' ? req.query.date : '2026-11-07';

    const weekRows = getEnrichedShiftsForQuery({
      organizationId,
      startDate,
      endDate,
      includeUnscheduledHouses: false
    });

    const activeWeekShifts = weekRows.filter((r) => r.visual_state !== 'green');
    const housesServedInWeek = new Set(activeWeekShifts.map((r) => r.house_id)).size;

    const totalHousesRow = db
      .prepare('SELECT COUNT(*) as count FROM houses WHERE organization_id = ? AND active = 1')
      .get(organizationId) as { count: number };
    const totalProfessionalsRow = db
      .prepare('SELECT COUNT(*) as count FROM professionals WHERE organization_id = ? AND active = 1')
      .get(organizationId) as { count: number };

    const week24h48hCount = weekRows.filter((r) => r.visual_state === 'blue').length;

    const weekCheckable = weekRows.filter((r) => r.requires_check);
    const weekPendingChecks = weekCheckable.filter((r) => r.check_status === 'pending').length;
    const weekDoneChecks = weekCheckable.filter((r) => r.check_status === 'done').length;
    const weekUnassigned = weekRows.filter((r) => r.visual_state === 'yellow').length;

    const dayRows = getEnrichedShiftsForQuery({
      organizationId,
      date: selectedDate,
      includeUnscheduledHouses: true
    });

    const dayActiveShifts = dayRows.filter((r) => r.visual_state !== 'green');
    const dayCheckable = dayRows.filter((r) => r.requires_check);
    const dayPendingChecks = dayCheckable.filter((r) => r.check_status === 'pending').length;
    const dayDoneChecks = dayCheckable.filter((r) => r.check_status === 'done').length;
    const day24h48hCount = dayRows.filter((r) => r.visual_state === 'blue').length;
    const dayUnassignedCount = dayRows.filter((r) => r.visual_state === 'yellow').length;
    const dayNoScheduleCount = dayRows.filter((r) => r.visual_state === 'green').length;

    res.json({
      organization: req.organization || null,
      week: {
        startDate,
        endDate,
        totalShifts: activeWeekShifts.length,
        housesServed: housesServedInWeek || totalHousesRow.count,
        totalHouses: totalHousesRow.count,
        totalProfessionals: totalProfessionalsRow.count,
        stayIn24h48hCount: week24h48hCount,
        totalChecks: weekCheckable.length,
        pendingChecks: weekPendingChecks,
        doneChecks: weekDoneChecks,
        unassignedCount: weekUnassigned
      },
      day: {
        date: selectedDate,
        totalRows: dayRows.length,
        activeShifts: dayActiveShifts.length,
        totalChecks: dayCheckable.length,
        pendingChecks: dayPendingChecks,
        doneChecks: dayDoneChecks,
        stayIn24h48hCount: day24h48hCount,
        unassignedCount: dayUnassignedCount,
        noScheduleCount: dayNoScheduleCount
      }
    });
  } catch (err) {
    console.error('[API] Erro ao gerar resumo:', err);
    res.status(500).json({ error: 'Erro interno ao calcular resumo de escalas e checagens.' });
  }
});

router.post('/reset-demo', (req: Request, res: Response) => {
  try {
    const currentToken = req.sessionToken;
    const currentOrgId = req.organizationId && req.organizationId <= 2 ? req.organizationId : 1;
    seedDatabase(true);
    if (currentToken) {
      const userRow = db
        .prepare('SELECT id FROM users WHERE organization_id = ? LIMIT 1')
        .get(currentOrgId) as { id: number } | undefined;
      if (userRow) {
        db.prepare('INSERT INTO sessions (token, user_id, organization_id) VALUES (?, ?, ?)').run(
          currentToken,
          userRow.id,
          currentOrgId
        );
      }
    }
    res.json({ message: 'Dados demonstrativos restaurados com sucesso.' });
  } catch (err) {
    console.error('[API] Erro ao restaurar dados de demonstração:', err);
    res.status(500).json({ error: 'Erro ao restaurar dados demonstrativos.' });
  }
});

// Limpar dados do banco da empresa logada (apenas escalas ou todos os cadastros)
router.delete('/clear-company-data', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const scope = req.query.scope === 'shifts_only' ? 'shifts_only' : 'all';

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('DELETE FROM checks WHERE organization_id = ?').run(orgId);
      db.prepare('DELETE FROM shifts WHERE organization_id = ?').run(orgId);

      if (scope === 'all') {
        db.prepare('DELETE FROM professionals WHERE organization_id = ?').run(orgId);
        db.prepare('DELETE FROM houses WHERE organization_id = ?').run(orgId);
      }
      db.exec('COMMIT;');
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }

    res.json({
      message:
        scope === 'shifts_only'
          ? 'Todas as escalas e checagens da empresa foram removidas.'
          : 'Todos os dados (casas, equipe, escalas e checagens) da empresa foram removidos.'
    });
  } catch (err) {
    console.error('[API] Erro ao limpar dados da empresa:', err);
    res.status(500).json({ error: 'Erro ao limpar dados da empresa.' });
  }
});

export default router;
