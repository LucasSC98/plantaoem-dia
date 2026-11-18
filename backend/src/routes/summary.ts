import { Router, Request, Response } from 'express';
import { pool, withTransaction } from '../db/database';
import { getEnrichedShiftsForQuery } from './shifts';
import { seedDatabase } from '../db/seed';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '2026-11-02';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '2026-11-08';
    const selectedDate = typeof req.query.date === 'string' ? req.query.date : '2026-11-07';

    const [weekRows, dayRows, housesCountRes, profsCountRes] = await Promise.all([
      getEnrichedShiftsForQuery({
        organizationId,
        startDate,
        endDate,
        includeUnscheduledHouses: false
      }),
      getEnrichedShiftsForQuery({
        organizationId,
        date: selectedDate,
        includeUnscheduledHouses: true
      }),
      pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM houses WHERE organization_id = $1 AND active = 1',
        [organizationId]
      ),
      pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM professionals WHERE organization_id = $1 AND active = 1',
        [organizationId]
      )
    ]);

    const totalHousesCount = Number(housesCountRes.rows[0]?.count ?? 0);
    const totalProfsCount = Number(profsCountRes.rows[0]?.count ?? 0);

    const activeWeekShifts = weekRows.filter((r) => r.visual_state !== 'green');
    const housesServedInWeek = new Set(activeWeekShifts.map((r) => r.house_id)).size;

    const week24h48hCount = weekRows.filter((r) => r.visual_state === 'blue').length;

    const weekCheckable = weekRows.filter((r) => r.requires_check);
    const weekPendingChecks = weekCheckable.filter((r) => r.check_status === 'pending').length;
    const weekDoneChecks = weekCheckable.filter((r) => r.check_status === 'done').length;
    const weekUnassigned = weekRows.filter((r) => r.visual_state === 'yellow').length;

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
        housesServed: housesServedInWeek || totalHousesCount,
        totalHouses: totalHousesCount,
        totalProfessionals: totalProfsCount,
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

router.post('/reset-demo', async (req: Request, res: Response) => {
  try {
    const currentToken = req.sessionToken;
    const currentOrgId = req.organizationId || 1;
    await seedDatabase(true);
    if (currentToken) {
      const userRes = await pool.query<{ id: number }>(
        'SELECT id FROM users WHERE organization_id = $1 LIMIT 1',
        [currentOrgId]
      );
      if (userRes.rows[0]) {
        await pool.query(
          'INSERT INTO sessions (token, user_id, organization_id) VALUES ($1, $2, $3) ON CONFLICT (token) DO NOTHING',
          [currentToken, userRes.rows[0].id, currentOrgId]
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
router.delete('/clear-company-data', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const scope = req.query.scope === 'shifts_only' ? 'shifts_only' : 'all';

    await withTransaction(async (client) => {
      await client.query('DELETE FROM checks WHERE organization_id = $1', [orgId]);
      await client.query('DELETE FROM shifts WHERE organization_id = $1', [orgId]);

      if (scope === 'all') {
        await client.query('DELETE FROM professionals WHERE organization_id = $1', [orgId]);
        await client.query('DELETE FROM houses WHERE organization_id = $1', [orgId]);
      }
    });

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
