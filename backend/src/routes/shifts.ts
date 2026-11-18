import { Router, Request, Response } from 'express';
import { pool, withTransaction } from '../db/database';
import { validateShiftInput } from '../validators';
import { EnrichedShiftRow, House, ShiftPeriod, ShiftType, VisualState } from '../types';

const router = Router();

export function computeVisualState(
  shiftType: ShiftType,
  shiftPeriod: ShiftPeriod,
  professionalId: number | null
): VisualState {
  if (shiftType === 'no_schedule' || shiftPeriod === 'sem_escala') {
    return 'green';
  }
  if (shiftType === 'stay_in_24h_48h' || shiftPeriod === '24h' || shiftPeriod === '48h') {
    return 'blue';
  }
  if (shiftType === 'unassigned' || !professionalId) {
    return 'yellow';
  }
  return 'normal';
}

interface RawJoinedShift {
  id: number;
  organization_id: number;
  house_id: number;
  house_name: string;
  assisted_person: string;
  neighborhood: string;
  address: string;
  professional_id: number | null;
  professional_name: string | null;
  professional_role: string | null;
  professional_phone: string | null;
  professional_avatar_color: string | null;
  date: string;
  shift_period: ShiftPeriod;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  notes: string;
  check_id: number | null;
  check_status: 'pending' | 'done' | null;
  checked_at: string | null;
  checked_by: string | null;
}

