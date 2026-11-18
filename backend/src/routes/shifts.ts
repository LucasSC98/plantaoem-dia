import { Router, Request, Response } from 'express';
import { db } from '../db/database';
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

export function getEnrichedShiftsForQuery(params: {
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
}): EnrichedShiftRow[] {
  const conditions: string[] = ['s.organization_id = ?'];
  const sqlParams: (string | number)[] = [params.organizationId];

  if (params.date) {
    conditions.push('s.date = ?');
    sqlParams.push(params.date);
  } else {
    if (params.startDate) {
      conditions.push('s.date >= ?');
      sqlParams.push(params.startDate);
    }
    if (params.endDate) {
      conditions.push('s.date <= ?');
      sqlParams.push(params.endDate);
    }
  }

  if (params.houseId) {
    conditions.push('s.house_id = ?');
    sqlParams.push(params.houseId);
  }

  if (params.professionalId) {
    conditions.push('s.professional_id = ?');
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

  const rawRows = db.prepare(query).all(...sqlParams) as unknown as RawJoinedShift[];

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

  // Se estivermos consultando uma data específica e includeUnscheduledHouses for verdadeiro,
  // qualquer casa ativa DA EMPRESA ATUAL sem plantão naquele dia aparece automaticamente em VERDE.
  if (params.date && params.includeUnscheduledHouses && !params.houseId && !params.professionalId) {
    const activeHouses = db
      .prepare('SELECT * FROM houses WHERE organization_id = ? AND active = 1 ORDER BY id ASC')
      .all(params.organizationId) as unknown as House[];

    const scheduledHouseIds = new Set(enriched.map((r) => r.house_id));
    for (const house of activeHouses) {
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
router.get('/', (req: Request, res: Response) => {
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

    const rows = getEnrichedShiftsForQuery({
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
router.post('/', (req: Request, res: Response) => {
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

    // Verificar se a casa pertence à empresa atual
    const house = db
      .prepare('SELECT id FROM houses WHERE id = ? AND organization_id = ?')
      .get(house_id, orgId);
    if (!house) {
      res.status(400).json({ error: 'A casa selecionada não pertence a esta empresa.' });
      return;
    }

    if (professional_id !== null) {
      const prof = db
        .prepare('SELECT id FROM professionals WHERE id = ? AND organization_id = ?')
        .get(professional_id, orgId);
      if (!prof) {
        res.status(400).json({ error: 'O profissional selecionado não pertence a esta empresa.' });
        return;
      }
    }

    db.exec('BEGIN TRANSACTION;');
    let shiftId: number;
    try {
      if (shift_type !== 'no_schedule') {
        db.prepare(
          "DELETE FROM shifts WHERE organization_id = ? AND house_id = ? AND date = ? AND shift_type = 'no_schedule'"
        ).run(orgId, house_id, date);
      }

      const result = db
        .prepare(`
          INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          orgId,
          house_id,
          professional_id,
          date,
          shift_period,
          start_time,
          end_time,
          shift_type,
          notes
        );

      shiftId = Number(result.lastInsertRowid);

      const visualState = computeVisualState(shift_type, shift_period, professional_id);
      if (visualState === 'normal' && professional_id !== null) {
        db.prepare(`
          INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
          VALUES (?, ?, ?, ?, ?, ?, 'pending', 'Coordenação', '')
        `).run(orgId, shiftId, house_id, professional_id, date, shift_period);
      }

      db.exec('COMMIT;');
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }

    const createdRows = getEnrichedShiftsForQuery({
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
router.put('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT * FROM shifts WHERE id = ? AND organization_id = ?')
      .get(id, orgId) as
      | { id: number; house_id: number; date: string }
      | undefined;

    if (!existing) {
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

    const house = db
      .prepare('SELECT id FROM houses WHERE id = ? AND organization_id = ?')
      .get(house_id, orgId);
    if (!house) {
      res.status(400).json({ error: 'A casa selecionada não pertence a esta empresa.' });
      return;
    }

    if (professional_id !== null) {
      const prof = db
        .prepare('SELECT id FROM professionals WHERE id = ? AND organization_id = ?')
        .get(professional_id, orgId);
      if (!prof) {
        res.status(400).json({ error: 'O profissional selecionado não pertence a esta empresa.' });
        return;
      }
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE shifts
        SET house_id = ?, professional_id = ?, date = ?, shift_period = ?, start_time = ?, end_time = ?, shift_type = ?, notes = ?
        WHERE id = ? AND organization_id = ?
      `).run(
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
      );

      const visualState = computeVisualState(shift_type, shift_period, professional_id);
      const existingCheck = db
        .prepare('SELECT id, status FROM checks WHERE shift_id = ? AND organization_id = ?')
        .get(id, orgId) as { id: number; status: string } | undefined;

      if (visualState === 'normal' && professional_id !== null) {
        if (existingCheck) {
          db.prepare(`
            UPDATE checks
            SET house_id = ?, professional_id = ?, date = ?, shift_period = ?
            WHERE id = ? AND organization_id = ?
          `).run(house_id, professional_id, date, shift_period, existingCheck.id, orgId);
        } else {
          db.prepare(`
            INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', 'Coordenação', '')
          `).run(orgId, id, house_id, professional_id, date, shift_period);
        }
      } else {
        if (existingCheck) {
          db.prepare('DELETE FROM checks WHERE id = ? AND organization_id = ?').run(
            existingCheck.id,
            orgId
          );
        }
      }

      db.exec('COMMIT;');
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }

    const updatedRows = getEnrichedShiftsForQuery({
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
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const id = Number(req.params.id);
    const existing = db
      .prepare('SELECT id FROM shifts WHERE id = ? AND organization_id = ?')
      .get(id, orgId);
    if (!existing) {
      res.status(404).json({ error: 'Plantão não encontrado nesta empresa para exclusão.' });
      return;
    }

    db.prepare('DELETE FROM shifts WHERE id = ? AND organization_id = ?').run(id, orgId);
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
  // Tenta extrair bairro separado por " - " ou " — " (ex: "Rua X, 100 - Aldeota - Apto 501")
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

// Importação em lote de planilha (.xlsx / .csv) no padrão "Cliente | Assistido | Endereço | Horario | Sábado | Domingo | Segunda"
router.post('/import-spreadsheet', (req: Request, res: Response) => {
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

    if ((!singleDate && (!saturdayDate || !sundayDate)) || !Array.isArray(rows) || rows.length === 0) {
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

    db.exec('BEGIN TRANSACTION;');
    try {
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
          db.prepare('DELETE FROM shifts WHERE organization_id = ? AND date = ?').run(orgId, dt);
        }
      }

      const findHouseStmt = db.prepare(
        'SELECT id FROM houses WHERE organization_id = ? AND LOWER(name) = LOWER(?)'
      );
      const insertHouseStmt = db.prepare(`
        INSERT INTO houses (organization_id, name, assisted_person, neighborhood, address, notes, active)
        VALUES (?, ?, ?, ?, ?, 'Importado via planilha', 1)
      `);

      const findProfStmt = db.prepare(
        'SELECT id FROM professionals WHERE organization_id = ? AND LOWER(name) = LOWER(?)'
      );
      const insertProfStmt = db.prepare(`
        INSERT INTO professionals (organization_id, name, role, phone, avatar_color, active)
        VALUES (?, ?, 'Cuidador(a)', '', ?, 1)
      `);

      const insertShiftStmt = db.prepare(`
        INSERT INTO shifts (organization_id, house_id, professional_id, date, shift_period, start_time, end_time, shift_type, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertCheckStmt = db.prepare(`
        INSERT INTO checks (organization_id, shift_id, house_id, professional_id, date, shift_period, status, checked_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', 'Coordenação', '')
      `);

      const ensureProfessional = (rawName: string): { id: number; forced24h: boolean } => {
        const has24hTag = /\b(24h|48h)\b/i.test(rawName);
        const cleanName = rawName.replace(/\((?:24h|48h)\)/gi, '').trim();
        const existing = findProfStmt.get(orgId, cleanName) as { id: number } | undefined;
        if (existing) {
          return { id: existing.id, forced24h: has24hTag };
        }
        const color = avatarColors[colorIdx % avatarColors.length];
        colorIdx++;
        const created = insertProfStmt.run(orgId, cleanName, color);
        professionalsCreated++;
        return { id: Number(created.lastInsertRowid), forced24h: has24hTag };
      };

      for (const item of rows) {
        const clientName = (item.clientName || '').trim();
        if (!clientName) continue;

        const assistedPerson = (item.assistedPerson || 'Assistido').trim() || 'Assistido';
        const { neighborhood, address } = parseAddressAndNeighborhood(item.fullAddress || '');
        const { startTime, endTime, is24hCycle, period } = parseHorarioString(item.horario || '');

        let houseRow = findHouseStmt.get(orgId, clientName) as { id: number } | undefined;
        if (!houseRow) {
          const hRes = insertHouseStmt.run(
            orgId,
            clientName,
            assistedPerson,
            neighborhood,
            address
          );
          houseRow = { id: Number(hRes.lastInsertRowid) };
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
            // Remove registro anterior de mesmo horário/casa/data ou sem_escala para não duplicar
            db.prepare(
              `DELETE FROM shifts
               WHERE organization_id = ? AND house_id = ? AND date = ?
                 AND (shift_type = 'no_schedule' OR (start_time = ? AND end_time = ?))`
            ).run(orgId, houseRow.id, cell.date, startTime, endTime);
          }

          // Caso 1: N/A -> Verde (Sem escala para esta casa naquele dia)
          if (
            upper === 'N/A' ||
            upper === 'NA' ||
            upper === 'N/D' ||
            upper === '-' ||
            upper === 'SEM ESCALA'
          ) {
            // Só insere "no_schedule" se a casa ainda não tiver outro turno ativo no mesmo dia
            const otherActive = db
              .prepare(
                "SELECT id FROM shifts WHERE organization_id = ? AND house_id = ? AND date = ? AND shift_type != 'no_schedule'"
              )
              .get(orgId, houseRow.id, cell.date);
            if (!otherActive) {
              insertShiftStmt.run(
                orgId,
                houseRow.id,
                null,
                cell.date,
                'sem_escala',
                '--:--',
                '--:--',
                'no_schedule',
                'Importado da planilha (N/A)'
              );
              shiftsCreated++;
            }
            continue;
          }

          // Caso 2: Célula em branco / A definir -> Amarelo (Falta definir o profissional)
          if (
            val === '' ||
            upper === '?' ||
            upper === 'A DEFINIR' ||
            upper === 'PENDENTE' ||
            upper === 'VAGO'
          ) {
            insertShiftStmt.run(
              orgId,
              houseRow.id,
              null,
              cell.date,
              period,
              startTime,
              endTime,
              'unassigned',
              'Importado da planilha (Sem profissional definido)'
            );
            shiftsCreated++;
            continue;
          }

          // Caso 3: Tem nome de profissional
          const { id: profId, forced24h } = ensureProfessional(val);
          const effectiveType: ShiftType =
            is24hCycle || forced24h ? 'stay_in_24h_48h' : 'normal';
          const effectivePeriod: ShiftPeriod =
            effectiveType === 'stay_in_24h_48h' && period !== '48h' ? '24h' : period;

          const sRes = insertShiftStmt.run(
            orgId,
            houseRow.id,
            profId,
            cell.date,
            effectivePeriod,
            startTime,
            endTime,
            effectiveType,
            'Importado via planilha'
          );
          const shiftId = Number(sRes.lastInsertRowid);
          shiftsCreated++;

          if (effectiveType === 'normal') {
            insertCheckStmt.run(
              orgId,
              shiftId,
              houseRow.id,
              profId,
              cell.date,
              effectivePeriod
            );
          }
        }
      }

      // Pós-processamento: Quando a mesma casa e o mesmo dia possuem 2 turnos (diurno + noturno)
      // com o MESMO profissional escalado (como na planilha de referência onde a célula fica azul),
      // convertemos automaticamente esses turnos para Plantão 24h/48h (Azul) e removemos checagem duplicada!
      for (const dt of targetDates) {
        const duplicates = db
          .prepare(`
            SELECT house_id, professional_id, COUNT(*) as cnt
            FROM shifts
            WHERE organization_id = ? AND date = ? AND professional_id IS NOT NULL
            GROUP BY house_id, professional_id
            HAVING cnt >= 2
          `)
          .all(orgId, dt) as { house_id: number; professional_id: number; cnt: number }[];

        for (const dup of duplicates) {
          db.prepare(`
            UPDATE shifts
            SET shift_type = 'stay_in_24h_48h', shift_period = '24h'
            WHERE organization_id = ? AND date = ? AND house_id = ? AND professional_id = ?
          `).run(orgId, dt, dup.house_id, dup.professional_id);

          db.prepare(`
            DELETE FROM checks
            WHERE organization_id = ? AND date = ? AND house_id = ? AND professional_id = ?
          `).run(orgId, dt, dup.house_id, dup.professional_id);
        }
      }

      db.exec('COMMIT;');
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }

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
