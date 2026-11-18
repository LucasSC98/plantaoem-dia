import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import {
  Download,
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  ClipboardPaste,
  Sparkles,
  Calendar,
  Palette
} from 'lucide-react';
import { EnrichedShiftRow, SpreadsheetImportRow, VisualState, WeekDefinition } from '../types';
import { api } from '../api/client';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: WeekDefinition;
  selectedDate: string;
  organizationName: string;
  onImportSuccess: (message: string) => Promise<void>;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatIsoToBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatIsoToShortBr(iso: string): string {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return `${d}/${m}`;
}

const WEEKDAY_NAMES_PT: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado'
};

function getWeekdayNamePt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return 'Dia';
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return WEEKDAY_NAMES_PT[dt.getDay()] || 'Dia';
}

// ============================================================================
// ESTILOS EXCEL (xlsx-js-style) PARA MANTER AS CORES E BORDAS NA PLANILHA .XLSX
// ============================================================================
const THIN_BORDER = {
  top: { style: 'thin', color: { rgb: '94A3B8' } },
  bottom: { style: 'thin', color: { rgb: '94A3B8' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } }
};

const EXCEL_STYLES = {
  titleBanner: {
    fill: { fgColor: { rgb: '1E293B' } },
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  headerCell: {
    fill: { fgColor: { rgb: 'D9E1F2' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER
  },
  weekendHeaderCell: {
    fill: { fgColor: { rgb: 'C7D2FE' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E1B4B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER
  },
  clientCell: {
    fill: { fgColor: { rgb: 'DCE6F1' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER
  },
  textCell: {
    fill: { fgColor: { rgb: 'FFFFFF' } },
    font: { name: 'Calibri', sz: 11, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: THIN_BORDER
  },
  // Estados Visuais nas células dos profissionais:
  stateNormal: {
    fill: { fgColor: { rgb: 'FFFFFF' } },
    font: { name: 'Calibri', sz: 11, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  stateBlue24h: {
    fill: { fgColor: { rgb: 'CFE2F3' } }, // Azul suave idêntico à planilha de referência
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0C4A6E' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  stateGreenNoSchedule: {
    fill: { fgColor: { rgb: 'C6EFCE' } }, // Verde suave N/A idêntico à planilha de referência
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '14532D' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  stateYellowUnassigned: {
    fill: { fgColor: { rgb: 'FFFF00' } }, // Amarelo vivo idêntico à planilha de referência
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '713F12' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  checkDone: {
    fill: { fgColor: { rgb: 'DCFCE7' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '166534' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  checkPending: {
    fill: { fgColor: { rgb: 'FEF3C7' } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '92400E' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  }
};

function getStyleForShiftState(state: VisualState) {
  if (state === 'blue') return EXCEL_STYLES.stateBlue24h;
  if (state === 'green') return EXCEL_STYLES.stateGreenNoSchedule;
  if (state === 'yellow') return EXCEL_STYLES.stateYellowUnassigned;
  return EXCEL_STYLES.stateNormal;
}

/**
 * Converte uma matriz 2D (vinda de arquivo Excel .xlsx, .csv ou colada do Excel)
 * Suporta tanto planilha de Vários Dias quanto planilha de 1 Único Dia!
 */
export function parseMatrixToSpreadsheetRows(matrix: unknown[][]): SpreadsheetImportRow[] {
  if (!matrix || matrix.length === 0) return [];

  let headerRowIndex = -1;
  const colMap: {
    client: number;
    assisted: number;
    address: number;
    horario: number;
    singleDay: number;
    monday?: number;
    tuesday?: number;
    wednesday?: number;
    thursday?: number;
    friday?: number;
    saturday?: number;
    sunday?: number;
  } = {
    client: 0,
    assisted: 1,
    address: 2,
    horario: 3,
    singleDay: 4
  };

  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const row = matrix[i] || [];
    const normalized = row.map(normalizeHeader);
    const hasClient = normalized.some((c) => c.includes('cliente') || c.includes('casa'));
    const hasDayOrProf = normalized.some(
      (c) =>
        c.includes('sabado') ||
        c.includes('domingo') ||
        c.includes('segunda') ||
        c.includes('terca') ||
        c.includes('quarta') ||
        c.includes('quinta') ||
        c.includes('sexta') ||
        c.includes('profissional') ||
        c.includes('plantonista') ||
        c.includes('cuidador')
    );

    if (hasClient || hasDayOrProf) {
      headerRowIndex = i;
      normalized.forEach((colName, idx) => {
        if (colName.includes('cliente') || colName.includes('casa')) colMap.client = idx;
        else if (colName.includes('assistido') || colName.includes('paciente'))
          colMap.assisted = idx;
        else if (colName.includes('endereco') || colName.includes('bairro')) colMap.address = idx;
        else if (colName.includes('horario') || colName.includes('turno')) colMap.horario = idx;
        else if (colName.includes('segunda')) {
          colMap.monday = idx;
          colMap.singleDay = idx;
        } else if (colName.includes('terca')) {
          colMap.tuesday = idx;
          colMap.singleDay = idx;
        } else if (colName.includes('quarta')) {
          colMap.wednesday = idx;
          colMap.singleDay = idx;
        } else if (colName.includes('quinta')) {
          colMap.thursday = idx;
          colMap.singleDay = idx;
        } else if (colName.includes('sexta')) {
          colMap.friday = idx;
          colMap.singleDay = idx;
        } else if (colName.includes('sabado')) {
          colMap.saturday = idx;
          colMap.singleDay = idx;
        } else if (colName.includes('domingo')) {
          colMap.sunday = idx;
          if (colMap.saturday === undefined) colMap.singleDay = idx;
        } else if (
          colName.includes('profissional') ||
          colName.includes('plantonista') ||
          colName.includes('cuidador') ||
          colName.includes('escala')
        ) {
          colMap.singleDay = idx;
        }
      });
      break;
    }
  }

  // Se o cabeçalho não especificou dias da semana mas tem as colunas padrão (4=Sáb, 5=Dom, 6=Seg)
  if (
    colMap.saturday === undefined &&
    colMap.sunday === undefined &&
    colMap.monday === undefined
  ) {
    colMap.saturday = 4;
    colMap.sunday = 5;
    colMap.monday = 6;
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const parsed: SpreadsheetImportRow[] = [];

  let lastClientName = '';
  let lastAssistedPerson = '';
  let lastFullAddress = '';

  const getCellStr = (row: unknown[], idx: number | undefined): string | undefined => {
    if (idx === undefined || idx < 0 || idx >= row.length) return undefined;
    return String(row[idx] ?? '').trim();
  };

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const rawClient = String(row[colMap.client] ?? '').trim();
    const rawAssisted = String(row[colMap.assisted] ?? '').trim();
    const rawAddress = String(row[colMap.address] ?? '').trim();
    const rawHorario = String(row[colMap.horario] ?? '').trim();
    const normClient = normalizeHeader(rawClient);

    // Ignora linhas de título ou legenda no final da planilha
    if (
      normClient.startsWith('escalas ') ||
      normClient.startsWith('escala ') ||
      normClient.startsWith('legenda')
    ) {
      continue;
    }

    const singleDayProf = getCellStr(row, colMap.singleDay) ?? '';
    const mondayProf = getCellStr(row, colMap.monday);
    const tuesdayProf = getCellStr(row, colMap.tuesday);
    const wednesdayProf = getCellStr(row, colMap.wednesday);
    const thursdayProf = getCellStr(row, colMap.thursday);
    const fridayProf = getCellStr(row, colMap.friday);
    const saturdayProf = getCellStr(row, colMap.saturday) ?? singleDayProf;
    const sundayProf = getCellStr(row, colMap.sunday) ?? '';

    if (!rawClient && !rawHorario && !singleDayProf && !saturdayProf && !sundayProf) {
      continue;
    }

    const effectiveClient = rawClient || lastClientName;
    const effectiveAssisted = rawAssisted || (rawClient ? '' : lastAssistedPerson) || 'Assistido';
    const effectiveAddress = rawAddress || (rawClient ? '' : lastFullAddress);

    if (!effectiveClient) continue;

    lastClientName = effectiveClient;
    lastAssistedPerson = effectiveAssisted;
    lastFullAddress = effectiveAddress;

    parsed.push({
      clientName: effectiveClient,
      assistedPerson: effectiveAssisted,
      fullAddress: effectiveAddress,
      horario: rawHorario || '07:00 às 19:00',
      singleDayProf,
      mondayProf,
      tuesdayProf,
      wednesdayProf,
      thursdayProf,
      fridayProf,
      saturdayProf,
      sundayProf
    });
  }

  return parsed;
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  week,
  selectedDate,
  organizationName,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // Escopo de Importação: 'single_day' (Somente 1 dia) | 'multi_day' (Semana / Fim de semana)
  const [importScope, setImportScope] = useState<'single_day' | 'multi_day'>('multi_day');
  const [importSingleDate, setImportSingleDate] = useState<string>(selectedDate);
  const [importMode, setImportMode] = useState<'merge' | 'replace_weekend'>('merge');

  // Escopo de Exportação: 'single_day' | 'weekend' | 'full_week'
  const [exportScope, setExportScope] = useState<'single_day' | 'weekend' | 'full_week'>('weekend');
  const [exportSingleDate, setExportSingleDate] = useState<string>(selectedDate);

  const [previewRows, setPreviewRows] = useState<SpreadsheetImportRow[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImportSingleDate(selectedDate);
      setExportSingleDate(selectedDate);
      setError(null);
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: ''
      });

      const rows = parseMatrixToSpreadsheetRows(matrix);
      if (rows.length === 0) {
        setError(
          'Não foi possível identificar linhas na planilha. Verifique se ela possui as colunas: Cliente, Assistido, Endereço, Horario e os dias/profissional.'
        );
        return;
      }
      setPreviewRows(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao ler o arquivo de planilha selecionado.'
      );
    }
  };

  const handleParsePaste = () => {
    setError(null);
    if (!pasteText.trim()) {
      setError('Cole as células copiadas do Excel ou Google Planilhas no campo acima.');
      return;
    }
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.split('\t'))
      .filter((r) => r.some((c) => c.trim() !== ''));

    const rows = parseMatrixToSpreadsheetRows(lines);
    if (rows.length === 0) {
      setError('Não foi possível identificar dados válidos no texto colado.');
      return;
    }
    setPreviewRows(rows);
  };

  // Baixar Modelo de Planilha (.xlsx) JÁ COLORIDO e com as datas explícitas!
  const handleDownloadTemplate = () => {
    const isSingle = importScope === 'single_day';
    const singleDayLabel = `${getWeekdayNamePt(importSingleDate)} (${formatIsoToBr(importSingleDate)})`;
    const satHeader = `Sábado (${formatIsoToBr(week.saturdayDate)})`;
    const sunHeader = `Domingo (${formatIsoToBr(week.sundayDate)})`;
    const monHeader = `Segunda (${formatIsoToBr(week.mondayDate)})`;

    const headers = isSingle
      ? ['Cliente', 'Assistido', 'Endereço', 'Horario', singleDayLabel]
      : ['Cliente', 'Assistido', 'Endereço', 'Horario', satHeader, sunHeader, monHeader];

    const titleText = isSingle
      ? `Escala do Dia ${formatIsoToBr(importSingleDate)} (${getWeekdayNamePt(importSingleDate)}) — ${organizationName}`
      : `Escalas ${formatIsoToShortBr(week.saturdayDate)} e ${formatIsoToBr(week.sundayDate)} — ${organizationName}`;

    const rowsData: {
      client: string;
      assisted: string;
      address: string;
      horario: string;
      cells: { val: string; state: VisualState }[];
    }[] = [
      {
        client: 'Dona Lúcia (Exemplo)',
        assisted: 'Sra. Helena',
        address: 'Rua Barbosa de Freitas, nº 910 - Aldeota - Apto 501',
        horario: '07:00 às 19:00',
        cells: isSingle
          ? [{ val: 'Mariana', state: 'normal' }]
          : [
              { val: 'Mariana', state: 'blue' },
              { val: 'Fernanda', state: 'normal' },
              { val: 'Fernanda', state: 'normal' }
            ]
      },
      {
        client: 'Vila das Acácias (Exemplo)',
        assisted: 'Sr. Joaquim',
        address: 'Av. Treze de Maio, 890 - Fátima',
        horario: '08:00 às 18:00',
        cells: isSingle
          ? [{ val: 'N/A', state: 'green' }]
          : [
              { val: 'N/A', state: 'green' },
              { val: 'N/A', state: 'green' },
              { val: 'Camila', state: 'normal' }
            ]
      },
      {
        client: 'Casa Girassol (Exemplo)',
        assisted: 'Sr. Antônio',
        address: 'Av. Abolição, 2340 - Meireles - Casa 12',
        horario: '07:00 às 07:00',
        cells: isSingle
          ? [{ val: 'Roberto', state: 'blue' }]
          : [
              { val: 'Roberto', state: 'blue' },
              { val: 'Roberto', state: 'blue' },
              { val: 'Lucas', state: 'normal' }
            ]
      },
      {
        client: 'Solar Boa Vista (Exemplo)',
        assisted: 'Sra. Beatriz',
        address: 'Rua Tibúrcio Cavalcante, 1420 - Dionísio Torres - Apto 302',
        horario: '08:00 às 18:00',
        cells: isSingle
          ? [{ val: '', state: 'yellow' }]
          : [
              { val: '', state: 'yellow' },
              { val: '', state: 'yellow' },
              { val: '', state: 'yellow' }
            ]
      }
    ];

    const styledAoA: unknown[][] = [
      headers.map((_h, idx) => ({
        v: idx === 0 ? titleText : '',
        t: 's',
        s: EXCEL_STYLES.titleBanner
      })),
      headers.map((h, idx) => ({
        v: h,
        t: 's',
        s: idx >= 4 ? EXCEL_STYLES.weekendHeaderCell : EXCEL_STYLES.headerCell
      }))
    ];

    for (const r of rowsData) {
      styledAoA.push([
        { v: r.client, t: 's', s: EXCEL_STYLES.clientCell },
        { v: r.assisted, t: 's', s: EXCEL_STYLES.textCell },
        { v: r.address, t: 's', s: EXCEL_STYLES.textCell },
        { v: r.horario, t: 's', s: EXCEL_STYLES.textCell },
        ...r.cells.map((c) => ({
          v: c.val,
          t: 's',
          s: getStyleForShiftState(c.state)
        }))
      ]);
    }

    const ws = XLSXStyle.utils.aoa_to_sheet(styledAoA);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
    ws['!cols'] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 44 },
      { wch: 16 },
      ...headers.slice(4).map(() => ({ wch: 22 }))
    ];
    ws['!rows'] = [{ hpt: 28 }, { hpt: 24 }];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Modelo Escala');
    XLSXStyle.writeFile(
      wb,
      isSingle
        ? `modelo-escala-dia-${importSingleDate}.xlsx`
        : `modelo-escala-semana-${week.saturdayDate}.xlsx`
    );
  };

  // Confirmar Importação
  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const dayByKey = Object.fromEntries(week.days.map((d) => [d.key, d.date]));
      const payload =
        importScope === 'single_day'
          ? {
              singleDate: importSingleDate,
              mode: importMode,
              rows: previewRows
            }
          : {
              mondayDate: dayByKey.monday,
              tuesdayDate: dayByKey.tuesday,
              wednesdayDate: dayByKey.wednesday,
              thursdayDate: dayByKey.thursday,
              fridayDate: dayByKey.friday,
              saturdayDate: week.saturdayDate,
              sundayDate: week.sundayDate,
              mode: importMode,
              rows: previewRows
            };

      const res = await api.importSpreadsheet(payload);
      await onImportSuccess(res.message);
      setPreviewRows([]);
      setPasteText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar planilha.');
    } finally {
      setImporting(false);
    }
  };

  // Exportar Planilha Colorida (.xlsx) ou .csv (Suporta 1 Dia, Fim de Semana ou Semana Completa!)
  const handleExportSpreadsheet = async (format: 'xlsx' | 'csv') => {
    setExporting(true);
    setError(null);
    try {
      // Define quais dias serão exportados conforme a escolha do usuário
      const targetDays: { date: string; headerLabel: string; isWeekend: boolean }[] =
        exportScope === 'single_day'
          ? [
              {
                date: exportSingleDate,
                headerLabel: `${getWeekdayNamePt(exportSingleDate)} (${formatIsoToBr(exportSingleDate)})`,
                isWeekend: [0, 6].includes(new Date(`${exportSingleDate}T12:00:00`).getDay())
              }
            ]
          : exportScope === 'weekend'
            ? [
                {
                  date: week.saturdayDate,
                  headerLabel: `Sábado (${formatIsoToBr(week.saturdayDate)})`,
                  isWeekend: true
                },
                {
                  date: week.sundayDate,
                  headerLabel: `Domingo (${formatIsoToBr(week.sundayDate)})`,
                  isWeekend: true
                },
                {
                  date: week.mondayDate,
                  headerLabel: `Segunda (${formatIsoToBr(week.mondayDate)})`,
                  isWeekend: false
                }
              ]
            : week.days.map((d) => ({
                date: d.date,
                headerLabel: `${d.label} (${formatIsoToBr(d.date)})`,
                isWeekend: d.isWeekend
              }));

      // Busca os plantões de todas as datas selecionadas em paralelo
      const resultsByDay = await Promise.all(
        targetDays.map((td) =>
          api.getShifts({ date: td.date, includeUnscheduledHouses: true })
        )
      );

      // Consolida por Casa + Horário mantendo o estado visual (Azul, Verde, Amarelo, Normal) de cada célula!
      interface ConsolidatedCell {
        text: string;
        visualState: VisualState;
        checkStatus: string;
      }

      const rowMap = new Map<
        string,
        {
          clientName: string;
          assistedPerson: string;
          fullAddress: string;
          horario: string;
          dayCells: Record<string, ConsolidatedCell>;
        }
      >();

      const toCellInfo = (r: EnrichedShiftRow): ConsolidatedCell => {
        if (r.visual_state === 'green') {
          return { text: 'N/A', visualState: 'green', checkStatus: 'Não precisa' };
        }
        if (r.visual_state === 'yellow') {
          return { text: '', visualState: 'yellow', checkStatus: 'Aguardando escala' };
        }
        if (r.visual_state === 'blue') {
          return {
            text: r.professional_name || 'Plantão 24h',
            visualState: 'blue',
            checkStatus: 'Plantão 24h/48h (Não precisa)'
          };
        }
        return {
          text: r.professional_name || '',
          visualState: 'normal',
          checkStatus: r.check_status === 'done' ? 'Feita ✓' : 'Pendente'
        };
      };

      targetDays.forEach((td, dayIdx) => {
        const dayRows = resultsByDay[dayIdx] || [];
        for (const r of dayRows) {
          const horarioLabel =
            r.visual_state === 'green' ? '07:00 às 19:00' : `${r.start_time} às ${r.end_time}`;
          const key = `${r.house_id}__${horarioLabel}`;
          let entry = rowMap.get(key);
          if (!entry) {
            entry = {
              clientName: r.house_name,
              assistedPerson: r.assisted_person,
              fullAddress: `${r.address} - ${r.neighborhood}`,
              horario: horarioLabel,
              dayCells: {}
            };
            rowMap.set(key, entry);
          }
          entry.dayCells[td.date] = toCellInfo(r);
        }
      });

      const isSingleDayExport = exportScope === 'single_day';
      const titleBannerText = isSingleDayExport
        ? `Escala do Dia ${formatIsoToBr(exportSingleDate)} (${getWeekdayNamePt(exportSingleDate)}) — ${organizationName}`
        : exportScope === 'weekend'
          ? `Escalas de Fim de Semana (${formatIsoToBr(week.saturdayDate)} e ${formatIsoToBr(week.sundayDate)}) — ${organizationName}`
          : `Escala Semanal (${formatIsoToBr(week.startDate)} a ${formatIsoToBr(week.endDate)}) — ${organizationName}`;

      const headerColumns = [
        'Cliente',
        'Assistido',
        'Endereço',
        'Horario',
        ...targetDays.map((td) => td.headerLabel),
        ...(isSingleDayExport ? ['Status Checagem'] : [])
      ];

      // Constrói matriz estilizada com cores para o Excel (.xlsx)
      const styledMatrix: unknown[][] = [
        // Linha 0: Banner com título e datas da escala
        headerColumns.map((_col, idx) => ({
          v: idx === 0 ? titleBannerText : '',
          t: 's',
          s: EXCEL_STYLES.titleBanner
        })),
        // Linha 1: Cabeçalhos das colunas com as datas
        headerColumns.map((col, idx) => {
          const isDayCol = idx >= 4 && idx < 4 + targetDays.length;
          const dayMeta = isDayCol ? targetDays[idx - 4] : null;
          return {
            v: col,
            t: 's',
            s: dayMeta?.isWeekend ? EXCEL_STYLES.weekendHeaderCell : EXCEL_STYLES.headerCell
          };
        })
      ];

      // Linhas de dados com cada célula colorida conforme seu estado (Azul, Verde, Amarelo ou Normal)
      for (const item of rowMap.values()) {
        const rowCells: unknown[] = [
          { v: item.clientName, t: 's', s: EXCEL_STYLES.clientCell },
          { v: item.assistedPerson, t: 's', s: EXCEL_STYLES.textCell },
          { v: item.fullAddress, t: 's', s: EXCEL_STYLES.textCell },
          { v: item.horario, t: 's', s: EXCEL_STYLES.textCell }
        ];

        for (const td of targetDays) {
          const cellData = item.dayCells[td.date] || {
            text: 'N/A',
            visualState: 'green' as VisualState,
            checkStatus: 'Não precisa'
          };
          rowCells.push({
            v: cellData.text,
            t: 's',
            s: getStyleForShiftState(cellData.visualState)
          });

          if (isSingleDayExport) {
            const checkStyle =
              cellData.checkStatus === 'Feita ✓'
                ? EXCEL_STYLES.checkDone
                : cellData.checkStatus === 'Pendente'
                  ? EXCEL_STYLES.checkPending
                  : EXCEL_STYLES.textCell;
            rowCells.push({
              v: cellData.checkStatus,
              t: 's',
              s: checkStyle
            });
          }
        }

        styledMatrix.push(rowCells);
      }

      // Linha de Legenda de Cores no rodapé da planilha Excel
      styledMatrix.push([]);
      styledMatrix.push([
        { v: 'LEGENDA DE CORES:', t: 's', s: EXCEL_STYLES.headerCell },
        {
          v: 'Azul = Plantão 24h / 48h (Permanece na casa)',
          t: 's',
          s: EXCEL_STYLES.stateBlue24h
        },
        {
          v: 'Verde (N/A) = Sem escala para a casa no dia',
          t: 's',
          s: EXCEL_STYLES.stateGreenNoSchedule
        },
        {
          v: 'Amarelo = Falta definir o profissional',
          t: 's',
          s: EXCEL_STYLES.stateYellowUnassigned
        },
        {
          v: 'Branco = Plantão normal com checagem',
          t: 's',
          s: EXCEL_STYLES.stateNormal
        }
      ]);

      const ws = XLSXStyle.utils.aoa_to_sheet(styledMatrix);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerColumns.length - 1 } }];
      ws['!cols'] = [
        { wch: 28 },
        { wch: 22 },
        { wch: 44 },
        { wch: 16 },
        ...targetDays.map(() => ({ wch: 22 })),
        ...(isSingleDayExport ? [{ wch: 22 }] : [])
      ];

      const wb = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(wb, ws, 'Escalas');

      const baseFileName = isSingleDayExport
        ? `escala-dia-${exportSingleDate}`
        : exportScope === 'weekend'
          ? `escala-fds-${week.saturdayDate}-a-${week.sundayDate}`
          : `escala-semana-${week.startDate}-a-${week.endDate}`;

      if (format === 'xlsx') {
        XLSXStyle.writeFile(wb, `${baseFileName}.xlsx`);
      } else {
        XLSX.writeFile(wb, `${baseFileName}.csv`, { bookType: 'csv' });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar planilha.');
    } finally {
      setExporting(false);
    }
  };

  const renderPreviewCellBadge = (val: string, horario: string) => {
    const trimmed = (val || '').trim();
    const upper = trimmed.toUpperCase();
    if (upper === 'N/A' || upper === 'NA' || upper === '-') {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
          N/A (Verde)
        </span>
      );
    }
    if (!trimmed) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[11px]">
          Vazio (Amarelo)
        </span>
      );
    }
    const is24h =
      /(\d{1,2}:\d{2})\s*(?:às|as|-)\s*\1/i.test(horario) || /\b(24h|48h)\b/i.test(trimmed);
    if (is24h) {
      return (
        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold text-[11px]">
          {trimmed} (Azul 24h)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-medium text-[11px]">
        {trimmed}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spreadsheet-modal-title"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="sm:hidden pt-2.5 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Cabeçalho */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="spreadsheet-modal-title" className="text-base font-bold text-slate-900">
                Importar e Exportar Planilha Colorida (.xlsx / .csv)
              </h2>
              <p className="text-xs text-slate-500">
                Suporta <strong>1 dia específico</strong>, <strong>Fim de Semana</strong> ou{' '}
                <strong>Semana Completa</strong> com datas e cores no Excel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Importar / Exportar */}
        <div className="px-5 sm:px-6 pt-3 border-b border-slate-100 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setError(null);
            }}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'border-[#5B4FE9] text-[#5B4FE9]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Planilha (.xlsx, .csv ou Colar)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setError(null);
            }}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'border-[#5B4FE9] text-[#5B4FE9]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Planilha Colorida (.xlsx / .csv)</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 max-h-[78vh] overflow-y-auto space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          {activeTab === 'import' ? (
            <>
              {/* Seletor: Importar Somente 1 Dia vs Vários Dias da Semana */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    1. Escolha o período de destino da importação:
                  </span>

                  <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setImportScope('single_day')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        importScope === 'single_day'
                          ? 'bg-[#5B4FE9] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Somente 1 Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportScope('multi_day')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        importScope === 'multi_day'
                          ? 'bg-[#5B4FE9] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Vários Dias ({week.label})
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/70 text-xs">
                  {importScope === 'single_day' ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#5B4FE9]" />
                      <label htmlFor="import-single-date" className="font-semibold text-slate-700">
                        Data da escala:
                      </label>
                      <input
                        id="import-single-date"
                        type="date"
                        value={importSingleDate}
                        onChange={(e) => setImportSingleDate(e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900"
                      />
                      <span className="text-slate-500">
                        ({getWeekdayNamePt(importSingleDate)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-600">
                      Semana: <strong className="text-[#5B4FE9]">{week.label}</strong> (Sáb{' '}
                      {formatIsoToShortBr(week.saturdayDate)} e Dom{' '}
                      {formatIsoToShortBr(week.sundayDate)})
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-[#5B4FE9]"
                      />
                      <span>Mesclar / Atualizar</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace_weekend'}
                        onChange={() => setImportMode('replace_weekend')}
                        className="text-[#5B4FE9]"
                      />
                      <span>
                        {importScope === 'single_day'
                          ? 'Substituir este dia'
                          : 'Substituir semana'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Área de Upload + Botão de Modelo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#5B4FE9] bg-slate-50/60 p-4 flex flex-col items-center justify-center text-center transition-colors">
                  <Upload className="w-7 h-7 text-[#5B4FE9] mb-2" />
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    Selecione sua planilha Excel (.xlsx) ou CSV
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Reconhece células mescladas, <code>N/A</code> (Verde), células vazias (Amarelo) e
                    plantões 24h (Azul).
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                    >
                      Escolher arquivo (.xlsx / .csv)
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        Baixar modelo colorido ({importScope === 'single_day' ? '1 Dia' : 'Semana'})
                      </span>
                    </button>
                  </div>
                </div>

                {/* Opção de colar direto do Excel / Google Sheets */}
                <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                      <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                      <span>Ou cole direto do Excel / Google Planilhas</span>
                    </div>
                    <textarea
                      rows={3}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Copie o intervalo da planilha (Ctrl+C) e cole aqui (Ctrl+V)..."
                      className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleParsePaste}
                    className="mt-2 self-end px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Processar texto colado
                  </button>
                </div>
              </div>

              {/* Pré-visualização das linhas lidas */}
              {previewRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {previewRows.length} linhas de escala identificadas na planilha
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewRows([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Limpar prévia
                    </button>
                  </div>

                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <th className="py-2 px-3">Cliente</th>
                          <th className="py-2 px-3">Assistido</th>
                          <th className="py-2 px-3">Horário</th>
                          {importScope === 'single_day' ? (
                            <th className="py-2 px-3">
                              {getWeekdayNamePt(importSingleDate)} ({formatIsoToBr(importSingleDate)})
                            </th>
                          ) : (
                            <>
                              <th className="py-2 px-3">
                                Sábado ({formatIsoToShortBr(week.saturdayDate)})
                              </th>
                              <th className="py-2 px-3">
                                Domingo ({formatIsoToShortBr(week.sundayDate)})
                              </th>
                              <th className="py-2 px-3">
                                Segunda ({formatIsoToShortBr(week.mondayDate)})
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {r.clientName}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{r.assistedPerson}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                              {r.horario}
                            </td>
                            {importScope === 'single_day' ? (
                              <td className="py-2 px-3">
                                {renderPreviewCellBadge(
                                  r.singleDayProf ?? r.saturdayProf ?? '',
                                  r.horario
                                )}
                              </td>
                            ) : (
                              <>
                                <td className="py-2 px-3">
                                  {renderPreviewCellBadge(r.saturdayProf, r.horario)}
                                </td>
                                <td className="py-2 px-3">
                                  {renderPreviewCellBadge(r.sundayProf, r.horario)}
                                </td>
                                <td className="py-2 px-3">
                                  {renderPreviewCellBadge(r.mondayProf || '', r.horario)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={importing}
                      onClick={handleConfirmImport}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {importing
                        ? 'Importando para o banco...'
                        : `Confirmar Importação (${previewRows.length} linhas)`}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ABA DE EXPORTAÇÃO COM OPÇÃO DE 1 DIA, FIM DE SEMANA OU SEMANA COMPLETA + CORES NO EXCEL */
            <div className="space-y-4">
              {/* Opções de escopo de exportação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setExportScope('single_day')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    exportScope === 'single_day'
                      ? 'border-[#5B4FE9] bg-indigo-50/60 ring-1 ring-[#5B4FE9]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">Somente 1 Dia</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Exporta apenas a data escolhida ({formatIsoToBr(exportSingleDate)})
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('weekend')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    exportScope === 'weekend'
                      ? 'border-[#5B4FE9] bg-indigo-50/60 ring-1 ring-[#5B4FE9]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">
                    Fim de Semana (Sáb, Dom e Seg)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formatIsoToShortBr(week.saturdayDate)}, {formatIsoToShortBr(week.sundayDate)} e{' '}
                    {formatIsoToShortBr(week.mondayDate)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('full_week')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    exportScope === 'full_week'
                      ? 'border-[#5B4FE9] bg-indigo-50/60 ring-1 ring-[#5B4FE9]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">
                    Semana Completa (7 Dias)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Segunda ({formatIsoToShortBr(week.startDate)}) a Domingo (
                    {formatIsoToShortBr(week.endDate)})
                  </div>
                </button>
              </div>

              {/* Seletor da data caso esteja em "Somente 1 Dia" */}
              {exportScope === 'single_day' && (
                <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/70 flex flex-wrap items-center gap-3 text-xs">
                  <Calendar className="w-4 h-4 text-[#5B4FE9]" />
                  <label htmlFor="export-single-date" className="font-semibold text-slate-800">
                    Selecione o dia que deseja exportar:
                  </label>
                  <input
                    id="export-single-date"
                    type="date"
                    value={exportSingleDate}
                    onChange={(e) => setExportSingleDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900"
                  />
                  <span className="font-medium text-indigo-800">
                    ({getWeekdayNamePt(exportSingleDate)} · {formatIsoToBr(exportSingleDate)})
                  </span>
                </div>
              )}

              {/* Resumo das Cores preservadas no Excel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Palette className="w-4 h-4 text-[#5B4FE9]" />
                  <span>
                    A planilha Excel (<code>.xlsx</code>) exportada inclui automaticamente as datas
                    no cabeçalho e as cores de cada estado:
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#CFE2F3] text-[#0C4A6E] font-semibold border border-sky-300">
                    Azul: Plantão 24h / 48h
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#C6EFCE] text-[#14532D] font-semibold border border-emerald-300">
                    Verde (N/A): Sem escala
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#FFFF00] text-[#713F12] font-semibold border border-amber-400">
                    Amarelo: Sem profissional
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 font-semibold border border-slate-300">
                    Branco: Plantão normal
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => handleExportSpreadsheet('xlsx')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {exporting
                        ? 'Gerando planilha...'
                        : exportScope === 'single_day'
                          ? `Baixar Excel Colorido do Dia (${formatIsoToBr(exportSingleDate)})`
                          : exportScope === 'weekend'
                            ? `Baixar Excel Colorido do Fim de Semana`
                            : `Baixar Excel Colorido da Semana (${week.label})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => handleExportSpreadsheet('csv')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar em .CSV (Texto)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