export async function getEnrichedShiftsForQuery(params: {
  organizationId: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  houseId?: number;
  professionalId?: number;
  search?: string;
  onlyPending?: boolean;
  visualState?: string;
  includeUnscheduledHouses?: boolean;
}): Promise<EnrichedShiftRow[]> {
  const conditions: string[] = ['s.organization_id = $1'];
  const sqlParams: (string | number)[] = [params.organizationId];
  let pIdx = 2;

  if (params.date) {
    conditions.push(`s.date = $${pIdx++}`);
    sqlParams.push(params.date);
  } else {
    if (params.startDate) {
      conditions.push(`s.date >= $${pIdx++}`);
      sqlParams.push(params.startDate);
    }
    if (params.endDate) {
      conditions.push(`s.date <= $${pIdx++}`);
      sqlParams.push(params.endDate);
    }
  }

  if (params.houseId) {
    conditions.push(`s.house_id = $${pIdx++}`);
    sqlParams.push(params.houseId);
  }

  if (params.professionalId) {
    conditions.push(`s.professional_id = $${pIdx++}`);
    sqlParams.push(params.professionalId);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT
      s.id,
      s.organization_id,
      s.house_id,
      h.name AS house_name,
      h.assisted_person,
      h.neighborhood,
      h.address,
      s.professional_id,
      p.name AS professional_name,
      p.role AS professional_role,
      p.phone AS professional_phone,
      p.avatar_color AS professional_avatar_color,
      s.date,
      s.shift_period,
      s.start_time,
      s.end_time,
      s.shift_type,
      s.notes,
      c.id AS check_id,
      c.status AS check_status,
      c.checked_at,
      c.checked_by
    FROM shifts s
    INNER JOIN houses h ON h.id = s.house_id AND h.organization_id = s.organization_id
    LEFT JOIN professionals p ON p.id = s.professional_id AND p.organization_id = s.organization_id
    LEFT JOIN checks c ON c.shift_id = s.id AND c.organization_id = s.organization_id
    ${whereClause}
    ORDER BY s.date ASC, h.id ASC, s.start_time ASC
  `;

  const result = await pool.query<RawJoinedShift>(query, sqlParams);
  const rawRows = result.rows;

  const enriched: EnrichedShiftRow[] = rawRows.map((row) => {
    const visualState = computeVisualState(row.shift_type, row.shift_period, row.professional_id);
    const requiresCheck = visualState === 'normal';
    const checkStatus = requiresCheck ? (row.check_status || 'pending') : 'not_applicable';

    return {
      id: row.id,
      shift_id: row.id,
      organization_id: row.organization_id,
      house_id: row.house_id,
      house_name: row.house_name,
      assisted_person: row.assisted_person,
      neighborhood: row.neighborhood,
      address: row.address,
      professional_id: row.professional_id,
      professional_name: row.professional_name,
      professional_role: row.professional_role,
      professional_phone: row.professional_phone,
      professional_avatar_color: row.professional_avatar_color,
      date: row.date,
      shift_period: row.shift_period,
      start_time: row.start_time,
      end_time: row.end_time,
      shift_type: row.shift_type,
      visual_state: visualState,
      requires_check: requiresCheck,
      check_id: row.check_id,
      check_status: checkStatus,
      checked_at: row.checked_at,
      checked_by: row.checked_by,
      notes: row.notes
    };
  });

  if (params.date && params.includeUnscheduledHouses && !params.houseId && !params.professionalId) {
    const activeHousesRes = await pool.query<House>(
      'SELECT * FROM houses WHERE organization_id = $1 AND active = 1 ORDER BY id ASC',
      [params.organizationId]
    );

    const scheduledHouseIds = new Set(enriched.map((r) => r.house_id));
    for (const house of activeHousesRes.rows) {
      if (!scheduledHouseIds.has(house.id)) {
        enriched.push({
          id: -house.id,
          shift_id: null,
          organization_id: params.organizationId,
          house_id: house.id,
          house_name: house.name,
          assisted_person: house.assisted_person,
          neighborhood: house.neighborhood,
          address: house.address,
          professional_id: null,
          professional_name: null,
          professional_role: null,
          professional_phone: null,
          professional_avatar_color: null,
          date: params.date,
          shift_period: 'sem_escala',
          start_time: '--:--',
          end_time: '--:--',
          shift_type: 'no_schedule',
          visual_state: 'green',
          requires_check: false,
          check_id: null,
          check_status: 'not_applicable',
          checked_at: null,
          checked_by: null,
          notes: 'Sem escala cadastrada para esta casa neste dia.'
        });
      }
    }
  }

  let filtered = enriched;

  if (params.search && params.search.trim() !== '') {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.house_name.toLowerCase().includes(q) ||
        item.assisted_person.toLowerCase().includes(q) ||
        item.neighborhood.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        (item.professional_name && item.professional_name.toLowerCase().includes(q))
    );
  }

  if (params.onlyPending) {
    filtered = filtered.filter((item) => item.requires_check && item.check_status === 'pending');
  }

  if (params.visualState && params.visualState !== 'all') {
    if (params.visualState === 'pending_check') {
      filtered = filtered.filter((item) => item.requires_check && item.check_status === 'pending');
    } else if (params.visualState === 'done_check') {
      filtered = filtered.filter((item) => item.requires_check && item.check_status === 'done');
    } else {
      filtered = filtered.filter((item) => item.visual_state === params.visualState);
    }
  }

  return filtered;
}

// Listar plantões da empresa atual
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const houseId = req.query.houseId ? Number(req.query.houseId) : undefined;
    const professionalId = req.query.professionalId ? Number(req.query.professionalId) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const onlyPending = req.query.onlyPending === 'true';
    const visualState = typeof req.query.visualState === 'string' ? req.query.visualState : undefined;
    const includeUnscheduledHouses = req.query.includeUnscheduledHouses !== 'false';

    const rows = await getEnrichedShiftsForQuery({
      organizationId,
      date,
      startDate,
      endDate,
      houseId,
      professionalId,
      search,
      onlyPending,
      visualState,
      includeUnscheduledHouses
    });

    res.json(rows);
  } catch (err) {
    console.error('[API] Erro ao listar plantões:', err);
    res.status(500).json({ error: 'Erro interno ao buscar escala de plantões.' });
  }
});

// Cadastrar novo plantão na empresa atual
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const validation = validateShiftInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const house_id = Number(req.body.house_id);
    const rawProfId = req.body.professional_id;
    let professional_id: number | null =
      rawProfId !== undefined && rawProfId !== null && rawProfId !== '' ? Number(rawProfId) : null;

    const date = String(req.body.date).trim();
    let shift_period = (req.body.shift_period || 'diurno') as ShiftPeriod;
    let shift_type = (req.body.shift_type || 'normal') as ShiftType;
    let start_time = String(req.body.start_time || '07:00').trim();
    let end_time = String(req.body.end_time || '19:00').trim();
    const notes = String(req.body.notes || '').trim();

    if (shift_type === 'no_schedule') {
      professional_id = null;
      shift_period = 'sem_escala';
      start_time = '--:--';
      end_time = '--:--';
    } else if (shift_type === 'unassigned') {
      professional_id = null;
    } else if (shift_type === 'normal' && !professional_id) {
      shift_type = 'unassigned';
    } else if (shift_period === '24h' || shift_period === '48h') {
      shift_type = 'stay_in_24h_48h';
    }

    const houseRes = await pool.query(
      'SELECT id FROM houses WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [house_id, orgId]
    );
    if (houseRes.rowCount === 0) {
      res.status(400).json({ error: 'A casa selecionada não pertence a esta empresa.' });
      return;
    }

    if (professional_id !== null) {
      const profRes = await pool.query(
        'SELECT id FROM professionals WHERE id = $1 AND organization_id = $2 LIMIT 1',
        [professional_id, orgId]
      );
      if (profRes.rowCount === 0) {
        res.status(400).json({ error: 'O profissional selecionado não pertence a esta empresa.' });
        return;
      }
    }

    const shiftId = await withTransaction(async (client) => {
      if (shift_type !== 'no_schedule') {
        await client.query(
          "DELETE FROM shifts WHERE organization_id = $1 AND house_id = $2 AND date = $3 AND shift_type = 'no_schedule'",
          [orgId, house_id, date]
        );
      }

      const insertRes = await client.query<{ id: number }>(
        `INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          orgId,
          house_id,
          professional_id,
          date,
          shift_period,
          start_time,
          end_time,
          shift_type,
          notes
        ]
      );

      const newShiftId = insertRes.rows[0].id;

      const visualState = computeVisualState(shift_type, shift_period, professional_id);
      if (visualState === 'normal' && professional_id !== null) {
        await client.query(
          `INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'Coordenação', '')`,
          [orgId, newShiftId, house_id, professional_id, date, shift_period]
        );
      }

      return newShiftId;
    });

    const createdRows = await getEnrichedShiftsForQuery({
      organizationId: orgId,
      date,
      houseId: house_id,
      includeUnscheduledHouses: false
    });
    const created = createdRows.find((r) => r.shift_id === shiftId) || createdRows[0];

    res.status(201).json(created);
  } catch (err) {
    console.error('[API] Erro ao criar plantão:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar plantão.' });
  }
});

