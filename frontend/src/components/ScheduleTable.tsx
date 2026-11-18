import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Check,
  AlertTriangle,
  Download,
  X,
  LayoutList,
  Table as TableIcon,
  ArrowLeftRight
} from 'lucide-react';
import { DayKey, EnrichedShiftRow, WeekDefinition } from '../types';

interface ScheduleTableProps {
  week: WeekDefinition;
  presetWeeks: WeekDefinition[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectWeekSaturday: (saturdayIso: string) => void;
  activeDayTab: DayKey;
  onChangeDayTab: (tab: DayKey) => void;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  onlyPending: boolean;
  onToggleOnlyPending: () => void;
  visualStateFilter: string;
  onChangeVisualStateFilter: (state: string) => void;
  rows: EnrichedShiftRow[];
  loading: boolean;
  togglingShiftId: number | null;
  onToggleCheck: (row: EnrichedShiftRow) => void;
  onEditShift: (row: EnrichedShiftRow) => void;
  onCreateShiftForHouse: (houseId: number, date: string) => void;
  onDeleteShift: (row: EnrichedShiftRow) => void;
  onOpenNewShiftModal: () => void;
  onOpenSpreadsheetModal: () => void;
}

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

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  week,
  presetWeeks,
  onPrevWeek,
  onNextWeek,
  onSelectWeekSaturday,
  activeDayTab,
  onChangeDayTab,
  searchQuery,
  onChangeSearch,
  onlyPending,
  onToggleOnlyPending,
  visualStateFilter,
  onChangeVisualStateFilter,
  rows,
  loading,
  togglingShiftId,
  onToggleCheck,
  onEditShift,
  onCreateShiftForHouse,
  onDeleteShift,
  onOpenNewShiftModal,
  onOpenSpreadsheetModal
}) => {
  // No mobile (< md), o usuário pode alternar entre Cartões otimizados para toque e Tabela com rolagem horizontal
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  const activeDayObj =
    week.days.find((d) => d.key === activeDayTab) ||
    week.days.find((d) => d.key === 'saturday') ||
    week.days[5];
  const selectedDate = activeDayObj.date;

  const hasActiveFilters =
    searchQuery.trim() !== '' || onlyPending || (visualStateFilter && visualStateFilter !== 'all');

  const clearAllFilters = () => {
    onChangeSearch('');
    if (onlyPending) onToggleOnlyPending();
    onChangeVisualStateFilter('all');
  };

  const quickFilterPills = [
    { id: 'all', label: 'Todos' },
    { id: 'pending_check', label: 'Pendentes' },
    { id: 'done_check', label: 'Feitas' },
    { id: 'blue', label: '24h / 48h' },
    { id: 'yellow', label: 'Sem profissional' },
    { id: 'green', label: 'Sem escala' }
  ];

  return (
    <section
      aria-labelledby="schedule-card-heading"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
    >
      {/* Cabeçalho do Card */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 sm:pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="schedule-card-heading" className="text-base font-bold text-slate-900">
              Escala da semana e checagens
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhe todos os dias da semana com destaque especial para os plantões de{' '}
              <strong className="font-semibold text-indigo-700">Sábado e Domingo</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSpreadsheetModal}
            className="sm:hidden inline-flex items-center justify-center gap-1.5 px-2.5 h-9 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-xs hover:bg-emerald-100 shrink-0"
            title="Importar ou Exportar Planilha"
            aria-label="Importar ou Exportar Planilha"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Planilha</span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Seletor de visualização exclusivo para telas móveis (Cartões vs Tabela) */}
          <div
            role="group"
            aria-label="Modo de exibição no celular"
            className="flex md:hidden items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={() => setMobileViewMode('cards')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mobileViewMode === 'cards'
                  ? 'bg-white text-[#5B4FE9] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Cartões</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('table')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mobileViewMode === 'table'
                  ? 'bg-white text-[#5B4FE9] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSpreadsheetModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
            title="Importar ou exportar planilha Excel (.xlsx) / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Importar / Exportar Planilha</span>
          </button>
        </div>
      </div>

      {/* Barra de Controles: Navegação de Semana + Busca + Filtros */}
      <div className="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 bg-slate-50/30">
        {/* Seletor de Semana (Full-width touch-friendly no mobile) */}
        <div className="flex items-center gap-1.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={onPrevWeek}
            className="inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Semana anterior"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex-1 lg:flex-initial flex items-center">
            <Calendar className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#5B4FE9] sm:text-slate-500 absolute left-3 pointer-events-none" />
            <label htmlFor="week-selector" className="sr-only">
              Selecionar semana da escala
            </label>
            <select
              id="week-selector"
              value={week.saturdayDate}
              onChange={(e) => onSelectWeekSaturday(e.target.value)}
              className="w-full pl-9 sm:pl-8 pr-7 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 bg-white text-sm sm:text-xs font-semibold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {presetWeeks.map((pw) => (
                <option key={pw.saturdayDate} value={pw.saturdayDate}>
                  {pw.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onNextWeek}
            className="inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Próxima semana"
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="schedule-search-input" className="sr-only">
              Buscar por casa, pessoa assistida ou profissional
            </label>
            <input
              id="schedule-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Buscar casa, assistido ou profissional..."
              className="w-full pl-9 sm:pl-8 pr-8 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 bg-white text-sm sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onChangeSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>

          {/* Chips rápidos deslizáveis para celular (< sm) */}
          <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {quickFilterPills.map((pill) => {
              const isSelected =
                (pill.id === 'pending_check' && onlyPending) ||
                (!onlyPending && visualStateFilter === pill.id);
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    if (pill.id === 'pending_check') {
                      if (!onlyPending) onToggleOnlyPending();
                      onChangeVisualStateFilter('all');
                    } else {
                      if (onlyPending) onToggleOnlyPending();
                      onChangeVisualStateFilter(pill.id);
                    }
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-[#5B4FE9] border-[#5B4FE9] text-white font-semibold'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Controles de filtro em telas sm+ */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleOnlyPending}
              aria-pressed={onlyPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                onlyPending
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  onlyPending ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              />
              <span>Pendentes</span>
            </button>

            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
              <label htmlFor="visual-state-filter" className="sr-only">
                Filtrar por estado da escala
              </label>
              <select
                id="visual-state-filter"
                value={visualStateFilter}
                onChange={(e) => onChangeVisualStateFilter(e.target.value)}
                className="pl-7 pr-6 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Filtrar: Todos os estados</option>
                <option value="pending_check">Checagem pendente</option>
                <option value="done_check">Checagem concluída</option>
                <option value="normal">Normal (Com profissional)</option>
                <option value="blue">Azul (Plantão 24h / 48h)</option>
                <option value="green">Verde (Sem escala no dia)</option>
                <option value="yellow">Amarelo (Sem profissional)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Abas de Todos os Dias da Semana (Segunda a Domingo, com Sábado e Domingo em destaque) */}
      <div className="px-3 sm:px-5 py-2 flex items-center justify-between border-b border-slate-100 bg-white overflow-x-auto">
        <div
          role="tablist"
          aria-label="Dias da semana"
          className="flex items-center gap-1.5 sm:gap-2 min-w-max"
        >
          {week.days.map((dayItem) => {
            const isSelected = activeDayTab === dayItem.key;
            const isWeekend = dayItem.isWeekend;

            return (
              <React.Fragment key={dayItem.key}>
                {/* Divisor sutil antes do Fim de Semana (Sábado e Domingo) */}
                {dayItem.key === 'saturday' && (
                  <div
                    className="h-6 w-px bg-indigo-200/80 mx-1 hidden sm:block"
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onChangeDayTab(dayItem.key)}
                  className={`relative px-3 sm:px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none ${
                    isSelected
                      ? isWeekend
                        ? 'bg-[#5B4FE9] text-white font-bold shadow-xs ring-2 ring-indigo-200'
                        : 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : isWeekend
                        ? 'bg-indigo-50/90 text-[#4338CA] border border-indigo-200/90 font-bold hover:bg-indigo-100/80'
                        : 'text-slate-600 hover:bg-slate-100 font-medium'
                  }`}
                >
                  {isWeekend && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-amber-300' : 'bg-[#5B4FE9]'
                      }`}
                      title="Fim de semana prioritário"
                    />
                  )}
                  <span>{dayItem.label}</span>
                  <span
                    className={`text-[11px] font-normal ${
                      isSelected
                        ? 'text-indigo-100'
                        : isWeekend
                          ? 'text-indigo-600/90'
                          : 'text-slate-400'
                    }`}
                  >
                    {dayItem.dayMonth}
                  </span>
                  {isWeekend && !isSelected && (
                    <span className="hidden lg:inline-block ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-[#4F46E5]">
                      FDS
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 pl-3 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{activeDayObj.label}, {activeDayObj.dayMonth}</span>
        </div>
      </div>

      {/* Legenda dos Estados Visuais */}
      <div
        aria-label="Legenda de cores da escala"
        className="px-4 sm:px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-sky-300 border border-sky-400 shrink-0" />
          <span>Plantão 24h / 48h - permanece na casa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300 border border-emerald-400 shrink-0" />
          <span>Sem escala para esta casa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-300 border border-amber-400 shrink-0" />
          <span>Sem profissional definido</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISÃO MOBILE EM CARTÕES (Exibida em telas < md quando mobileViewMode === 'cards') */}
      {/* ===================================================================== */}
      <div className={mobileViewMode === 'cards' ? 'block md:hidden' : 'hidden'}>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Carregando escala de plantões...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Nenhum plantão encontrado
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {hasActiveFilters
                ? 'Toque abaixo para limpar os filtros aplicados.'
                : 'Não há plantões registrados neste dia.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  Limpar filtros
                </button>
              )}
              <button
                type="button"
                onClick={onOpenNewShiftModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Nova escala</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 p-3 space-y-3 bg-slate-50/50">
            {rows.map((row) => {
              let cardBorderStyle = 'border-slate-200/90 bg-white';
              let statusStrip: React.ReactNode = null;

              if (row.visual_state === 'blue') {
                cardBorderStyle = 'border-sky-300 border-l-4 border-l-sky-500 bg-sky-50/40';
                statusStrip = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Plantão {row.shift_period === '48h' ? '48h' : '24h'} · Permanece na casa
                  </span>
                );
              } else if (row.visual_state === 'green') {
                cardBorderStyle =
                  'border-emerald-300 border-l-4 border-l-emerald-500 bg-emerald-50/40';
                statusStrip = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sem escala para esta casa hoje
                  </span>
                );
              } else if (row.visual_state === 'yellow') {
                cardBorderStyle = 'border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/50';
                statusStrip = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    Falta definir o profissional
                  </span>
                );
              }

              const avatarInitial = row.professional_name
                ? row.professional_name.charAt(0).toUpperCase()
                : '?';
              const avatarColorClass =
                AVATAR_COLOR_MAP[row.professional_avatar_color || 'indigo'] ||
                AVATAR_COLOR_MAP.indigo;
              const isToggling = row.shift_id !== null && togglingShiftId === row.shift_id;

              return (
                <article
                  key={`mobile-card-${row.date}-${row.house_id}-${row.id}`}
                  className={`rounded-2xl border p-4 shadow-2xs transition-all ${cardBorderStyle}`}
                >
                  {statusStrip && <div className="mb-2.5">{statusStrip}</div>}

                  {/* Topo do cartão: Casa, Assistido e Ações de Editar/Excluir */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{row.house_name}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Assistido: <span className="font-medium">{row.assisted_person}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {row.shift_id !== null ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditShift(row)}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 bg-white/80 border border-slate-200/80"
                            aria-label={`Editar escala da casa ${row.house_name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteShift(row)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 bg-white/80 border border-slate-200/80"
                            aria-label={`Excluir escala da casa ${row.house_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCreateShiftForHouse(row.house_id, selectedDate)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-white border border-indigo-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Escalar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Endereço e Horário */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        <strong className="font-semibold text-slate-700">{row.neighborhood}</strong>{' '}
                        · {row.address}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {row.visual_state === 'green'
                          ? 'Sem expediente neste dia'
                          : `${row.start_time} às ${row.end_time}`}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do Cartão Mobile: Profissional + Botão de Checagem fácil de tocar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <div>
                      {row.professional_name ? (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
                          <span
                            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${avatarColorClass}`}
                          >
                            {avatarInitial}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {row.professional_name}
                          </span>
                        </div>
                      ) : row.visual_state === 'yellow' ? (
                        <button
                          type="button"
                          onClick={() => onEditShift(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Definir profissional</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Sem profissional no dia
                        </span>
                      )}
                    </div>

                    <div>
                      {row.visual_state === 'blue' || row.visual_state === 'green' ? (
                        <span className="text-xs font-medium text-slate-400 px-2 py-1">
                          Não precisa checar
                        </span>
                      ) : row.visual_state === 'yellow' ? (
                        <span className="text-xs font-medium text-amber-800">
                          Aguardando escala
                        </span>
                      ) : row.check_status === 'done' ? (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => onToggleCheck(row)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Feita</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => onToggleCheck(row)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B4FE9] text-white font-semibold text-xs shadow-xs active:scale-95 transition-all disabled:opacity-50"
                        >
                          <span className="w-3.5 h-3.5 rounded-xs border-2 border-white/80 inline-block" />
                          <span>Marcar feita</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TABELA COM ROLAGEM HORIZONTAL (Padrão em Desktop e selecionável no Mobile) */}
      {/* ===================================================================== */}
      <div className={mobileViewMode === 'table' ? 'block' : 'hidden md:block'}>
        {/* Dica de rolagem horizontal em telas pequenas */}
        <div className="md:hidden px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700 font-medium">
          <span className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Deslize a tabela para o lado para ver todas as colunas</span>
          </span>
        </div>

        <div className="table-scroll-container overflow-x-auto">
          <table className="w-full min-w-[780px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-white">
                <th scope="col" className="py-3 pl-5 pr-3 w-[25%]">
                  Casa / Assistido
                </th>
                <th scope="col" className="py-3 px-3 w-[26%]">
                  Endereço
                </th>
                <th scope="col" className="py-3 px-3 w-[16%]">
                  Horário
                </th>
                <th scope="col" className="py-3 px-3 w-[18%]">
                  Profissional
                </th>
                <th scope="col" className="py-3 px-3 w-[10%] text-right">
                  Checagem
                </th>
                <th scope="col" className="py-3 pl-2 pr-5 w-[5%] text-right">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Carregando escala de plantões...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-5 text-center">
                    <div className="max-w-sm mx-auto">
                      <p className="text-sm font-semibold text-slate-700 mb-1">
                        Nenhum plantão encontrado para os filtros selecionados
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        {hasActiveFilters
                          ? 'Tente remover os filtros ativos ou buscar por outro termo.'
                          : 'Não há plantões registrados neste dia. Você pode cadastrar uma nova escala agora.'}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Limpar filtros
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onOpenNewShiftModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B4FE9] text-white text-xs font-medium hover:bg-indigo-700 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nova escala</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  let rowStyle = 'bg-white hover:bg-slate-50/70';
                  if (row.visual_state === 'blue') {
                    rowStyle =
                      'bg-sky-50/45 hover:bg-sky-50/80 border-l-4 border-l-sky-400';
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

                  const isToggling = row.shift_id !== null && togglingShiftId === row.shift_id;

                  return (
                    <tr
                      key={`${row.date}-${row.house_id}-${row.id}`}
                      className={`transition-colors ${rowStyle}`}
                    >
                      {/* Coluna 1: Casa / Assistido */}
                      <td className="py-3.5 pl-5 pr-3 align-middle">
                        <div className="font-semibold text-slate-900 text-[13px]">
                          {row.house_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Assistido: {row.assisted_person}
                        </div>
                      </td>

                      {/* Coluna 2: Endereço */}
                      <td className="py-3.5 px-3 align-middle text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span
                            className="truncate max-w-[260px]"
                            title={`${row.neighborhood} · ${row.address}`}
                          >
                            <span className="font-medium text-slate-700">{row.neighborhood}</span> ·{' '}
                            {row.address}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 3: Horário */}
                      <td className="py-3.5 px-3 align-middle text-slate-600">
                        {row.visual_state === 'green' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Sem expediente</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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

                      {/* Coluna 4: Profissional / Estado Visual */}
                      <td className="py-3.5 px-3 align-middle">
                        {row.visual_state === 'blue' ? (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-100/90 text-sky-900 border border-sky-200/80">
                            <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 text-[11px] font-bold flex items-center justify-center">
                              {row.professional_name ? avatarInitial : 'P'}
                            </span>
                            <span className="font-semibold text-[11px]">
                              {row.professional_name
                                ? `${row.professional_name} · Plantão ${
                                    row.shift_period === '48h' ? '48h' : '24h'
                                  }`
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
                            onClick={() => onEditShift(row)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold hover:bg-amber-200/80 transition-colors cursor-pointer"
                            title="Clique para definir o profissional deste plantão"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
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

                      {/* Coluna 5: Checagem */}
                      <td className="py-3.5 px-3 align-middle text-right">
                        {row.visual_state === 'blue' || row.visual_state === 'green' ? (
                          <span className="text-xs font-medium text-slate-400">Não precisa</span>
                        ) : row.visual_state === 'yellow' ? (
                          <span className="text-[11px] font-medium text-amber-700">
                            Aguardando escala
                          </span>
                        ) : row.check_status === 'done' ? (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => onToggleCheck(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Checagem concluída. Clique para voltar para pendente."
                          >
                            <span className="w-4 h-4 rounded-xs bg-emerald-500 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                            <span>Feita</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => onToggleCheck(row)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-xs hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/40 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                            title="Marcar checagem deste plantão como feita"
                          >
                            <span className="w-3.5 h-3.5 rounded-xs border border-slate-300 bg-white inline-block" />
                            <span>Marcar feita</span>
                          </button>
                        )}
                      </td>

                      {/* Coluna 6: Ações (Editar / Excluir / Escalar) */}
                      <td className="py-3.5 pl-2 pr-5 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {row.shift_id === null ? (
                            <button
                              type="button"
                              onClick={() => onCreateShiftForHouse(row.house_id, selectedDate)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Criar escala para esta casa neste dia"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Escalar</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditShift(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                aria-label={`Editar escala da casa ${row.house_name}`}
                                title="Editar plantão"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteShift(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                aria-label={`Remover escala da casa ${row.house_name}`}
                                title="Excluir plantão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
