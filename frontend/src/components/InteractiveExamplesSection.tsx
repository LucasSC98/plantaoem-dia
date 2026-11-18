import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import {
  Sparkles,
  Clock,
  MapPin,
  Check,
  AlertTriangle,
  Trash2,
  RotateCcw,
  BookOpen,
  Building2,
  FileSpreadsheet,
  CheckSquare,
  Plus,
  Users,
  Pencil,
  Search,
  Filter,
  Download,
  Upload,
  X,
  Calendar,
  ListChecks,
  ClipboardPaste,
  Palette,
  LayoutList,
  Table as TableIcon
} from 'lucide-react';
import {
  EnrichedShiftRow,
  House,
  Professional,
  ShiftPeriod,
  ShiftType,
  VisualState
} from '../types';
import {
  ConfirmDeleteModal,
  HouseModal,
  ProfessionalModal,
  ShiftModal
} from './Modals';
import { parseMatrixToSpreadsheetRows } from './SpreadsheetModal';
import { addDays, formatDayMonthShort, getCurrentWeekSaturdayIso } from '../utils/dates';

const AVATAR_COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  blue: 'bg-sky-100 text-sky-700',
  purple: 'bg-purple-100 text-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-cyan-100 text-cyan-700',
  violet: 'bg-violet-100 text-violet-700',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700'
};

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
  stateNormal: {
    fill: { fgColor: { rgb: 'FFFFFF' } },
    font: { name: 'Calibri', sz: 11, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  stateBlue24h: {
    fill: { fgColor: { rgb: 'CFE2F3' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0C4A6E' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  stateGreenNoSchedule: {
    fill: { fgColor: { rgb: 'C6EFCE' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '14532D' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: THIN_BORDER
  },
  stateYellowUnassigned: {
    fill: { fgColor: { rgb: 'FFFF00' } },
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

function formatIsoToBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function computeVisualState(
  shiftType: ShiftType,
  shiftPeriod: ShiftPeriod,
  professionalId: number | null
): VisualState {
  if (shiftType === 'no_schedule' || shiftPeriod === 'sem_escala') return 'green';
  if (shiftType === 'stay_in_24h_48h' || shiftPeriod === '24h' || shiftPeriod === '48h')
    return 'blue';
  if (shiftType === 'unassigned' || !professionalId) return 'yellow';
  return 'normal';
}

const INITIAL_DEMO_HOUSES: House[] = [
  {
    id: 1,
    name: 'Dona Lúcia (Exemplo)',
    assisted_person: 'Sra. Helena',
    neighborhood: 'Aldeota',
    address: 'Apartamento 501 · Rua Barbosa de Freitas, 910',
    notes: 'Acompanhamento diurno (Dados fictícios)',
    active: 1,
    created_at: ''
  },
  {
    id: 2,
    name: 'Casa Girassol (Exemplo)',
    assisted_person: 'Sr. Antônio',
    neighborhood: 'Meireles',
    address: 'Casa 12 · Av. Abolição, 2340',
    notes: 'Plantão 24h/48h de fim de semana (Dados fictícios)',
    active: 1,
    created_at: ''
  },
  {
    id: 3,
    name: 'Residencial Horizonte (Exemplo)',
    assisted_person: 'Dona Célia',
    neighborhood: 'Cocó',
    address: 'Rua das Flores, 220 · Bloco B',
    notes: 'Fisioterapia leve pela manhã (Dados fictícios)',
    active: 1,
    created_at: ''
  },
  {
    id: 4,
    name: 'Vila das Acácias (Exemplo)',
    assisted_person: 'Sr. Joaquim',
    neighborhood: 'Fátima',
    address: 'Av. Treze de Maio, 890 · Casa 04',
    notes: 'Família assume aos sábados (Dados fictícios)',
    active: 1,
    created_at: ''
  },
  {
    id: 5,
    name: 'Solar Boa Vista (Exemplo)',
    assisted_person: 'Sra. Beatriz',
    neighborhood: 'Dionísio Torres',
    address: 'Rua Tibúrcio Cavalcante, 1420 · Apto 302',
    notes: 'Aguardando confirmação de cobertura (Dados fictícios)',
    active: 1,
    created_at: ''
  }
];

const INITIAL_DEMO_PROFESSIONALS: Professional[] = [
  {
    id: 1,
    name: 'Mariana',
    role: 'Cuidadora Sênior',
    phone: '(85) 99100-0101',
    avatar_color: 'indigo',
    active: 1,
    created_at: ''
  },
  {
    id: 2,
    name: 'Arlindo Anomalia',
    role: 'Técnico de Enfermagem',
    phone: '(85) 99100-0202',
    avatar_color: 'blue',
    active: 1,
    created_at: ''
  },
  {
    id: 3,
    name: 'Camila',
    role: 'Cuidadora',
    phone: '(85) 99100-0303',
    avatar_color: 'purple',
    active: 1,
    created_at: ''
  },
  {
    id: 4,
    name: 'Fernanda',
    role: 'Cuidadora',
    phone: '(85) 99100-0404',
    avatar_color: 'emerald',
    active: 1,
    created_at: ''
  },
  {
    id: 5,
    name: 'Gustavo',
    role: 'Cuidador',
    phone: '(85) 99100-0505',
    avatar_color: 'amber',
    active: 1,
    created_at: ''
  }
];

interface DemoShiftInternal {
  id: number;
  house_id: number;
  professional_id: number | null;
  date: string;
  shift_period: ShiftPeriod;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  check_status: 'pending' | 'done';
  notes: string;
}

function buildInitialDemoShifts(satDate: string, sunDate: string, monDate: string): DemoShiftInternal[] {
  return [
    // DIA 1: SÁBADO
    {
      id: 101,
      house_id: 1,
      professional_id: 1, // Mariana
      date: satDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'normal',
      check_status: 'pending',
      notes: 'Exemplo de plantão normal com checagem pendente'
    },
    {
      id: 102,
      house_id: 2,
      professional_id: 2, // Roberto
      date: satDate,
      shift_period: '24h',
      start_time: '19:00',
      end_time: '07:00',
      shift_type: 'stay_in_24h_48h',
      check_status: 'pending',
      notes: 'Exemplo Azul: plantão 24h/48h (permanece na casa)'
    },
    {
      id: 103,
      house_id: 3,
      professional_id: 3, // Camila
      date: satDate,
      shift_period: 'diurno',
      start_time: '07:00',
      endTime: '19:00',
      end_time: '19:00',
      shift_type: 'normal',
      check_status: 'done',
      notes: 'Exemplo de plantão normal com checagem concluída'
    } as DemoShiftInternal,
    {
      id: 104,
      house_id: 4,
      professional_id: null,
      date: satDate,
      shift_period: 'sem_escala',
      start_time: '--:--',
      end_time: '--:--',
      shift_type: 'no_schedule',
      check_status: 'pending',
      notes: 'Exemplo Verde: sem escala neste dia'
    },
    {
      id: 105,
      house_id: 5,
      professional_id: null,
      date: satDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'unassigned',
      check_status: 'pending',
      notes: 'Exemplo Amarelo: falta definir o profissional'
    },

    // DIA 2: DOMINGO
    {
      id: 201,
      house_id: 1,
      professional_id: 4, // Fernanda
      date: sunDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'normal',
      check_status: 'pending',
      notes: 'Plantão de domingo'
    },
    {
      id: 202,
      house_id: 2,
      professional_id: 2, // Roberto
      date: sunDate,
      shift_period: '48h',
      start_time: '07:00',
      end_time: '07:00',
      shift_type: 'stay_in_24h_48h',
      check_status: 'pending',
      notes: 'Continuação plantão 48h'
    },
    {
      id: 203,
      house_id: 3,
      professional_id: 3, // Camila
      date: sunDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'normal',
      check_status: 'done',
      notes: 'Checagem feita'
    },
    {
      id: 204,
      house_id: 4,
      professional_id: 5, // Gustavo
      date: sunDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'normal',
      check_status: 'pending',
      notes: 'Retorno no domingo'
    },
    {
      id: 205,
      house_id: 5,
      professional_id: null,
      date: sunDate,
      shift_period: 'sem_escala',
      start_time: '--:--',
      end_time: '--:--',
      shift_type: 'no_schedule',
      check_status: 'pending',
      notes: 'Sem escala no domingo'
    },

    // DIA 3: SEGUNDA-FEIRA
    {
      id: 301,
      house_id: 1,
      professional_id: 1, // Mariana
      date: monDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'normal',
      check_status: 'done',
      notes: 'Plantão de segunda-feira'
    },
    {
      id: 302,
      house_id: 2,
      professional_id: 2, // Roberto
      date: monDate,
      shift_period: '24h',
      start_time: '07:00',
      end_time: '07:00',
      shift_type: 'stay_in_24h_48h',
      check_status: 'pending',
      notes: 'Plantão 24h'
    },
    {
      id: 303,
      house_id: 3,
      professional_id: null,
      date: monDate,
      shift_period: 'diurno',
      start_time: '07:00',
      end_time: '19:00',
      shift_type: 'unassigned',
      check_status: 'pending',
      notes: 'Falta definir profissional na segunda-feira'
    }
  ];
}

export const InteractiveExamplesSection: React.FC = () => {
  // As 3 datas do exemplo (Sábado, Domingo e Segunda da semana atual)
  const satDate = useMemo(() => getCurrentWeekSaturdayIso(), []);
  const sunDate = useMemo(() => addDays(satDate, 1), [satDate]);
  const monDate = useMemo(() => addDays(satDate, 2), [satDate]);

  const threeDays = useMemo(
    () => [
      { key: 'saturday' as const, label: 'Sábado', date: satDate, short: formatDayMonthShort(satDate), isWeekend: true },
      { key: 'sunday' as const, label: 'Domingo', date: sunDate, short: formatDayMonthShort(sunDate), isWeekend: true },
      { key: 'monday' as const, label: 'Segunda', date: monDate, short: formatDayMonthShort(monDate), isWeekend: false }
    ],
    [satDate, sunDate, monDate]
  );

  // Estado em memória do Simulador de Exemplos (Casas, Profissionais e Plantões)
  const [houses, setHouses] = useState<House[]>(INITIAL_DEMO_HOUSES);
  const [professionals, setProfessionals] = useState<Professional[]>(INITIAL_DEMO_PROFESSIONALS);
  const [shifts, setShifts] = useState<DemoShiftInternal[]>(() =>
    buildInitialDemoShifts(satDate, sunDate, monDate)
  );

  const [selectedDate, setSelectedDate] = useState<string>(satDate);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyPending, setOnlyPending] = useState<boolean>(false);
  const [visualStateFilter, setVisualStateFilter] = useState<string>('all');
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Modais do Simulador (Mesmos modais da escala real!)
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<EnrichedShiftRow | null>(null);
  const [defaultModalHouseId, setDefaultModalHouseId] = useState<number | null>(null);

  const [houseModalOpen, setHouseModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);

  const [profModalOpen, setProfModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => { }
  });

  // Modal de Planilha do Exemplo
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'import' | 'export'>('export');
  const [exportScope, setExportScope] = useState<'single_day' | 'three_days'>('three_days');
  const [exportSingleDate, setExportSingleDate] = useState<string>(satDate);
  const [importScope, setImportScope] = useState<'single_day' | 'three_days'>('three_days');
  const [importSingleDate, setImportSingleDate] = useState<string>(satDate);
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<ReturnType<typeof parseMatrixToSpreadsheetRows>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Constrói linhas enriquecidas para uma data (incluindo casas sem escala em Verde)
  const buildEnrichedRowsForDate = (targetDate: string): EnrichedShiftRow[] => {
    const dayShifts = shifts.filter((s) => s.date === targetDate);
    const enriched: EnrichedShiftRow[] = dayShifts.map((s) => {
      const house = houses.find((h) => h.id === s.house_id) || {
        id: s.house_id,
        name: 'Casa Exemplo',
        assisted_person: 'Assistido',
        neighborhood: 'Bairro',
        address: 'Endereço'
      };
      const prof = s.professional_id
        ? professionals.find((p) => p.id === s.professional_id) || null
        : null;

      const visualState = computeVisualState(s.shift_type, s.shift_period, s.professional_id);
      const requiresCheck = visualState === 'normal';

      return {
        id: s.id,
        shift_id: s.id,
        house_id: house.id,
        house_name: house.name,
        assisted_person: house.assisted_person,
        neighborhood: house.neighborhood,
        address: house.address,
        professional_id: prof ? prof.id : null,
        professional_name: prof ? prof.name : null,
        professional_role: prof ? prof.role : null,
        professional_phone: prof ? prof.phone : null,
        professional_avatar_color: prof ? prof.avatar_color : null,
        date: s.date,
        shift_period: s.shift_period,
        start_time: s.start_time,
        end_time: s.end_time,
        shift_type: s.shift_type,
        visual_state: visualState,
        requires_check: requiresCheck,
        check_id: s.id,
        check_status: requiresCheck ? s.check_status : 'not_applicable',
        checked_at: s.check_status === 'done' ? `${s.date}T07:15:00` : null,
        checked_by: 'Coordenação',
        notes: s.notes
      };
    });

    const scheduledHouseIds = new Set(enriched.map((r) => r.house_id));
    for (const h of houses) {
      if (!scheduledHouseIds.has(h.id)) {
        enriched.push({
          id: -h.id,
          shift_id: null,
          house_id: h.id,
          house_name: h.name,
          assisted_person: h.assisted_person,
          neighborhood: h.neighborhood,
          address: h.address,
          professional_id: null,
          professional_name: null,
          professional_role: null,
          professional_phone: null,
          professional_avatar_color: null,
          date: targetDate,
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
          notes: 'Sem escala neste dia de exemplo'
        });
      }
    }

    return enriched;
  };

  const allDayRows = useMemo(
    () => buildEnrichedRowsForDate(selectedDate),
    [shifts, houses, professionals, selectedDate]
  );

  const filteredRows = useMemo(() => {
    let list = allDayRows;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.house_name.toLowerCase().includes(q) ||
          r.assisted_person.toLowerCase().includes(q) ||
          r.neighborhood.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          (r.professional_name && r.professional_name.toLowerCase().includes(q))
      );
    }
    if (onlyPending) {
      list = list.filter((r) => r.requires_check && r.check_status === 'pending');
    }
    if (visualStateFilter && visualStateFilter !== 'all') {
      if (visualStateFilter === 'pending_check') {
        list = list.filter((r) => r.requires_check && r.check_status === 'pending');
      } else if (visualStateFilter === 'done_check') {
        list = list.filter((r) => r.requires_check && r.check_status === 'done');
      } else {
        list = list.filter((r) => r.visual_state === visualStateFilter);
      }
    }
    return list;
  }, [allDayRows, searchQuery, onlyPending, visualStateFilter]);

  // Métricas de Resumo dos Exemplos
  const totalExampleShifts = shifts.filter((s) => s.shift_type !== 'no_schedule').length;
  const dayCheckable = allDayRows.filter((r) => r.requires_check);
  const dayPendingChecks = dayCheckable.filter((r) => r.check_status === 'pending').length;
  const total24h48h = shifts.filter(
    (s) => s.shift_type === 'stay_in_24h_48h' || s.shift_period === '24h' || s.shift_period === '48h'
  ).length;
  const day24h48h = allDayRows.filter((r) => r.visual_state === 'blue').length;

  // Alternar checagem no exemplo
  const handleToggleCheck = (row: EnrichedShiftRow) => {
    if (!row.shift_id) return;
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== row.shift_id) return s;
        const nextStatus = s.check_status === 'done' ? 'pending' : 'done';
        return { ...s, check_status: nextStatus };
      })
    );
    notify(
      `[Exemplo] Checagem de ${row.house_name} marcada como ${row.check_status === 'done' ? 'pendente' : 'feita'
      }.`
    );
  };

  // Criar ou Editar Plantão no Exemplo
  const handleSaveShift = async (data: {
    id?: number | null;
    house_id: number;
    professional_id: number | null;
    date: string;
    shift_period: ShiftPeriod;
    start_time: string;
    end_time: string;
    shift_type: ShiftType;
    notes: string;
  }) => {
    if (data.id) {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === data.id
            ? {
              ...s,
              house_id: data.house_id,
              professional_id: data.professional_id,
              date: data.date,
              shift_period: data.shift_period,
              start_time: data.start_time,
              end_time: data.end_time,
              shift_type: data.shift_type,
              notes: data.notes
            }
            : s
        )
      );
      notify('[Exemplo] Escala de exemplo atualizada!');
    } else {
      const newId = Date.now();
      setShifts((prev) => [
        ...prev.filter(
          (s) =>
            !(
              s.house_id === data.house_id &&
              s.date === data.date &&
              s.shift_type === 'no_schedule'
            )
        ),
        {
          id: newId,
          house_id: data.house_id,
          professional_id: data.professional_id,
          date: data.date,
          shift_period: data.shift_period,
          start_time: data.start_time,
          end_time: data.end_time,
          shift_type: data.shift_type,
          check_status: 'pending',
          notes: data.notes
        }
      ]);
      notify('[Exemplo] Nova escala adicionada ao simulador!');
    }
  };

  // Excluir Plantão no Exemplo
  const handleDeleteShift = (row: EnrichedShiftRow) => {
    if (!row.shift_id) return;
    const targetId = row.shift_id;
    setDeleteConfirm({
      isOpen: true,
      title: 'Excluir plantão do exemplo?',
      description: `Deseja remover o plantão de exemplo da casa "${row.house_name}"?`,
      onConfirm: async () => {
        setShifts((prev) => prev.filter((s) => s.id !== targetId));
        notify('[Exemplo] Plantão removido do simulador.');
      }
    });
  };

  // Criar ou Editar Casa no Exemplo
  const handleSaveHouse = async (data: {
    id?: number;
    name: string;
    assisted_person: string;
    neighborhood: string;
    address: string;
    notes: string;
  }) => {
    if (data.id) {
      setHouses((prev) =>
        prev.map((h) => (h.id === data.id ? { ...h, ...data } : h))
      );
      notify(`[Exemplo] Casa "${data.name}" atualizada.`);
    } else {
      const newHouse: House = {
        id: Date.now(),
        name: data.name,
        assisted_person: data.assisted_person,
        neighborhood: data.neighborhood,
        address: data.address,
        notes: data.notes,
        active: 1,
        created_at: ''
      };
      setHouses((prev) => [...prev, newHouse]);
      notify(`[Exemplo] Casa "${data.name}" adicionada ao simulador.`);
    }
  };

  // Criar ou Editar Profissional no Exemplo
  const handleSaveProfessional = async (data: {
    id?: number;
    name: string;
    role: string;
    phone: string;
    avatar_color: string;
  }) => {
    if (data.id) {
      setProfessionals((prev) =>
        prev.map((p) => (p.id === data.id ? { ...p, ...data } : p))
      );
      notify(`[Exemplo] Profissional "${data.name}" atualizado(a).`);
    } else {
      const newProf: Professional = {
        id: Date.now(),
        name: data.name,
        role: data.role,
        phone: data.phone,
        avatar_color: data.avatar_color,
        active: 1,
        created_at: ''
      };
      setProfessionals((prev) => [...prev, newProf]);
      notify(`[Exemplo] Profissional "${data.name}" adicionado(a) ao simulador.`);
    }
  };

  // Restaurar ou Limpar Exemplos
  const handleRestoreDefaults = () => {
    setHouses(INITIAL_DEMO_HOUSES);
    setProfessionals(INITIAL_DEMO_PROFESSIONALS);
    setShifts(buildInitialDemoShifts(satDate, sunDate, monDate));
    setSelectedDate(satDate);
    notify('Exemplos originais de 3 dias restaurados!');
  };

  const handleClearAll = () => {
    setShifts([]);
    notify('Todos os plantões de exemplo foram limpos.');
  };

  // Exportar Planilha Colorida (.xlsx ou .csv) dos Exemplos!
  const handleExportExampleSpreadsheet = (format: 'xlsx' | 'csv') => {
    const targetDays =
      exportScope === 'single_day'
        ? [
          threeDays.find((d) => d.date === exportSingleDate) || {
            key: 'saturday' as const,
            label: 'Dia Exemplo',
            date: exportSingleDate,
            short: formatIsoToBr(exportSingleDate),
            isWeekend: true
          }
        ]
        : threeDays;

    const isSingle = exportScope === 'single_day';
    const titleBannerText = isSingle
      ? `Escala de Exemplo — Dia ${formatIsoToBr(targetDays[0].date)} (${targetDays[0].label})`
      : `Escalas de Exemplo (3 Dias: ${formatIsoToBr(satDate)} a ${formatIsoToBr(monDate)})`;

    const headerColumns = [
      'Cliente',
      'Assistido',
      'Endereço',
      'Horario',
      ...targetDays.map((td) => `${td.label} (${formatIsoToBr(td.date)})`),
      ...(isSingle ? ['Status Checagem'] : [])
    ];

    const styledMatrix: unknown[][] = [
      headerColumns.map((_c, idx) => ({
        v: idx === 0 ? titleBannerText : '',
        t: 's',
        s: EXCEL_STYLES.titleBanner
      })),
      headerColumns.map((col, idx) => ({
        v: col,
        t: 's',
        s: idx >= 4 ? EXCEL_STYLES.weekendHeaderCell : EXCEL_STYLES.headerCell
      }))
    ];

    for (const h of houses) {
      const rowCells: unknown[] = [
        { v: h.name, t: 's', s: EXCEL_STYLES.clientCell },
        { v: h.assisted_person, t: 's', s: EXCEL_STYLES.textCell },
        { v: `${h.address} - ${h.neighborhood}`, t: 's', s: EXCEL_STYLES.textCell },
        { v: '07:00 às 19:00', t: 's', s: EXCEL_STYLES.textCell }
      ];

      for (const td of targetDays) {
        const dayRowsForHouse = buildEnrichedRowsForDate(td.date).filter(
          (r) => r.house_id === h.id
        );
        const r = dayRowsForHouse[0];
        const state: VisualState = r ? r.visual_state : 'green';
        const cellText =
          state === 'green'
            ? 'N/A'
            : state === 'yellow'
              ? ''
              : r?.professional_name || '';

        rowCells.push({
          v: cellText,
          t: 's',
          s: getStyleForShiftState(state)
        });

        if (isSingle) {
          const checkText =
            state !== 'normal'
              ? 'Não precisa'
              : r?.check_status === 'done'
                ? 'Feita ✓'
                : 'Pendente';
          const checkStyle =
            checkText === 'Feita ✓'
              ? EXCEL_STYLES.checkDone
              : checkText === 'Pendente'
                ? EXCEL_STYLES.checkPending
                : EXCEL_STYLES.textCell;
          rowCells.push({ v: checkText, t: 's', s: checkStyle });
        }
      }

      styledMatrix.push(rowCells);
    }

    const ws = XLSXStyle.utils.aoa_to_sheet(styledMatrix);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerColumns.length - 1 } }];
    ws['!cols'] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 42 },
      { wch: 16 },
      ...targetDays.map(() => ({ wch: 22 })),
      ...(isSingle ? [{ wch: 20 }] : [])
    ];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Exemplo Escalas');

    const fileName = isSingle
      ? `exemplo-escala-dia-${targetDays[0].date}`
      : `exemplo-escala-3-dias-${satDate}`;

    if (format === 'xlsx') {
      XLSXStyle.writeFile(wb, `${fileName}.xlsx`);
    } else {
      XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    }
    setSheetModalOpen(false);
    notify('[Exemplo] Planilha colorida de exemplo exportada!');
  };

  // Ler arquivo ou texto colado para importar no Simulador de Exemplos
  const handleFileUploadExample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    setPreviewRows(parseMatrixToSpreadsheetRows(matrix));
  };

  const handleConfirmImportIntoExample = () => {
    if (previewRows.length === 0) return;

    const nextHouses = [...houses];
    const nextProfs = [...professionals];
    const nextShifts = [...shifts];
    const colors = ['indigo', 'blue', 'purple', 'emerald', 'sky', 'amber', 'rose'];

    const ensureHouse = (name: string, assisted: string, addr: string): number => {
      const found = nextHouses.find((h) => h.name.toLowerCase() === name.toLowerCase());
      if (found) return found.id;
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      nextHouses.push({
        id: newId,
        name,
        assisted_person: assisted || 'Assistido',
        neighborhood: 'Geral',
        address: addr || 'Endereço exemplo',
        notes: 'Importado no simulador',
        active: 1,
        created_at: ''
      });
      return newId;
    };

    const ensureProf = (name: string): number => {
      const clean = name.replace(/\((?:24h|48h)\)/gi, '').trim();
      const found = nextProfs.find((p) => p.name.toLowerCase() === clean.toLowerCase());
      if (found) return found.id;
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      nextProfs.push({
        id: newId,
        name: clean,
        role: 'Cuidador(a)',
        phone: '',
        avatar_color: colors[nextProfs.length % colors.length],
        active: 1,
        created_at: ''
      });
      return newId;
    };

    for (const r of previewRows) {
      const houseId = ensureHouse(r.clientName, r.assistedPerson, r.fullAddress);
      const is24h = /(\d{1,2}:\d{2})\s*(?:às|as|-)\s*\1/i.test(r.horario);

      const dayMappings =
        importScope === 'single_day'
          ? [{ date: importSingleDate, val: r.singleDayProf ?? r.saturdayProf }]
          : [
            { date: satDate, val: r.saturdayProf },
            { date: sunDate, val: r.sundayProf },
            { date: monDate, val: r.mondayProf || '' }
          ];

      for (const dm of dayMappings) {
        const raw = (dm.val || '').trim();
        const upper = raw.toUpperCase();
        // Remove anterior daquela casa/data no simulador
        const existingIdx = nextShifts.findIndex(
          (s) => s.house_id === houseId && s.date === dm.date
        );
        if (existingIdx >= 0) nextShifts.splice(existingIdx, 1);

        if (upper === 'N/A' || upper === 'NA' || upper === '-') {
          nextShifts.push({
            id: Date.now() + Math.random(),
            house_id: houseId,
            professional_id: null,
            date: dm.date,
            shift_period: 'sem_escala',
            start_time: '--:--',
            end_time: '--:--',
            shift_type: 'no_schedule',
            check_status: 'pending',
            notes: ''
          });
        } else if (!raw) {
          nextShifts.push({
            id: Date.now() + Math.random(),
            house_id: houseId,
            professional_id: null,
            date: dm.date,
            shift_period: 'diurno',
            start_time: '07:00',
            end_time: '19:00',
            shift_type: 'unassigned',
            check_status: 'pending',
            notes: ''
          });
        } else {
          const profId = ensureProf(raw);
          nextShifts.push({
            id: Date.now() + Math.random(),
            house_id: houseId,
            professional_id: profId,
            date: dm.date,
            shift_period: is24h ? '24h' : 'diurno',
            start_time: '07:00',
            end_time: is24h ? '07:00' : '19:00',
            shift_type: is24h ? 'stay_in_24h_48h' : 'normal',
            check_status: 'pending',
            notes: ''
          });
        }
      }
    }

    setHouses(nextHouses);
    setProfessionals(nextProfs);
    setShifts(nextShifts);
    setPreviewRows([]);
    setPasteText('');
    setSheetModalOpen(false);
    notify('[Exemplo] Planilha importada com sucesso para o simulador de exemplos!');
  };

  return (
    <div className="space-y-6">
      {feedbackToast && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-5 right-4 z-50 bg-indigo-950 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold border border-indigo-700"
        >
          {feedbackToast}
        </div>
      )}

      {/* Guia Rápido / Tutorial Passo a Passo */}
      <section
        aria-label="Tutorial de como usar o sistema"
        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5B4FE9] mb-1.5">
          <BookOpen className="w-4 h-4" />
          <span>Tutorial Passo a Passo — Como funciona o Plantão em Dia</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-4">
          Veja abaixo os 3 passos para organizar a operação da sua empresa e use o{' '}
          <strong>Simulador Interativo</strong> logo em seguida para treinar sem alterar os dados
          reais.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-[#5B4FE9] flex items-center justify-center mb-2.5">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              1. Cadastre ou Importe sua Planilha
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Use os botões <code>+ Casa</code>, <code>+ Profissional</code> e{' '}
              <code>Nova escala</code> para cadastrar manualmente, ou clique em{' '}
              <strong>Planilha (.xlsx)</strong> para importar uma planilha inteira de uma vez (por{' '}
              <strong>1 dia</strong> ou pela <strong>semana</strong>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-2.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              2. Entenda as 4 Cores da Escala
            </h3>
            <ul className="text-[11px] text-slate-600 space-y-1">
              <li>
                <strong className="text-sky-700">Azul:</strong> Plantão 24h/48h (permanece na casa e
                não precisa checar).
              </li>
              <li>
                <strong className="text-emerald-700">Verde (N/A):</strong> Sem escala para aquela
                casa no dia.
              </li>
              <li>
                <strong className="text-amber-700">Amarelo:</strong> Falta definir o profissional do
                turno.
              </li>
              <li>
                <strong className="text-slate-800">Normal:</strong> Profissional escalado (permite
                marcar checagem).
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              3. Marque Checagens e Exporte Colorido
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Conforme confirmar a presença de cada profissional, clique em{' '}
              <strong>Marcar feita</strong>. Quando quiser compartilhar ou arquivar, exporte a
              planilha Excel (<code>.xlsx</code>) já com as datas e as cores de cada estado.
            </p>
          </div>
        </div>
      </section>

      {/* Banner do Simulador + Botões Completos iguais à Escala Real */}
      <section className="bg-white rounded-2xl border-2 border-indigo-200/80 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-[#4F46E5] text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Simulador & Tutorial Interativo (3 Dias em Memória)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Ambiente de Treinamento — Teste todas as funções sem afetar o banco real
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aqui você tem as <strong>mesmas ferramentas da escala real</strong>: pode cadastrar
              casas, profissionais, criar/editar plantões, marcar checagens e importar/exportar
              planilhas coloridas.
            </p>
          </div>

          {/* Mesmos botões de ação da escala real! */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSheetTab('export');
                setSheetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Planilha (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingHouse(null);
                setHouseModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Casa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingProf(null);
                setProfModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Profissional</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingShift(null);
                setDefaultModalHouseId(null);
                setShiftModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova escala</span>
            </button>
          </div>
        </div>

        {/* Cartões de Resumo do Simulador */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-4">
          <div className="rounded-xl border border-slate-200/80 p-3 sm:p-4 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] text-[#5B4FE9] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Plantões nos 3 dias</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{totalExampleShifts}</p>
              <p className="text-[10px] text-slate-400">em {houses.length} casas de exemplo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOnlyPending((prev) => !prev)}
            className={`rounded-xl border p-3 sm:p-4 text-left flex items-center gap-3 transition-all cursor-pointer ${onlyPending
                ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-200'
                : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300'
              }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Pendentes no dia</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{dayPendingChecks}</p>
              <p className="text-[10px] text-slate-400">de {dayCheckable.length} checagens</p>
            </div>
          </button>

          <div className="rounded-xl border border-slate-200/80 p-3 sm:p-4 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Em plantão 24h / 48h</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900">{total24h48h}</p>
              <p className="text-[10px] text-slate-400">{day24h48h} neste dia</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabela Completa de Escala de Exemplo (3 Dias) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Topo com Busca, Filtros, Restaurar e Limpar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-slate-50/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-xs font-semibold hover:bg-indigo-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar exemplos originais</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-600 text-xs font-semibold hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar exemplos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetTab('import');
                setSheetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Importar / Exportar Planilha do Exemplo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar casa ou profissional..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
              <select
                value={visualStateFilter}
                onChange={(e) => setVisualStateFilter(e.target.value)}
                className="pl-7 pr-6 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 cursor-pointer"
              >
                <option value="all">Todos os estados</option>
                <option value="pending_check">Checagem pendente</option>
                <option value="done_check">Checagem concluída</option>
                <option value="normal">Normal</option>
                <option value="blue">Azul (Plantão 24h / 48h)</option>
                <option value="green">Verde (Sem escala)</option>
                <option value="yellow">Amarelo (Sem profissional)</option>
              </select>
            </div>

            <div className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${mobileViewMode === 'cards' ? 'bg-white text-[#5B4FE9]' : 'text-slate-600'
                  }`}
              >
                <LayoutList className="w-3.5 h-3.5 inline mr-1" />
                Cartões
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${mobileViewMode === 'table' ? 'bg-white text-[#5B4FE9]' : 'text-slate-600'
                  }`}
              >
                <TableIcon className="w-3.5 h-3.5 inline mr-1" />
                Tabela
              </button>
            </div>
          </div>
        </div>

        {/* Abas dos 3 Dias de Exemplo (Com Sábado e Domingo em destaque) */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {threeDays.map((d) => {
              const active = selectedDate === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer ${active
                      ? 'bg-[#5B4FE9] text-white font-bold shadow-xs ring-2 ring-indigo-200'
                      : d.isWeekend
                        ? 'bg-indigo-50/90 text-[#4338CA] border border-indigo-200 font-bold hover:bg-indigo-100'
                        : 'bg-slate-100 text-slate-700 font-medium hover:bg-slate-200/70'
                    }`}
                >
                  {d.isWeekend && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-amber-300' : 'bg-[#5B4FE9]'
                        }`}
                    />
                  )}
                  <span>{d.label}</span>
                  <span className={active ? 'text-indigo-100 font-normal' : 'text-slate-400 font-normal'}>
                    {d.short}
                  </span>
                  {d.isWeekend && !active && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-100 text-[#4F46E5]">
                      FDS
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500">
            Exibindo exemplo de <strong>{formatIsoToBr(selectedDate)}</strong>
          </span>
        </div>

        {/* Legenda */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-300 border border-sky-400" />
            <span>Plantão 24h / 48h - permanece na casa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300 border border-emerald-400" />
            <span>Sem escala para esta casa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-300 border border-amber-400" />
            <span>Sem profissional definido</span>
          </div>
        </div>

        {/* Visão em Cartões Mobile */}
        <div className={mobileViewMode === 'cards' ? 'block md:hidden p-3 space-y-3 bg-slate-50/50' : 'hidden'}>
          {filteredRows.map((row) => {
            let cardBorder = 'border-slate-200 bg-white';
            if (row.visual_state === 'blue')
              cardBorder = 'border-sky-300 border-l-4 border-l-sky-500 bg-sky-50/40';
            else if (row.visual_state === 'green')
              cardBorder = 'border-emerald-300 border-l-4 border-l-emerald-500 bg-emerald-50/40';
            else if (row.visual_state === 'yellow')
              cardBorder = 'border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/50';

            return (
              <article key={`ex-card-${row.house_id}-${row.id}`} className={`rounded-2xl border p-4 ${cardBorder}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{row.house_name}</h3>
                    <p className="text-xs text-slate-600">Assistido: {row.assisted_person}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {row.shift_id !== null ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingShift(row);
                            setDefaultModalHouseId(row.house_id);
                            setShiftModalOpen(true);
                          }}
                          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(row)}
                          className="p-2 rounded-xl border border-slate-200 bg-white text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShift(null);
                          setDefaultModalHouseId(row.house_id);
                          setShiftModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold"
                      >
                        + Escalar
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 text-xs text-slate-600 space-y-1">
                  <div>
                    {row.neighborhood} · {row.address}
                  </div>
                  <div>
                    {row.visual_state === 'green'
                      ? 'Sem expediente'
                      : `${row.start_time} às ${row.end_time}`}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    {row.professional_name || 'Sem profissional'}
                  </span>
                  {row.visual_state === 'normal' && (
                    <button
                      type="button"
                      onClick={() => handleToggleCheck(row)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${row.check_status === 'done'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#5B4FE9] text-white'
                        }`}
                    >
                      {row.check_status === 'done' ? 'Feita ✓' : 'Marcar feita'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Tabela Completa de Exemplos com Editar, Excluir e Escalar */}
        <div className={mobileViewMode === 'table' ? 'block' : 'hidden md:block'}>
          <div className="table-scroll-container overflow-x-auto">
            <table className="w-full min-w-[780px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-white">
                  <th className="py-3 pl-5 pr-3 w-[25%]">Casa / Assistido</th>
                  <th className="py-3 px-3 w-[26%]">Endereço</th>
                  <th className="py-3 px-3 w-[16%]">Horário</th>
                  <th className="py-3 px-3 w-[18%]">Profissional</th>
                  <th className="py-3 px-3 w-[10%] text-right">Checagem</th>
                  <th className="py-3 pl-2 pr-5 w-[5%] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRows.map((row) => {
                  let rowStyle = 'bg-white hover:bg-slate-50/70';
                  if (row.visual_state === 'blue') {
                    rowStyle = 'bg-sky-50/45 hover:bg-sky-50/80 border-l-4 border-l-sky-400';
                  } else if (row.visual_state === 'green') {
                    rowStyle =
                      'bg-emerald-50/45 hover:bg-emerald-50/80 border-l-4 border-l-emerald-400';
                  } else if (row.visual_state === 'yellow') {
                    rowStyle =
                      'bg-amber-50/55 hover:bg-amber-50/90 border-l-4 border-l-amber-400';
                  }

                  const avatarInitial = row.professional_name
                    ? row.professional_name.charAt(0).toUpperCase()
                    : '?';
                  const avatarColorClass =
                    AVATAR_COLOR_MAP[row.professional_avatar_color || 'indigo'] ||
                    AVATAR_COLOR_MAP.indigo;

                  return (
                    <tr key={`ex-row-${row.house_id}-${row.id}`} className={rowStyle}>
                      <td className="py-3.5 pl-5 pr-3 align-middle">
                        <div className="font-semibold text-slate-900 text-[13px]">
                          {row.house_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Assistido: {row.assisted_person}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[260px]">
                            <strong className="font-medium text-slate-700">
                              {row.neighborhood}
                            </strong>{' '}
                            · {row.address}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 align-middle text-slate-600">
                        {row.visual_state === 'green' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Sem expediente</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {row.start_time} às {row.end_time}
                            </span>
                            {(row.shift_period === '24h' || row.shift_period === '48h') && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                                {row.shift_period}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle">
                        {row.visual_state === 'blue' ? (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-100/90 text-sky-900 border border-sky-200/80">
                            <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 text-[11px] font-bold flex items-center justify-center">
                              {row.professional_name ? avatarInitial : 'P'}
                            </span>
                            <span className="font-semibold text-[11px]">
                              {row.professional_name
                                ? `${row.professional_name} · Plantão ${row.shift_period}`
                                : 'Plantão 24h / 48h'}
                            </span>
                          </div>
                        ) : row.visual_state === 'green' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Sem escala neste dia</span>
                          </span>
                        ) : row.visual_state === 'yellow' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingShift(row);
                              setDefaultModalHouseId(row.house_id);
                              setShiftModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold hover:bg-amber-200/80 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            <span>Falta definir profissional</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EEF0FF] text-[#4338CA] border border-indigo-200/60">
                            <span
                              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${avatarColorClass}`}
                            >
                              {avatarInitial}
                            </span>
                            <span className="font-semibold text-[12px]">
                              {row.professional_name}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 align-middle text-right">
                        {row.visual_state !== 'normal' ? (
                          <span className="text-xs font-medium text-slate-400">Não precisa</span>
                        ) : row.check_status === 'done' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs hover:bg-emerald-100 cursor-pointer"
                          >
                            <span className="w-4 h-4 rounded-xs bg-emerald-500 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                            <span>Feita</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(row)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-xs hover:border-indigo-300 hover:text-indigo-700 cursor-pointer shadow-2xs"
                          >
                            <span className="w-3.5 h-3.5 rounded-xs border border-slate-300 bg-white inline-block" />
                            <span>Marcar feita</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 pl-2 pr-5 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {row.shift_id === null ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingShift(null);
                                setDefaultModalHouseId(row.house_id);
                                setShiftModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Escalar</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShift(row);
                                  setDefaultModalHouseId(row.house_id);
                                  setShiftModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                                title="Editar plantão de exemplo"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteShift(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Excluir plantão de exemplo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modais de Edição do Simulador (Plantão, Casa, Profissional e Confirmação) */}
      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        editingShift={editingShift}
        defaultDate={selectedDate}
        defaultHouseId={defaultModalHouseId}
        houses={houses}
        professionals={professionals}
        onSave={handleSaveShift}
      />

      <HouseModal
        isOpen={houseModalOpen}
        onClose={() => setHouseModalOpen(false)}
        editingHouse={editingHouse}
        onSave={handleSaveHouse}
      />

      <ProfessionalModal
        isOpen={profModalOpen}
        onClose={() => setProfModalOpen(false)}
        editingProfessional={editingProf}
        onSave={handleSaveProfessional}
      />

      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirm.onConfirm}
      />

      {/* Modal de Importar e Exportar Planilha Colorida do Simulador de Exemplos */}
      {sheetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Planilha do Simulador de Exemplos (.xlsx / .csv)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Importe ou exporte os dados de exemplo com cores e datas sem afetar a escala real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheetModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6 pt-3 border-b border-slate-100 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSheetTab('export')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${sheetTab === 'export'
                    ? 'border-[#5B4FE9] text-[#5B4FE9]'
                    : 'border-transparent text-slate-500'
                  }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Planilha de Exemplo</span>
              </button>

              <button
                type="button"
                onClick={() => setSheetTab('import')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${sheetTab === 'import'
                    ? 'border-[#5B4FE9] text-[#5B4FE9]'
                    : 'border-transparent text-slate-500'
                  }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Planilha no Exemplo</span>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {sheetTab === 'export' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExportScope('single_day')}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer ${exportScope === 'single_day'
                          ? 'border-[#5B4FE9] bg-indigo-50/60 ring-1 ring-[#5B4FE9]'
                          : 'border-slate-200'
                        }`}
                    >
                      <div className="text-xs font-bold text-slate-900">
                        Exportar Somente 1 Dia do Exemplo
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Escolha Sábado, Domingo ou Segunda
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportScope('three_days')}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer ${exportScope === 'three_days'
                          ? 'border-[#5B4FE9] bg-indigo-50/60 ring-1 ring-[#5B4FE9]'
                          : 'border-slate-200'
                        }`}
                    >
                      <div className="text-xs font-bold text-slate-900">
                        Exportar os 3 Dias (Sáb, Dom e Seg)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatIsoToBr(satDate)} a {formatIsoToBr(monDate)}
                      </div>
                    </button>
                  </div>

                  {exportScope === 'single_day' && (
                    <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70 flex items-center gap-3 text-xs">
                      <span className="font-semibold text-slate-700">Dia do exemplo:</span>
                      <select
                        value={exportSingleDate}
                        onChange={(e) => setExportSingleDate(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                      >
                        {threeDays.map((td) => (
                          <option key={td.date} value={td.date}>
                            {td.label} ({formatIsoToBr(td.date)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Palette className="w-4 h-4 text-[#5B4FE9]" />
                      <span>Cores incluídas automaticamente no Excel (.xlsx):</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#CFE2F3] text-[#0C4A6E] font-semibold">
                        Azul: 24h / 48h
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#C6EFCE] text-[#14532D] font-semibold">
                        Verde: N/A
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#FFFF00] text-[#713F12] font-semibold">
                        Amarelo: Vago
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 font-semibold border border-slate-200">
                        Branco: Normal
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportExampleSpreadsheet('xlsx')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Baixar Excel Colorido (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportExampleSpreadsheet('csv')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar .CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700">Destino no simulador:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImportScope('single_day')}
                        className={`px-3 py-1 rounded-lg font-semibold ${importScope === 'single_day'
                            ? 'bg-[#5B4FE9] text-white'
                            : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                      >
                        Somente 1 Dia
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportScope('three_days')}
                        className={`px-3 py-1 rounded-lg font-semibold ${importScope === 'three_days'
                            ? 'bg-[#5B4FE9] text-white'
                            : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                      >
                        Os 3 Dias (Sáb, Dom e Seg)
                      </button>
                    </div>
                  </div>

                  {importScope === 'single_day' && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">Importar para o dia:</span>
                      <select
                        value={importSingleDate}
                        onChange={(e) => setImportSingleDate(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                      >
                        {threeDays.map((td) => (
                          <option key={td.date} value={td.date}>
                            {td.label} ({formatIsoToBr(td.date)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center">
                      <Upload className="w-6 h-6 text-[#5B4FE9] mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800 mb-2">
                        Escolher arquivo .xlsx ou .csv
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUploadExample}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                      >
                        Selecionar Planilha
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                        <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Ou colar células do Excel</span>
                      </div>
                      <textarea
                        rows={2}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="Cole aqui (Ctrl+V)..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const lines = pasteText
                            .split(/\r?\n/)
                            .map((l) => l.split('\t'))
                            .filter((r) => r.some((c) => c.trim() !== ''));
                          setPreviewRows(parseMatrixToSpreadsheetRows(lines));
                        }}
                        className="mt-1.5 px-3 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Ler texto colado
                      </button>
                    </div>
                  </div>

                  {previewRows.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        {previewRows.length} linhas prontas para importar no simulador
                      </span>
                      <button
                        type="button"
                        onClick={handleConfirmImportIntoExample}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                      >
                        Confirmar Importação no Exemplo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
