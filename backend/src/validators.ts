import { ShiftPeriod, ShiftType } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_SHIFT_PERIODS: ShiftPeriod[] = ['diurno', 'noturno', '24h', '48h', 'sem_escala'];
const VALID_SHIFT_TYPES: ShiftType[] = ['normal', 'stay_in_24h_48h', 'no_schedule', 'unassigned'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$|^--:--$/;

export function validateHouseInput(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const assisted_person = typeof body.assisted_person === 'string' ? body.assisted_person.trim() : '';
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (!name || name.length < 2) {
    errors.push('O nome da casa/cliente é obrigatório (mínimo de 2 caracteres).');
  }
  if (!assisted_person || assisted_person.length < 2) {
    errors.push('O nome da pessoa assistida é obrigatório (mínimo de 2 caracteres).');
  }
  if (!neighborhood || neighborhood.length < 2) {
    errors.push('O bairro é obrigatório.');
  }
  if (!address || address.length < 3) {
    errors.push('O endereço/complemento é obrigatório (mínimo de 3 caracteres).');
  }

  return { valid: errors.length === 0, errors };
}

export function validateProfessionalInput(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';

  if (!name || name.length < 2) {
    errors.push('O nome do profissional é obrigatório (mínimo de 2 caracteres).');
  }
  if (!role || role.length < 2) {
    errors.push('A função/cargo do profissional é obrigatória.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateShiftInput(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const house_id = Number(body.house_id);
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const shift_period = (typeof body.shift_period === 'string' ? body.shift_period : 'diurno') as ShiftPeriod;
  const shift_type = (typeof body.shift_type === 'string' ? body.shift_type : 'normal') as ShiftType;
  const start_time = typeof body.start_time === 'string' ? body.start_time.trim() : '07:00';
  const end_time = typeof body.end_time === 'string' ? body.end_time.trim() : '19:00';

  if (!Number.isInteger(house_id) || house_id <= 0) {
    errors.push('Selecione uma casa/cliente válida para o plantão.');
  }
  if (!date || !DATE_REGEX.test(date)) {
    errors.push('A data do plantão deve estar no formato AAAA-MM-DD.');
  }
  if (!VALID_SHIFT_PERIODS.includes(shift_period)) {
    errors.push('Período de turno inválido. Valores aceitos: diurno, noturno, 24h, 48h, sem_escala.');
  }
  if (!VALID_SHIFT_TYPES.includes(shift_type)) {
    errors.push('Tipo de estado do plantão inválido.');
  }
  if (shift_type !== 'no_schedule') {
    if (!TIME_REGEX.test(start_time)) {
      errors.push('Horário inicial inválido (use o formato HH:MM, ex: 07:00).');
    }
    if (!TIME_REGEX.test(end_time)) {
      errors.push('Horário final inválido (use o formato HH:MM, ex: 19:00).');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateCheckInput(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const status = body.status;

  if (status !== 'pending' && status !== 'done') {
    errors.push('O status da checagem deve ser "pending" (pendente) ou "done" (feita).');
  }

  return { valid: errors.length === 0, errors };
}
