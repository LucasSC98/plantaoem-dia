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
}

export interface User {
  id: number;
  organization_id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface House {
  id: number;
  organization_id: number;
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
  organization_id: number;
  name: string;
  role: string;
  phone: string;
  avatar_color: string;
  active: number;
  created_at: string;
}

export interface Shift {
  id: number;
  organization_id: number;
  house_id: number;
  professional_id: number | null;
  date: string;
  shift_period: ShiftPeriod;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  notes: string;
  created_at: string;
}

export interface CheckRecord {
  id: number;
  organization_id: number;
  shift_id: number;
  house_id: number;
  professional_id: number | null;
  date: string;
  shift_period: ShiftPeriod;
  status: CheckStatus;
  checked_at: string | null;
  checked_by: string;
  notes: string;
  created_at: string;
}

export interface EnrichedShiftRow {
  id: number;
  shift_id: number | null;
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
  visual_state: VisualState;
  requires_check: boolean;
  check_id: number | null;
  check_status: CheckStatus | 'not_applicable';
  checked_at: string | null;
  checked_by: string | null;
  notes: string;
}
