import { DayKey, WeekDayItem, WeekDefinition } from '../types';

const MONTHS_SHORT_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
];

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const dt = parseIsoDate(iso);
  dt.setDate(dt.getDate() + days);
  return toIsoDate(dt);
}

export function formatDayMonthShort(iso: string): string {
  const dt = parseIsoDate(iso);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT_PT[dt.getMonth()];
  return `${day} ${month}`;
}

export function formatFullDatePt(iso: string): string {
  const dt = parseIsoDate(iso);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT_PT[dt.getMonth()];
  const year = dt.getFullYear();
  return `${day} de ${month}, ${year}`;
}

/**
 * Retorna a data ISO do Sábado da semana atual (baseado na data de hoje do dispositivo).
 * Semana considerada de Segunda a Domingo.
 */
export function getCurrentWeekSaturdayIso(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const dayOfWeek = d.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb
  // Offset até a Segunda-feira da semana atual:
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMonday + 5); // +5 dias a partir de Segunda = Sábado da semana atual
  return toIsoDate(d);
}

/**
 * Retorna a aba do dia da semana correspondente à data de hoje.
 */
export function getCurrentDayKey(now: Date = new Date()): DayKey {
  const dayOfWeek = now.getDay();
  const map: Record<number, DayKey> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  return map[dayOfWeek] || 'saturday';
}

/**
 * Constrói a definição completa da semana (Segunda a Domingo) a partir do Sábado de referência.
 * Inclui os 7 dias da semana com destaque especial para Sábado e Domingo (isWeekend: true).
 */
export function buildWeekFromSaturday(saturdayIso: string): WeekDefinition {
  const startDate = addDays(saturdayIso, -5); // Segunda-feira da semana
  const sundayDate = addDays(saturdayIso, 1); // Domingo da semana

  const monDt = parseIsoDate(startDate);
  const sunDt = parseIsoDate(sundayDate);
  const satDt = parseIsoDate(saturdayIso);

  const monDay = String(monDt.getDate()).padStart(2, '0');
  const sunDay = String(sunDt.getDate()).padStart(2, '0');
  const satDay = String(satDt.getDate()).padStart(2, '0');
  const monMonth = MONTHS_SHORT_PT[monDt.getMonth()];
  const sunMonth = MONTHS_SHORT_PT[sunDt.getMonth()];
  const satMonth = MONTHS_SHORT_PT[satDt.getMonth()];
  const year = sunDt.getFullYear();

  const label =
    monMonth === sunMonth
      ? `${monDay} a ${sunDay} ${sunMonth}, ${year}`
      : `${monDay} ${monMonth} a ${sunDay} ${sunMonth}, ${year}`;

  const weekendLabel =
    satMonth === sunMonth
      ? `${satDay} e ${sunDay} ${satMonth}, ${year}`
      : `${satDay} ${satMonth} e ${sunDay} ${sunMonth}, ${year}`;

  const dayMeta: {
    key: DayKey;
    label: string;
    shortLabel: string;
    offsetFromMon: number;
    isWeekend: boolean;
  }[] = [
    { key: 'monday', label: 'Segunda', shortLabel: 'Seg', offsetFromMon: 0, isWeekend: false },
    { key: 'tuesday', label: 'Terça', shortLabel: 'Ter', offsetFromMon: 1, isWeekend: false },
    { key: 'wednesday', label: 'Quarta', shortLabel: 'Qua', offsetFromMon: 2, isWeekend: false },
    { key: 'thursday', label: 'Quinta', shortLabel: 'Qui', offsetFromMon: 3, isWeekend: false },
    { key: 'friday', label: 'Sexta', shortLabel: 'Sex', offsetFromMon: 4, isWeekend: false },
    { key: 'saturday', label: 'Sábado', shortLabel: 'Sáb', offsetFromMon: 5, isWeekend: true },
    { key: 'sunday', label: 'Domingo', shortLabel: 'Dom', offsetFromMon: 6, isWeekend: true }
  ];

  const days: WeekDayItem[] = dayMeta.map((dm) => {
    const iso = addDays(startDate, dm.offsetFromMon);
    return {
      key: dm.key,
      label: dm.label,
      shortLabel: dm.shortLabel,
      date: iso,
      dayMonth: formatDayMonthShort(iso),
      isWeekend: dm.isWeekend
    };
  });

  return {
    id: saturdayIso,
    label,
    weekendLabel,
    startDate,
    endDate: sundayDate,
    saturdayDate: saturdayIso,
    sundayDate,
    mondayDate: startDate,
    saturdayShort: formatDayMonthShort(saturdayIso),
    sundayShort: formatDayMonthShort(sundayDate),
    mondayShort: formatDayMonthShort(startDate),
    days
  };
}