// Atualizar plantão existente da empresa atual
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);

    const existingRes = await pool.query<{ id: number; house_id: number; date: string }>(
      'SELECT id, house_id, date FROM shifts WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [id, orgId]
    );
    if (existingRes.rowCount === 0) {
      res.status(404).json({ error: 'Plantão não encontrado nesta empresa para edição.' });
      return;
    }

    const validation = validateShiftInput(req.body || {});
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' '), errors: validation.errors });
      return;
    }

    const house_id = Number(req.body.house_id);
    const rawProfId = req.body.professional_id;
    let professional_id: number | null =
      rawProfId !== undefined && rawProfId !== null && rawProfId !== '' ? Number(rawProfId) : null;

    const date = String(req.body.date).trim();
    let shift_period = (req.body.shift_period || 'diurno') as ShiftPeriod;
    let shift_type = (req.body.shift_type || 'normal') as ShiftType;
    let start_time = String(req.body.start_time || '07:00').trim();
    let end_time = String(req.body.end_time || '19:00').trim();
    const notes = String(req.body.notes || '').trim();

    if (shift_type === 'no_schedule') {
      professional_id = null;
      shift_period = 'sem_escala';
      start_time = '--:--';
      end_time = '--:--';
    } else if (shift_type === 'unassigned') {
      professional_id = null;
    } else if (shift_type === 'normal' && !professional_id) {
      shift_type = 'unassigned';
    } else if (shift_period === '24h' || shift_period === '48h') {
      shift_type = 'stay_in_24h_48h';
    }

    const houseRes = await pool.query(
      'SELECT id FROM houses WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [house_id, orgId]
    );
    if (houseRes.rowCount === 0) {
      res.status(400).json({ error: 'A casa selecionada não pertence a esta empresa.' });
      return;
    }

    if (professional_id !== null) {
      const profRes = await pool.query(
        'SELECT id FROM professionals WHERE id = $1 AND organization_id = $2 LIMIT 1',
        [professional_id, orgId]
      );
      if (profRes.rowCount === 0) {
        res.status(400).json({ error: 'O profissional selecionado não pertence a esta empresa.' });
        return;
      }
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE shifts
         SET house_id = $1, professional_id = $2, date = $3, shift_period = $4, start_time = $5, end_time = $6, shift_type = $7, notes = $8
         WHERE id = $9 AND organization_id = $10`,
        [
          house_id,
          professional_id,
          date,
          shift_period,
          start_time,
          end_time,
          shift_type,
          notes,
          id,
          orgId
        ]
      );

      const visualState = computeVisualState(shift_type, shift_period, professional_id);
      const existingCheckRes = await client.query<{ id: number; status: string }>(
        'SELECT id, status FROM checks WHERE shift_id = $1 AND organization_id = $2 LIMIT 1',
        [id, orgId]
      );
      const existingCheck = existingCheckRes.rows[0];

      if (visualState === 'normal' && professional_id !== null) {
        if (existingCheck) {
          await client.query(
            `UPDATE checks
             SET house_id = $1, professional_id = $2, date = $3, shift_period = $4
             WHERE id = $5 AND organization_id = $6`,
            [house_id, professional_id, date, shift_period, existingCheck.id, orgId]
          );
        } else {
          await client.query(
            `INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'Coordenação', '')`,
            [orgId, id, house_id, professional_id, date, shift_period]
          );
        }
      } else if (existingCheck) {
        await client.query('DELETE FROM checks WHERE id = $1 AND organization_id = $2', [
          existingCheck.id,
          orgId
        ]);
      }
    });

    const updatedRows = await getEnrichedShiftsForQuery({
      organizationId: orgId,
      date,
      houseId: house_id,
      includeUnscheduledHouses: false
    });
    const updated = updatedRows.find((r) => r.shift_id === id) || updatedRows[0];

    res.json(updated);
  } catch (err) {
    console.error('[API] Erro ao atualizar plantão:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar plantão.' });
  }
});

// Excluir plantão da empresa atual
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const result = await pool.query(
      'DELETE FROM shifts WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, orgId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Plantão não encontrado nesta empresa para exclusão.' });
      return;
    }

    res.json({ message: 'Plantão removido com sucesso.', id });
  } catch (err) {
    console.error('[API] Erro ao excluir plantão:', err);
    res.status(500).json({ error: 'Erro interno ao remover plantão.' });
  }
});

interface SpreadsheetImportRowInput {
  clientName: string;
  assistedPerson: string;
  fullAddress: string;
  horario: string;
  singleDayProf?: string;
  mondayProf?: string;
  tuesdayProf?: string;
  wednesdayProf?: string;
  thursdayProf?: string;
  fridayProf?: string;
  saturdayProf?: string;
  sundayProf?: string;
}

function parseAddressAndNeighborhood(rawAddress: string): {
  neighborhood: string;
  address: string;
} {
  const cleaned = (rawAddress || '').trim();
  if (!cleaned) {
    return { neighborhood: 'Não informado', address: 'Endereço a confirmar' };
  }
  const parts = cleaned
    .split(/\s+[-—·]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return {
      neighborhood: parts[1],
      address: `${parts[0]} · ${parts.slice(2).join(' - ')}`
    };
  }
  if (parts.length === 2) {
    return {
      neighborhood: parts[1],
      address: parts[0]
    };
  }
  return {
    neighborhood: 'Geral',
    address: cleaned
  };
}

function parseHorarioString(rawHorario: string): {
  startTime: string;
  endTime: string;
  is24hCycle: boolean;
  period: ShiftPeriod;
} {
  const text = (rawHorario || '').trim().toLowerCase();
  const match = text.match(/(\d{1,2}:\d{2})\s*(?:às|as|a|-)\s*(\d{1,2}:\d{2})/i);
  if (!match) {
    return {
      startTime: '07:00',
      endTime: '19:00',
      is24hCycle: false,
      period: 'diurno'
    };
  }
  const padTime = (t: string) => {
    const [h, m] = t.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  };
  const startTime = padTime(match[1]);
  const endTime = padTime(match[2]);
  const is24hCycle = startTime === endTime || text.includes('24h') || text.includes('48h');
  const startHour = Number(startTime.split(':')[0]);
  const period: ShiftPeriod = is24hCycle
    ? '24h'
    : startHour >= 18 || startHour < 5
      ? 'noturno'
      : 'diurno';

  return { startTime, endTime, is24hCycle, period };
}

// Importação em lote de planilha (.xlsx / .csv)
router.post('/import-spreadsheet', async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const {
      singleDate,
      saturdayDate,
      sundayDate,
      mondayDate,
      tuesdayDate,
      wednesdayDate,
      thursdayDate,
      fridayDate,
      mode = 'merge',
      rows
    } = req.body as {
      singleDate?: string;
      saturdayDate?: string;
      sundayDate?: string;
      mondayDate?: string;
      tuesdayDate?: string;
      wednesdayDate?: string;
      thursdayDate?: string;
      fridayDate?: string;
      mode?: 'merge' | 'replace_weekend';
      rows: SpreadsheetImportRowInput[];
    };

    if (
      (!singleDate && (!saturdayDate || !sundayDate)) ||
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      res.status(400).json({
        error: 'A planilha enviada não contém linhas válidas para importação.'
      });
      return;
    }

    const avatarColors = ['indigo', 'blue', 'purple', 'emerald', 'sky', 'violet', 'amber', 'rose'];
    let colorIdx = 0;

    let housesCreated = 0;
    let professionalsCreated = 0;
    let shiftsCreated = 0;

    await withTransaction(async (client) => {
      const targetDates = singleDate
        ? [singleDate]
        : [
            mondayDate,
            tuesdayDate,
            wednesdayDate,
            thursdayDate,
            fridayDate,
            saturdayDate,
            sundayDate
          ].filter((d): d is string => Boolean(d));

      if (mode === 'replace_weekend') {
        for (const dt of targetDates) {
          await client.query(
            'DELETE FROM shifts WHERE organization_id = $1 AND date = $2',
            [orgId, dt]
          );
        }
      }

      const ensureProfessional = async (
        rawName: string
      ): Promise<{ id: number; forced24h: boolean }> => {
        const has24hTag = /\b(24h|48h)\b/i.test(rawName);
        const cleanName = rawName.replace(/\((?:24h|48h)\)/gi, '').trim();
        const existingRes = await client.query<{ id: number }>(
          'SELECT id FROM professionals WHERE organization_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
          [orgId, cleanName]
        );
        if (existingRes.rows[0]) {
          return { id: existingRes.rows[0].id, forced24h: has24hTag };
        }
        const color = avatarColors[colorIdx % avatarColors.length];
        colorIdx++;
        const createdRes = await client.query<{ id: number }>(
          `INSERT INTO professionals (organization_id, name, role, phone, avatar_color, active)
           VALUES ($1, $2, 'Cuidador(a)', '', $3, 1)
           RETURNING id`,
          [orgId, cleanName, color]
        );
        professionalsCreated++;
        return { id: createdRes.rows[0].id, forced24h: has24hTag };
      };

      for (const item of rows) {
        const clientName = (item.clientName || '').trim();
        if (!clientName) continue;

        const assistedPerson = (item.assistedPerson || 'Assistido').trim() || 'Assistido';
        const { neighborhood, address } = parseAddressAndNeighborhood(item.fullAddress || '');
        const { startTime, endTime, is24hCycle, period } = parseHorarioString(item.horario || '');

        let houseRes = await client.query<{ id: number }>(
          'SELECT id FROM houses WHERE organization_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
          [orgId, clientName]
        );
        let houseId: number;
        if (houseRes.rows[0]) {
          houseId = houseRes.rows[0].id;
        } else {
          const hInsert = await client.query<{ id: number }>(
            `INSERT INTO houses (organization_id, name, assisted_person, neighborhood, address, notes, active)
             VALUES ($1, $2, $3, $4, $5, 'Importado via planilha', 1)
             RETURNING id`,
            [orgId, clientName, assistedPerson, neighborhood, address]
          );
          houseId = hInsert.rows[0].id;
          housesCreated++;
        }

        const dayCells: { date: string; rawValue: string | undefined }[] = [];
        if (singleDate) {
          const singleVal =
            item.singleDayProf !== undefined
              ? item.singleDayProf
              : item.saturdayProf !== undefined
                ? item.saturdayProf
                : item.mondayProf;
          dayCells.push({ date: singleDate, rawValue: singleVal ?? '' });
        } else {
          if (mondayDate && item.mondayProf !== undefined) {
            dayCells.push({ date: mondayDate, rawValue: item.mondayProf });
          }
          if (tuesdayDate && item.tuesdayProf !== undefined) {
            dayCells.push({ date: tuesdayDate, rawValue: item.tuesdayProf });
          }
          if (wednesdayDate && item.wednesdayProf !== undefined) {
            dayCells.push({ date: wednesdayDate, rawValue: item.wednesdayProf });
          }
          if (thursdayDate && item.thursdayProf !== undefined) {
            dayCells.push({ date: thursdayDate, rawValue: item.thursdayProf });
          }
          if (fridayDate && item.fridayProf !== undefined) {
            dayCells.push({ date: fridayDate, rawValue: item.fridayProf });
          }
          if (saturdayDate && item.saturdayProf !== undefined) {
            dayCells.push({ date: saturdayDate, rawValue: item.saturdayProf });
          }
          if (sundayDate && item.sundayProf !== undefined) {
            dayCells.push({ date: sundayDate, rawValue: item.sundayProf });
          }
        }

        for (const cell of dayCells) {
          if (cell.rawValue === undefined) continue;
          const val = cell.rawValue.trim();
          const upper = val.toUpperCase();

          if (mode === 'merge') {
            await client.query(
              `DELETE FROM shifts
               WHERE organization_id = $1 AND house_id = $2 AND date = $3
                 AND (shift_type = 'no_schedule' OR (start_time = $4 AND end_time = $5))`,
              [orgId, houseId, cell.date, startTime, endTime]
            );
          }

          if (
            upper === 'N/A' ||
            upper === 'NA' ||
            upper === 'N/D' ||
            upper === '-' ||
            upper === 'SEM ESCALA'
          ) {
            const otherActive = await client.query(
              "SELECT id FROM shifts WHERE organization_id = $1 AND house_id = $2 AND date = $3 AND shift_type != 'no_schedule' LIMIT 1",
              [orgId, houseId, cell.date]
            );
            if (otherActive.rowCount === 0) {
              await client.query(
                `INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
                 VALUES ($1, $2, NULL, $3, 'sem_escala', '--:--', '--:--', 'no_schedule', 'Importado da planilha (N/A)')`,
                [orgId, houseId, cell.date]
              );
              shiftsCreated++;
            }
            continue;
          }

          if (
            val === '' ||
            upper === '?' ||
            upper === 'A DEFINIR' ||
            upper === 'PENDENTE' ||
            upper === 'VAGO'
          ) {
            await client.query(
              `INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
               VALUES ($1, $2, NULL, $3, $4, $5, $6, 'unassigned', 'Importado da planilha (Sem profissional definido)')`,
              [orgId, houseId, cell.date, period, startTime, endTime]
            );
            shiftsCreated++;
            continue;
          }

          const { id: profId, forced24h } = await ensureProfessional(val);
          const effectiveType: ShiftType =
            is24hCycle || forced24h ? 'stay_in_24h_48h' : 'normal';
          const effectivePeriod: ShiftPeriod =
            effectiveType === 'stay_in_24h_48h' && period !== '48h' ? '24h' : period;

          const sRes = await client.query<{ id: number }>(
            `INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Importado via planilha')
             RETURNING id`,
            [
              orgId,
              houseId,
              profId,
              cell.date,
              effectivePeriod,
              startTime,
              endTime,
              effectiveType
            ]
          );
          const shiftId = sRes.rows[0].id;
          shiftsCreated++;

          if (effectiveType === 'normal') {
            await client.query(
              `INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
               VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'Coordenação', '')`,
              [orgId, shiftId, houseId, profId, cell.date, effectivePeriod]
            );
          }
        }
      }

      for (const dt of targetDates) {
        const duplicatesRes = await client.query<{
          house_id: number;
          professional_id: number;
          cnt: string;
        }>(
          `SELECT house_id, professional_id, COUNT(*) as cnt
           FROM shifts
           WHERE organization_id = $1 AND date = $2 AND professional_id IS NOT NULL
           GROUP BY house_id, professional_id
           HAVING COUNT(*) >= 2`,
          [orgId, dt]
        );

        for (const dup of duplicatesRes.rows) {
          await client.query(
            `UPDATE shifts
             SET shift_type = 'stay_in_24h_48h', shift_period = '24h'
             WHERE organization_id = $1 AND date = $2 AND house_id = $3 AND professional_id = $4`,
            [orgId, dt, dup.house_id, dup.professional_id]
          );

          await client.query(
            `DELETE FROM checks
             WHERE organization_id = $1 AND date = $2 AND house_id = $3 AND professional_id = $4`,
            [orgId, dt, dup.house_id, dup.professional_id]
          );
        }
      }
    });

    res.json({
      message: `Importação concluída: ${shiftsCreated} plantões processados (${housesCreated} novas casas e ${professionalsCreated} novos profissionais cadastrados).`,
      stats: {
        housesCreated,
        professionalsCreated,
        shiftsCreated
      }
    });
  } catch (err) {
    console.error('[API] Erro ao importar planilha:', err);
    res.status(500).json({ error: 'Erro interno ao processar a importação da planilha.' });
  }
});

export default router;
