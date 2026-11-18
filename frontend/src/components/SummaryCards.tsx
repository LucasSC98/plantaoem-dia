import React from 'react';
import { Calendar, ListChecks, Clock } from 'lucide-react';
import { SummaryData } from '../types';

interface SummaryCardsProps {
  summary: SummaryData | null;
  loading: boolean;
  onlyPendingActive: boolean;
  onTogglePendingFilter: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  loading,
  onlyPendingActive,
  onTogglePendingFilter
}) => {
  const weekTotalShifts = summary?.week.totalShifts ?? 0;
  const housesServed = summary?.week.housesServed ?? 0;
  const dayPendingChecks = summary?.day.pendingChecks ?? 0;
  const dayTotalChecks = summary?.day.totalChecks ?? 0;
  const week24h48hCount = summary?.week.stayIn24h48hCount ?? 0;
  const day24h48hCount = summary?.day.stayIn24h48hCount ?? 0;

  return (
    <section
      aria-label="Resumo de escalas e checagens"
      className="grid grid-cols-3 md:grid-cols-3 gap-2.5 sm:gap-4 mb-5 sm:mb-6"
    >
      {/* Card 1: Escalas nesta semana */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#EEF0FF] text-[#5B4FE9] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight mb-1">
              <span className="sm:hidden">Na semana</span>
              <span className="hidden sm:inline">Escalas nesta semana</span>
            </p>
            <p className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2">
              {loading ? '...' : weekTotalShifts}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">
              em <span className="font-medium text-slate-600">{housesServed}</span> casas
              <span className="hidden sm:inline"> atendidas</span>
            </p>
          </div>
        </div>

        {/* Mini gráfico decorativo em telas maiores */}
        <div className="hidden lg:flex items-end gap-1.5 h-10 self-end pt-2" aria-hidden="true">
          <span className="w-1.5 h-4 rounded-full bg-indigo-200" />
          <span className="w-1.5 h-6 rounded-full bg-indigo-200" />
          <span className="w-1.5 h-5 rounded-full bg-indigo-300" />
          <span className="w-1.5 h-7 rounded-full bg-indigo-300" />
          <span className="w-1.5 h-5 rounded-full bg-indigo-300" />
          <span className="w-1.5 h-9 rounded-full bg-[#5B4FE9]" />
          <span className="w-1.5 h-8 rounded-full bg-indigo-400" />
        </div>
      </div>

      {/* Card 2: Checagens pendentes */}
      <button
        type="button"
        onClick={onTogglePendingFilter}
        className={`text-left bg-white rounded-2xl border p-3 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 relative ${
          onlyPendingActive
            ? 'border-amber-400 ring-2 ring-amber-200/70 bg-amber-50/20'
            : 'border-slate-200/80 hover:border-slate-300'
        }`}
        title="Toque para filtrar apenas checagens pendentes"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ListChecks className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight mb-1">
              <span className="sm:hidden">Pendentes</span>
              <span className="hidden sm:inline">Checagens pendentes</span>
            </p>
            <p className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2">
              {loading ? '...' : dayPendingChecks}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">
              de <span className="font-medium text-slate-600">{dayTotalChecks}</span> do dia
              {onlyPendingActive && (
                <span className="hidden sm:inline ml-1.5 text-amber-700 font-semibold">
                  (Filtro ativo)
                </span>
              )}
            </p>
          </div>
        </div>

        <span
          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full absolute top-3 right-3 sm:static sm:mt-1 ${
            dayPendingChecks > 0
              ? 'bg-amber-400 ring-4 ring-amber-50'
              : 'bg-emerald-500 ring-4 ring-emerald-50'
          }`}
          title={dayPendingChecks > 0 ? 'Há checagens pendentes' : 'Todas as checagens em dia'}
        />
      </button>

      {/* Card 3: Em plantão 24h / 48h */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between relative">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight mb-1">
              <span className="sm:hidden">Plantão 24/48h</span>
              <span className="hidden sm:inline">Em plantão 24h / 48h</span>
            </p>
            <p className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-2">
              {loading ? '...' : week24h48hCount}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">
              <span className="sm:hidden">{day24h48hCount} hoje na casa</span>
              <span className="hidden sm:inline">
                permanecem na casa ({day24h48hCount} neste dia)
              </span>
            </p>
          </div>
        </div>

        <span
          className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-sky-500 ring-4 ring-sky-50 absolute top-3 right-3 sm:static sm:mt-1"
          aria-hidden="true"
        />
      </div>
    </section>
  );
};
