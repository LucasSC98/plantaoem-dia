import React from 'react';
import { Calendar, CheckSquare, Building2, Users, Plus } from 'lucide-react';
import { NavSection } from './Sidebar';

interface MobileBottomNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingChecksCount: number;
  onOpenNewShift: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onSelectSection,
  pendingChecksCount,
  onOpenNewShift
}) => {
  return (
    <nav
      aria-label="Navegação inferior mobile"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around lg:hidden shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
    >
      <button
        type="button"
        onClick={() => onSelectSection('schedules')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] transition-colors ${
          activeSection === 'schedules' || activeSection === 'overview'
            ? 'text-[#5B4FE9] font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Calendar className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">Escalas</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('checks')}
        className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] transition-colors ${
          activeSection === 'checks'
            ? 'text-[#5B4FE9] font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className="relative">
          <CheckSquare className="w-5 h-5 mb-0.5" />
          {pendingChecksCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingChecksCount}
            </span>
          )}
        </div>
        <span className="text-[11px] leading-tight">Pendentes</span>
      </button>

      {/* Botão central destacado para + Nova escala no mobile */}
      <button
        type="button"
        onClick={onOpenNewShift}
        className="flex flex-col items-center justify-center -mt-5"
        aria-label="Criar nova escala"
      >
        <span className="w-12 h-12 rounded-2xl bg-[#5B4FE9] text-white shadow-md shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-transform">
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </span>
        <span className="text-[10px] font-semibold text-[#5B4FE9] mt-1">Nova escala</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('houses')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] transition-colors ${
          activeSection === 'houses'
            ? 'text-[#5B4FE9] font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Building2 className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">Casas</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('team')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] transition-colors ${
          activeSection === 'team'
            ? 'text-[#5B4FE9] font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span className="text-[11px] leading-tight">Equipe</span>
      </button>
    </nav>
  );
};
