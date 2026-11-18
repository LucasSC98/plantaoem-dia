import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import {
  EnrichedShiftRow,
  House,
  Professional,
  ShiftPeriod,
  ShiftType
} from '../types';

// ============================================================================
// 1. MODAL DE PLANTÃO / ESCALA (CRIAR E EDITAR) — BOTTOM SHEET NO MOBILE
// ============================================================================
interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingShift: EnrichedShiftRow | null;
  defaultDate: string;
  defaultHouseId: number | null;
  houses: House[];
  professionals: Professional[];
  onSave: (data: {
    id?: number | null;
    house_id: number;
    professional_id: number | null;
    date: string;
    shift_period: ShiftPeriod;
    start_time: string;
    end_time: string;
    shift_type: ShiftType;
    notes: string;
  }) => Promise<void>;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  editingShift,
  defaultDate,
  defaultHouseId,
  houses,
  professionals,
  onSave
}) => {
  const [houseId, setHouseId] = useState<number>(0);
  const [date, setDate] = useState<string>(defaultDate);
  const [shiftType, setShiftType] = useState<ShiftType>('normal');
  const [shiftPeriod, setShiftPeriod] = useState<ShiftPeriod>('diurno');
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('19:00');
  const [professionalId, setProfessionalId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingShift && editingShift.shift_id !== null) {
      setHouseId(editingShift.house_id);
      setDate(editingShift.date);
      setShiftType(editingShift.shift_type);
      setShiftPeriod(editingShift.shift_period);
      setStartTime(editingShift.start_time === '--:--' ? '07:00' : editingShift.start_time);
      setEndTime(editingShift.end_time === '--:--' ? '19:00' : editingShift.end_time);
      setProfessionalId(
        editingShift.professional_id !== null ? String(editingShift.professional_id) : ''
      );
      setNotes(editingShift.notes || '');
    } else {
      const initialHouse = defaultHouseId || (houses[0]?.id ?? 0);
      setHouseId(initialHouse);
      setDate(defaultDate);
      setShiftType('normal');
      setShiftPeriod('diurno');
      setStartTime('07:00');
      setEndTime('19:00');
      setProfessionalId(professionals[0] ? String(professionals[0].id) : '');
      setNotes('');
    }
  }, [isOpen, editingShift, defaultDate, defaultHouseId, houses, professionals]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleShiftTypeChange = (nextType: ShiftType) => {
    setShiftType(nextType);
    if (nextType === 'stay_in_24h_48h') {
      if (shiftPeriod !== '24h' && shiftPeriod !== '48h') {
        setShiftPeriod('24h');
      }
      setStartTime('07:00');
      setEndTime('07:00');
    } else if (nextType === 'no_schedule') {
      setShiftPeriod('sem_escala');
      setProfessionalId('');
    } else if (nextType === 'unassigned') {
      if (shiftPeriod === 'sem_escala' || shiftPeriod === '24h' || shiftPeriod === '48h') {
        setShiftPeriod('diurno');
      }
      setProfessionalId('');
    } else if (nextType === 'normal') {
      if (shiftPeriod === 'sem_escala' || shiftPeriod === '24h' || shiftPeriod === '48h') {
        setShiftPeriod('diurno');
        setStartTime('07:00');
        setEndTime('19:00');
      }
      if (!professionalId && professionals[0]) {
        setProfessionalId(String(professionals[0].id));
      }
    }
  };

  const handlePeriodChange = (period: ShiftPeriod) => {
    setShiftPeriod(period);
    if (period === 'diurno') {
      setStartTime('07:00');
      setEndTime('19:00');
    } else if (period === 'noturno') {
      setStartTime('19:00');
      setEndTime('07:00');
    } else if (period === '24h' || period === '48h') {
      setShiftType('stay_in_24h_48h');
      setStartTime('07:00');
      setEndTime('07:00');
    } else if (period === 'sem_escala') {
      setShiftType('no_schedule');
      setProfessionalId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!houseId) {
      setError('Selecione uma casa/cliente.');
      return;
    }
    if (!date) {
      setError('Informe a data do plantão.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedProfId =
        shiftType === 'no_schedule' || shiftType === 'unassigned' || professionalId === ''
          ? null
          : Number(professionalId);

      await onSave({
        id: editingShift?.shift_id ?? null,
        house_id: houseId,
        professional_id: parsedProfId,
        date,
        shift_period: shiftType === 'no_schedule' ? 'sem_escala' : shiftPeriod,
        start_time: shiftType === 'no_schedule' ? '--:--' : startTime,
        end_time: shiftType === 'no_schedule' ? '--:--' : endTime,
        shift_type: shiftType,
        notes
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar plantão.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-modal-title"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        {/* Alça visual mobile */}
        <div className="sm:hidden pt-2.5 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 id="shift-modal-title" className="text-base font-bold text-slate-900">
            {editingShift?.shift_id ? 'Editar escala de plantão' : 'Nova escala de plantão'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          {/* Casa e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="shift-house" className="block text-xs font-semibold text-slate-700 mb-1">
                Casa / Cliente *
              </label>
              <select
                id="shift-house"
                value={houseId}
                onChange={(e) => setHouseId(Number(e.target.value))}
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0} disabled>
                  Selecione uma casa...
                </option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.assisted_person})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="shift-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Data do plantão *
              </label>
              <input
                id="shift-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Estado Visual do Plantão */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Situação / Estado do Plantão *
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleShiftTypeChange('normal')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  shiftType === 'normal'
                    ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">Normal</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Com checagem ativa
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleShiftTypeChange('stay_in_24h_48h')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  shiftType === 'stay_in_24h_48h'
                    ? 'border-sky-500 bg-sky-50/80 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-sky-900">Azul · 24h / 48h</div>
                <div className="text-[11px] text-sky-700 leading-tight mt-0.5">
                  Permanece na casa
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleShiftTypeChange('unassigned')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  shiftType === 'unassigned'
                    ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-amber-900">Amarelo</div>
                <div className="text-[11px] text-amber-700 leading-tight mt-0.5">
                  Sem profissional
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleShiftTypeChange('no_schedule')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  shiftType === 'no_schedule'
                    ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-emerald-900">Verde</div>
                <div className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                  Sem escala no dia
                </div>
              </button>
            </div>
          </div>

          {/* Período e Horários (ocultos se for Sem Escala) */}
          {shiftType !== 'no_schedule' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="shift-period"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Turno
                  </label>
                  <select
                    id="shift-period"
                    value={shiftPeriod}
                    onChange={(e) => handlePeriodChange(e.target.value as ShiftPeriod)}
                    className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="diurno">Diurno (12h)</option>
                    <option value="noturno">Noturno (12h)</option>
                    <option value="24h">Plantão 24h</option>
                    <option value="48h">Plantão 48h</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:contents gap-3">
                  <div>
                    <label
                      htmlFor="shift-start"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Início *
                    </label>
                    <input
                      id="shift-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="shift-end"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Término *
                    </label>
                    <input
                      id="shift-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seleção de Profissional */}
              {shiftType !== 'unassigned' && (
                <div>
                  <label
                    htmlFor="shift-prof"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Profissional Escalado
                  </label>
                  <select
                    id="shift-prof"
                    value={professionalId}
                    onChange={(e) => {
                      setProfessionalId(e.target.value);
                      if (e.target.value === '' && shiftType === 'normal') {
                        setShiftType('unassigned');
                      }
                    }}
                    className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Sem profissional (ficará Amarelo) --</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Observações */}
          <div>
            <label htmlFor="shift-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações do plantão
            </label>
            <textarea
              id="shift-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre troca de turno, avisos ou cobertura..."
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Salvar escala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. MODAL DE CASA / CLIENTE (CRIAR E EDITAR) — BOTTOM SHEET NO MOBILE
// ============================================================================
interface HouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingHouse: House | null;
  onSave: (data: {
    id?: number;
    name: string;
    assisted_person: string;
    neighborhood: string;
    address: string;
    notes: string;
  }) => Promise<void>;
}

export const HouseModal: React.FC<HouseModalProps> = ({
  isOpen,
  onClose,
  editingHouse,
  onSave
}) => {
  const [name, setName] = useState('');
  const [assistedPerson, setAssistedPerson] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingHouse) {
      setName(editingHouse.name);
      setAssistedPerson(editingHouse.assisted_person);
      setNeighborhood(editingHouse.neighborhood);
      setAddress(editingHouse.address);
      setNotes(editingHouse.notes || '');
    } else {
      setName('');
      setAssistedPerson('');
      setNeighborhood('');
      setAddress('');
      setNotes('');
    }
  }, [isOpen, editingHouse]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        id: editingHouse?.id,
        name,
        assisted_person: assistedPerson,
        neighborhood,
        address,
        notes
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar casa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="house-modal-title"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="sm:hidden pt-2.5 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 id="house-modal-title" className="text-base font-bold text-slate-900">
            {editingHouse ? 'Editar casa / cliente' : 'Cadastrar nova casa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="house-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nome da Casa / Identificação *
            </label>
            <input
              id="house-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Casa Girassol, Dona Lúcia..."
              required
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="house-assisted"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Pessoa Assistida *
            </label>
            <input
              id="house-assisted"
              type="text"
              value={assistedPerson}
              onChange={(e) => setAssistedPerson(e.target.value)}
              placeholder="Ex: Sra. Helena (Exemplo)"
              required
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="house-neighborhood"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Bairro *
              </label>
              <input
                id="house-neighborhood"
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: Aldeota"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="house-address"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Endereço / Complemento *
              </label>
              <input
                id="house-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Apartamento 501"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="house-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações de atendimento
            </label>
            <textarea
              id="house-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rotina, horários ou observações relevantes (use dados fictícios)..."
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Salvar casa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MODAL DE PROFISSIONAL (CRIAR E EDITAR) — BOTTOM SHEET NO MOBILE
// ============================================================================
interface ProfessionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProfessional: Professional | null;
  onSave: (data: {
    id?: number;
    name: string;
    role: string;
    phone: string;
    avatar_color: string;
  }) => Promise<void>;
}

export const ProfessionalModal: React.FC<ProfessionalModalProps> = ({
  isOpen,
  onClose,
  editingProfessional,
  onSave
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Cuidador(a)');
  const [phone, setPhone] = useState('');
  const [avatarColor, setAvatarColor] = useState('indigo');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingProfessional) {
      setName(editingProfessional.name);
      setRole(editingProfessional.role);
      setPhone(editingProfessional.phone || '');
      setAvatarColor(editingProfessional.avatar_color || 'indigo');
    } else {
      setName('');
      setRole('Cuidador(a)');
      setPhone('');
      setAvatarColor('indigo');
    }
  }, [isOpen, editingProfessional]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        id: editingProfessional?.id,
        name,
        role,
        phone,
        avatar_color: avatarColor
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar profissional.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prof-modal-title"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="sm:hidden pt-2.5 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 id="prof-modal-title" className="text-base font-bold text-slate-900">
            {editingProfessional ? 'Editar profissional' : 'Cadastrar novo profissional'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Profissional *
            </label>
            <input
              id="prof-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mariana, Roberto..."
              required
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-role" className="block text-xs font-semibold text-slate-700 mb-1">
                Função / Cargo *
              </label>
              <input
                id="prof-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Cuidadora Sênior"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="prof-phone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Telefone (Fictício)
              </label>
              <input
                id="prof-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(85) 99100-0000"
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-color" className="block text-xs font-semibold text-slate-700 mb-1">
              Cor de identificação
            </label>
            <select
              id="prof-color"
              value={avatarColor}
              onChange={(e) => setAvatarColor(e.target.value)}
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="indigo">Roxo / Índigo</option>
              <option value="blue">Azul</option>
              <option value="purple">Lilás</option>
              <option value="emerald">Verde Esmeralda</option>
              <option value="sky">Azul Claro</option>
              <option value="amber">Âmbar</option>
              <option value="rose">Rosa</option>
            </select>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Salvar profissional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO — BOTTOM SHEET NO MOBILE
// ============================================================================
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm
}) => {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onCancel();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-desc"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
        <div className="sm:hidden pb-3 -mt-2 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id="confirm-delete-title" className="text-sm font-bold text-slate-900">
              {title}
            </h2>
            <p id="confirm-delete-desc" className="text-xs text-slate-500 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2.5 sm:py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
};
