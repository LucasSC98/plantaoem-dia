import React from 'react';
import {
  Calendar,
  CheckSquare,
  Home,
  Users,
  Building2,
  X,
  Trash2,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { Organization, User } from '../types';

export type NavSection = 'overview' | 'schedules' | 'houses' | 'team' | 'checks' | 'examples';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  pendingChecksCount: number;
  housesCount: number;
  professionalsCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onClearCompanyData: () => void;
  isClearingData: boolean;
  activeOrganization: Organization | null;
  activeUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  pendingChecksCount,
  housesCount,
  professionalsCount,
  isOpenMobile,
  onCloseMobile,
  onClearCompanyData,
  isClearingData,
  activeOrganization,
  activeUser,
  onLogout
}) => {
  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
  }[] = [
      {
        id: 'overview',
        label: 'Visão geral',
        icon: <Home className="w-4 h-4" />
      },
      {
        id: 'schedules',
        label: 'Escalas',
        icon: <Calendar className="w-4 h-4" />,
        badge: pendingChecksCount > 0 ? pendingChecksCount : undefined,
        badgeColor: 'bg-indigo-100 text-indigo-700'
      },
      {
        id: 'houses',
        label: 'Casas e Assistidos',
        icon: <Building2 className="w-4 h-4" />,
        badge: housesCount,
        badgeColor: 'bg-slate-100 text-slate-600'
      },
      {
        id: 'team',
        label: 'Equipe',
        icon: <Users className="w-4 h-4" />,
        badge: professionalsCount,
        badgeColor: 'bg-slate-100 text-slate-600'
      },
      {
        id: 'checks',
        label: 'Checagens',
        icon: <CheckSquare className="w-4 h-4" />,
        badge: pendingChecksCount > 0 ? pendingChecksCount : undefined,
        badgeColor: 'bg-amber-100 text-amber-800'
      },
      {
        id: 'examples',
        label: 'Exemplos (3 dias)',
        icon: <Sparkles className="w-4 h-4" />,
        badge: 'Demo',
        badgeColor: 'bg-purple-100 text-purple-700'
      }
    ];

  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menu lateral de navegação"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Topo / Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <button
            type="button"
            onClick={() => handleNavClick('schedules')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-[#5B4FE9] flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[17px] tracking-tight font-bold text-slate-900">
              plantão<span className="text-[#5B4FE9]">em dia</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identificação da Empresa Logada */}
        <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-[#5B4FE9] font-bold text-sm flex items-center justify-center shrink-0">
              {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {activeOrganization?.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{activeUser?.email}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da conta</span>
          </button>
        </div>

        {/* Links de navegação */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Gestão da Equipe
          </p>
          <nav className="space-y-1" aria-label="Navegação principal">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive
                      ? 'bg-[#EEF0FF] text-[#4F46E5] font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#4F46E5]' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isActive
                          ? 'bg-white text-[#4F46E5] shadow-2xs'
                          : item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da barra lateral */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">
                Ambiente Isolado: <strong className="text-slate-900">{activeOrganization?.name}</strong>
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
