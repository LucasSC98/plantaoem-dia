import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  ChevronRight,
  Menu,
  Plus,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  LogOut,
  FileSpreadsheet
} from 'lucide-react';
import { api, setApiAuthToken } from './api/client';
import {
  DayKey,
  EnrichedShiftRow,
  House,
  Organization,
  Professional,
  ShiftPeriod,
  ShiftType,
  SummaryData,
  User
} from './types';
import {
  addDays,
  buildWeekFromSaturday,
  getCurrentDayKey,
  getCurrentWeekSaturdayIso
} from './utils/dates';
import { NavSection, Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SummaryCards } from './components/SummaryCards';
import { ScheduleTable } from './components/ScheduleTable';
import { HousesView, ProfessionalsView } from './components/ManagementViews';
import {
  ConfirmDeleteModal,
  HouseModal,
  ProfessionalModal,
  ShiftModal
} from './components/Modals';
import { AuthScreen } from './components/AuthScreen';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { InteractiveExamplesSection } from './components/InteractiveExamplesSection';

export function App() {
  // Sessão autenticada por e-mail da empresa
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Navegação principal
  const [activeSection, setActiveSection] = useState<NavSection>('schedules');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Semana selecionada (inicia automaticamente na semana atual e no dia de hoje)
  const [saturdayIso, setSaturdayIso] = useState<string>(() => getCurrentWeekSaturdayIso());
  const [activeDayTab, setActiveDayTab] = useState<DayKey>(() => getCurrentDayKey());
  const [spreadsheetModalOpen, setSpreadsheetModalOpen] = useState<boolean>(false);

  // Filtros da tabela de escalas
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyPending, setOnlyPending] = useState<boolean>(false);
  const [visualStateFilter, setVisualStateFilter] = useState<string>('all');

  // Dados vindos da API REST (exclusivos da empresa logada)
  const [houses, setHouses] = useState<House[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [shiftRows, setShiftRows] = useState<EnrichedShiftRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // Estados de carregamento e feedback
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [togglingShiftId, setTogglingShiftId] = useState<number | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais de CRUD
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<EnrichedShiftRow | null>(null);
  const [defaultModalHouseId, setDefaultModalHouseId] = useState<number | null>(null);

  const [houseModalOpen, setHouseModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);

  const [profModalOpen, setProfModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  // Modal de Confirmação de Exclusão
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

  const currentWeek = useMemo(() => buildWeekFromSaturday(saturdayIso), [saturdayIso]);

  const presetWeeks = useMemo(() => {
    const todayWeekSat = getCurrentWeekSaturdayIso();
    // Começa na semana atual e mostra as próximas semanas (sem poluir com semanas antigas)
    const baseSaturdays = [
      todayWeekSat,
      addDays(todayWeekSat, 7),
      addDays(todayWeekSat, 14),
      addDays(todayWeekSat, 21),
      addDays(todayWeekSat, 28)
    ];
    if (!baseSaturdays.includes(saturdayIso)) {
      baseSaturdays.push(saturdayIso);
      baseSaturdays.sort();
    }
    return baseSaturdays.map((sat) => buildWeekFromSaturday(sat));
  }, [saturdayIso]);

  const selectedDate = useMemo(() => {
    const found = currentWeek.days.find((d) => d.key === activeDayTab);
    return found ? found.date : currentWeek.saturdayDate;
  }, [currentWeek, activeDayTab]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Carregar casas e profissionais da empresa logada
  const fetchBaseEntities = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [housesList, profsList] = await Promise.all([
        api.getHouses(),
        api.getProfessionals()
      ]);
      setHouses(housesList);
      setProfessionals(profsList);
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar casas e profissionais da API.'
      );
    }
  }, [isAuthenticated]);

  // Carregar escala do dia e resumo da semana da empresa logada
  const fetchScheduleAndSummary = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSchedule(true);
    setErrorBanner(null);
    try {
      const [rowsData, summaryData] = await Promise.all([
        api.getShifts({
          date: selectedDate,
          search: searchQuery,
          onlyPending,
          visualState: visualStateFilter,
          includeUnscheduledHouses: true
        }),
        api.getSummary({
          startDate: currentWeek.startDate,
          endDate: currentWeek.endDate,
          date: selectedDate
        })
      ]);
      setShiftRows(rowsData);
      setSummary(summaryData);
    } catch (err) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : 'Erro ao comunicar com o servidor backend. Verifique se a API está em execução.'
      );
    } finally {
      setLoadingSchedule(false);
    }
  }, [
    isAuthenticated,
    selectedDate,
    searchQuery,
    onlyPending,
    visualStateFilter,
    currentWeek.startDate,
    currentWeek.endDate
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBaseEntities();
    }
  }, [isAuthenticated, fetchBaseEntities]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchScheduleAndSummary();
    }
  }, [isAuthenticated, fetchScheduleAndSummary]);

  // Login pelo e-mail corporativo
  const handleLogin = async (data: { email: string; password: string }) => {
    const res = await api.login(data);
    setApiAuthToken(res.token);
    setActiveOrganization(res.organization);
    setActiveUser(res.user);
    setSearchQuery('');
    setOnlyPending(false);
    setVisualStateFilter('all');
    setActiveSection('schedules');
    setIsAuthenticated(true);
    showToast(`Bem-vindo(a), ${res.user.name}! Painel exclusivo da ${res.organization.name}.`);
  };

  // Cadastro de nova empresa
  const handleRegisterCompany = async (data: {
    organizationName: string;
    document: string;
    plan: string;
    userName: string;
    email: string;
    password: string;
    seedSampleData: boolean;
  }) => {
    const res = await api.registerCompany(data);
    setApiAuthToken(res.token);
    setActiveOrganization(res.organization);
    setActiveUser(res.user);
    setSaturdayIso(getCurrentWeekSaturdayIso());
    setActiveDayTab(getCurrentDayKey());
    setSearchQuery('');
    setOnlyPending(false);
    setVisualStateFilter('all');
    setActiveSection('schedules');
    setIsAuthenticated(true);
    showToast(`Empresa "${res.organization.name}" cadastrada com sucesso!`);
  };

  // Sair da conta (Logout)
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignora falha de rede no logout
    }
    setApiAuthToken(null);
    setIsAuthenticated(false);
    setActiveOrganization(null);
    setActiveUser(null);
    setHouses([]);
    setProfessionals([]);
    setShiftRows([]);
    setSummary(null);
  };

  // Se o usuário não estiver autenticado, exibe somente a tela de Login / Cadastro da Empresa
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} onRegisterCompany={handleRegisterCompany} />;
  }

  // Navegação entre semanas
  const handlePrevWeek = () => {
    setSaturdayIso((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setSaturdayIso((prev) => addDays(prev, 7));
  };

  // Alternar checagem (feita / pendente)
  const handleToggleCheck = async (row: EnrichedShiftRow) => {
    if (!row.requires_check) return;
    setTogglingShiftId(row.shift_id);
    setErrorBanner(null);
    try {
      await api.toggleCheck({
        shift_id: row.shift_id,
        house_id: row.house_id,
        professional_id: row.professional_id,
        date: row.date,
        shift_period: row.shift_period
      });
      await fetchScheduleAndSummary();
      const nextLabel = row.check_status === 'done' ? 'pendente' : 'concluída';
      showToast(`Checagem de ${row.house_name} marcada como ${nextLabel}.`);
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Erro ao atualizar o status da checagem.'
      );
    } finally {
      setTogglingShiftId(null);
    }
  };

  // Salvar Plantão (Criar ou Editar)
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
      await api.updateShift(data.id, data);
      showToast('Escala atualizada com sucesso.');
    } else {
      await api.createShift(data);
      showToast('Nova escala cadastrada com sucesso.');
    }
    await fetchScheduleAndSummary();
  };

  // Excluir Plantão
  const handleRequestDeleteShift = (row: EnrichedShiftRow) => {
    if (!row.shift_id) return;
    const shiftId = row.shift_id;
    setDeleteConfirm({
      isOpen: true,
      title: 'Excluir plantão da escala?',
      description: `Tem certeza que deseja remover o plantão da casa "${row.house_name}" no dia ${row.date}? A casa passará para o estado "Sem escala neste dia".`,
      onConfirm: async () => {
        await api.deleteShift(shiftId);
        await fetchScheduleAndSummary();
        showToast('Plantão removido da escala.');
      }
    });
  };

  // Salvar Casa (Criar ou Editar)
  const handleSaveHouse = async (data: {
    id?: number;
    name: string;
    assisted_person: string;
    neighborhood: string;
    address: string;
    notes: string;
  }) => {
    if (data.id) {
      await api.updateHouse(data.id, data);
      showToast(`Casa "${data.name}" atualizada com sucesso.`);
    } else {
      await api.createHouse(data);
      showToast(`Casa "${data.name}" cadastrada com sucesso.`);
    }
    await Promise.all([fetchBaseEntities(), fetchScheduleAndSummary()]);
  };

  // Excluir Casa
  const handleRequestDeleteHouse = (house: House) => {
    setDeleteConfirm({
      isOpen: true,
      title: `Excluir "${house.name}"?`,
      description: `Esta ação removerá a casa "${house.name}" (${house.assisted_person}) e todos os plantões e checagens vinculados a ela.`,
      onConfirm: async () => {
        await api.deleteHouse(house.id);
        await Promise.all([fetchBaseEntities(), fetchScheduleAndSummary()]);
        showToast(`Casa "${house.name}" removida com sucesso.`);
      }
    });
  };

  // Salvar Profissional (Criar ou Editar)
  const handleSaveProfessional = async (data: {
    id?: number;
    name: string;
    role: string;
    phone: string;
    avatar_color: string;
  }) => {
    if (data.id) {
      await api.updateProfessional(data.id, data);
      showToast(`Profissional "${data.name}" atualizado(a) com sucesso.`);
    } else {
      await api.createProfessional(data);
      showToast(`Profissional "${data.name}" cadastrado(a) com sucesso.`);
    }
    await Promise.all([fetchBaseEntities(), fetchScheduleAndSummary()]);
  };

  // Excluir Profissional
  const handleRequestDeleteProfessional = (prof: Professional) => {
    setDeleteConfirm({
      isOpen: true,
      title: `Remover profissional "${prof.name}"?`,
      description: `Os plantões atribuídos a "${prof.name}" permanecerão na escala, porém passarão para o estado amarelo ("Falta definir profissional").`,
      onConfirm: async () => {
        await api.deleteProfessional(prof.id);
        await Promise.all([fetchBaseEntities(), fetchScheduleAndSummary()]);
        showToast(`Profissional "${prof.name}" removido(a).`);
      }
    });
  };

  // Limpar todos os dados salvos no banco da empresa logada
  const handleRequestClearCompanyData = () => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Limpar todos os dados salvos no banco?',
      description: `Esta ação apagará todas as casas, profissionais, escalas e checagens salvos no banco de dados da empresa "${activeOrganization?.name}". Os exemplos de 3 dias continuarão disponíveis na área separada de Exemplos.`,
      onConfirm: async () => {
        setIsResettingDemo(true);
        try {
          await api.clearCompanyData('all');
          await Promise.all([fetchBaseEntities(), fetchScheduleAndSummary()]);
          showToast('Todos os dados salvos no banco foram removidos com sucesso.');
        } finally {
          setIsResettingDemo(false);
        }
      }
    });
  };

  // Exportar CSV da visão atual
  const handleExportCsv = () => {
    const headers = [
      'Empresa',
      'Data',
      'Casa',
      'Pessoa Assistida',
      'Bairro',
      'Endereco',
      'Horario',
      'Profissional',
      'Estado',
      'Checagem'
    ];
    const orgName = activeOrganization?.name || 'Empresa';
    const lines = shiftRows.map((r) => [
      `"${orgName.replace(/"/g, '""')}"`,
      r.date,
      `"${r.house_name.replace(/"/g, '""')}"`,
      `"${r.assisted_person.replace(/"/g, '""')}"`,
      `"${r.neighborhood.replace(/"/g, '""')}"`,
      `"${r.address.replace(/"/g, '""')}"`,
      r.visual_state === 'green' ? 'Sem escala' : `${r.start_time} as ${r.end_time}`,
      `"${(r.professional_name || 'Sem profissional').replace(/"/g, '""')}"`,
      r.visual_state,
      r.check_status === 'done'
        ? 'Feita'
        : r.check_status === 'pending'
          ? 'Pendente'
          : 'Nao precisa'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...lines.map((l) => l.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `escala-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Arquivo CSV da escala exportado.');
  };

  const sectionTitleMap: Record<NavSection, string> = {
    overview: 'Visão geral',
    schedules: 'Escalas',
    houses: 'Casas e Assistidos',
    team: 'Equipe',
    checks: 'Checagens',
    examples: 'Tutorial e Exemplos'
  };

  const handleSelectNavSection = (sec: NavSection) => {
    setActiveSection(sec);
    if (sec === 'checks') {
      setOnlyPending(true);
    } else if (sec === 'schedules') {
      setOnlyPending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Navegação Lateral */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectNavSection}
        pendingChecksCount={summary?.day.pendingChecks ?? 0}
        housesCount={houses.length}
        professionalsCount={professionals.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onClearCompanyData={handleRequestClearCompanyData}
        isClearingData={isResettingDemo}
        activeOrganization={activeOrganization}
        activeUser={activeUser}
        onLogout={handleLogout}
      />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-3.5 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden shrink-0"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs truncate">
              <span className="font-bold text-slate-900 lg:hidden">
                plantão<span className="text-[#5B4FE9]">em dia</span>
              </span>
              <span className="hidden lg:inline text-slate-500 font-semibold">
                {activeOrganization?.name}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
              <span className="text-slate-800 font-semibold truncate">
                {sectionTitleMap[activeSection]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{activeOrganization?.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{activeUser?.email}</span>
            </div>

            <button
              type="button"
              onClick={() => handleSelectNavSection('checks')}
              className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Ver checagens pendentes"
              title="Ver checagens pendentes"
            >
              <Bell className="w-4 h-4" />
              {(summary?.day.pendingChecks ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {summary?.day.pendingChecks}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/40 transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 px-3.5 sm:px-8 pt-4 sm:pt-6 pb-24 lg:pb-8 max-w-[1360px] w-full mx-auto">
          {errorBanner && (
            <div
              role="alert"
              className="mb-4 sm:mb-5 p-3.5 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="p-1 rounded-lg hover:bg-rose-100 text-rose-600"
                aria-label="Fechar mensagem de erro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-20 lg:bottom-5 right-4 left-4 sm:left-auto sm:right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-medium border border-slate-700"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {activeSection === 'examples' ? (
            <InteractiveExamplesSection />
          ) : (
            <>
              {/* Cabeçalho da Página + Botões de Ação Rápida */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1">
                    {activeOrganization?.name} · Acompanhamento da Equipe
                  </p>
                  <h1 className="text-xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                    Escalas e checagens
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                    Organize os plantões e confira quem precisa ser checado em cada casa.
                  </p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSpreadsheetModalOpen(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/90 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                    title="Importar ou exportar planilha Excel (.xlsx) / CSV"
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
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
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
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
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
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Nova escala</span>
                  </button>
                </div>
              </div>

              {/* Cartões de Resumo */}
              <SummaryCards
                summary={summary}
                loading={loadingSchedule}
                onlyPendingActive={onlyPending}
                onTogglePendingFilter={() => setOnlyPending((prev) => !prev)}
              />

              {/* Conteúdo Dinâmico conforme a seção selecionada */}
              {activeSection === 'houses' ? (
                <HousesView
                  houses={houses}
                  onOpenNewHouse={() => {
                    setEditingHouse(null);
                    setHouseModalOpen(true);
                  }}
                  onEditHouse={(h) => {
                    setEditingHouse(h);
                    setHouseModalOpen(true);
                  }}
                  onDeleteHouse={handleRequestDeleteHouse}
                />
              ) : activeSection === 'team' ? (
                <ProfessionalsView
                  professionals={professionals}
                  onOpenNewProfessional={() => {
                    setEditingProf(null);
                    setProfModalOpen(true);
                  }}
                  onEditProfessional={(p) => {
                    setEditingProf(p);
                    setProfModalOpen(true);
                  }}
                  onDeleteProfessional={handleRequestDeleteProfessional}
                />
              ) : (
                <div className="space-y-6">
                  <ScheduleTable
                    week={currentWeek}
                    presetWeeks={presetWeeks}
                    onPrevWeek={handlePrevWeek}
                    onNextWeek={handleNextWeek}
                    onSelectWeekSaturday={(sat) => setSaturdayIso(sat)}
                    activeDayTab={activeDayTab}
                    onChangeDayTab={(tab) => setActiveDayTab(tab)}
                    searchQuery={searchQuery}
                    onChangeSearch={setSearchQuery}
                    onlyPending={onlyPending}
                    onToggleOnlyPending={() => setOnlyPending((prev) => !prev)}
                    visualStateFilter={visualStateFilter}
                    onChangeVisualStateFilter={setVisualStateFilter}
                    rows={shiftRows}
                    loading={loadingSchedule}
                    togglingShiftId={togglingShiftId}
                    onToggleCheck={handleToggleCheck}
                    onEditShift={(row) => {
                      setEditingShift(row);
                      setDefaultModalHouseId(row.house_id);
                      setShiftModalOpen(true);
                    }}
                    onCreateShiftForHouse={(houseId, dateStr) => {
                      setEditingShift(null);
                      setDefaultModalHouseId(houseId);
                      const matchedDay = currentWeek.days.find((d) => d.date === dateStr);
                      if (matchedDay) {
                        setActiveDayTab(matchedDay.key);
                      }
                      setShiftModalOpen(true);
                    }}
                    onDeleteShift={handleRequestDeleteShift}
                    onOpenNewShiftModal={() => {
                      setEditingShift(null);
                      setDefaultModalHouseId(null);
                      setShiftModalOpen(true);
                    }}
                    onOpenSpreadsheetModal={() => setSpreadsheetModalOpen(true)}
                  />

                  {activeSection === 'overview' && (
                    <div className="space-y-6 pt-2">
                      <HousesView
                        houses={houses}
                        onOpenNewHouse={() => {
                          setEditingHouse(null);
                          setHouseModalOpen(true);
                        }}
                        onEditHouse={(h) => {
                          setEditingHouse(h);
                          setHouseModalOpen(true);
                        }}
                        onDeleteHouse={handleRequestDeleteHouse}
                      />
                      <ProfessionalsView
                        professionals={professionals}
                        onOpenNewProfessional={() => {
                          setEditingProf(null);
                          setProfModalOpen(true);
                        }}
                        onEditProfessional={(p) => {
                          setEditingProf(p);
                          setProfModalOpen(true);
                        }}
                        onDeleteProfessional={handleRequestDeleteProfessional}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Barra de Navegação Inferior Fixa para Celular */}
      <MobileBottomNav
        activeSection={activeSection}
        onSelectSection={handleSelectNavSection}
        pendingChecksCount={summary?.day.pendingChecks ?? 0}
        onOpenNewShift={() => {
          setEditingShift(null);
          setDefaultModalHouseId(null);
          setShiftModalOpen(true);
        }}
      />

      {/* Modal de Importar e Exportar Planilha (.xlsx / .csv) */}
      <SpreadsheetModal
        isOpen={spreadsheetModalOpen}
        onClose={() => setSpreadsheetModalOpen(false)}
        week={currentWeek}
        selectedDate={selectedDate}
        organizationName={activeOrganization?.name || 'Empresa'}
        onImportSuccess={async (msg) => {
          await Promise.all([fetchBaseEntities(), fetchScheduleAndSummary()]);
          showToast(msg);
        }}
      />

      {/* Modal de Criar/Editar Plantão */}
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

      {/* Modal de Criar/Editar Casa */}
      <HouseModal
        isOpen={houseModalOpen}
        onClose={() => setHouseModalOpen(false)}
        editingHouse={editingHouse}
        onSave={handleSaveHouse}
      />

      {/* Modal de Criar/Editar Profissional */}
      <ProfessionalModal
        isOpen={profModalOpen}
        onClose={() => setProfModalOpen(false)}
        editingProfessional={editingProf}
        onSave={handleSaveProfessional}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirm.onConfirm}
      />
    </div>
  );
}
export default App;
