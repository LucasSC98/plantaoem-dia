export type ShiftPeriod = 'diurno' | 'noturno' | '24h' | '48h' | 'sem_escala';

export type ShiftType = 'normal' | 'stay_in_24h_48h' | 'no_schedule' | 'unassigned';

export type VisualState = 'normal' | 'blue' | 'green' | 'yellow';

export type CheckStatus = 'pending' | 'done';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  document: string;
  plan: string;
  created_at: string;
  houses_count?: number;
  professionals_count?: number;
  admin_email?: string;
}

export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  organization: Organization;
  user: User;
}

export interface House {
  id: number;
  organization_id?: number;
  name: string;
  assisted_person: string;
  neighborhood: string;
  address: string;
  notes: string;
  active: number;
  created_at: string;
}

export interface Professional {
  id: number;
  organization_id?: number;
  name: string;
  role: string;
  phone: string;
  avatar_color: string;
  active: number;
  created_at: string;
}

export interface EnrichedShiftRow {
  id: number;
  shift_id: number | null;
  organization_id?: number;
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
  visual_state: VisualState;
  requires_check: boolean;
  check_id: number | null;
  check_status: CheckStatus | 'not_applicable';
  checked_at: string | null;
  checked_by: string | null;
  notes: string;
}

export interface SummaryData {
  organization?: Organization | null;
  week: {
    startDate: string;
    endDate: string;
    totalShifts: number;
    housesServed: number;
    totalHouses: number;
    totalProfessionals: number;
    stayIn24h48hCount: number;
    totalChecks: number;
    pendingChecks: number;
    doneChecks: number;
    unassignedCount: number;
  };
  day: {
    date: string;
    totalRows: number;
    activeShifts: number;
    totalChecks: number;
    pendingChecks: number;
    doneChecks: number;
    stayIn24h48hCount: number;
    unassignedCount: number;
    noScheduleCount: number;
  };
}

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface WeekDayItem {
  key: DayKey;
  label: string;
  shortLabel: string;
  date: string;
  dayMonth: string;
  isWeekend: boolean;
}

export interface WeekDefinition {
  id: string;
  label: string;
  weekendLabel: string;
  startDate: string;
  endDate: string;
  saturdayDate: string;
  sundayDate: string;
  mondayDate: string;
  saturdayShort: string;
  sundayShort: string;
  mondayShort: string;
  days: WeekDayItem[];
}

export interface SpreadsheetImportRow {
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
  saturdayProf: string;
  sundayProf: string;
}
