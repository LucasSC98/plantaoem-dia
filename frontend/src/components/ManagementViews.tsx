import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users
} from 'lucide-react';
import { House, Professional } from '../types';

interface HousesViewProps {
  houses: House[];
  onOpenNewHouse: () => void;
  onEditHouse: (house: House) => void;
  onDeleteHouse: (house: House) => void;
}

export const HousesView: React.FC<HousesViewProps> = ({
  houses,
  onOpenNewHouse,
  onEditHouse,
  onDeleteHouse
}) => {
  const [search, setSearch] = useState('');

  const filtered = houses.filter((h) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.assisted_person.toLowerCase().includes(q) ||
      h.neighborhood.toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q)
    );
  });

  return (
    <section
      aria-labelledby="houses-view-title"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 id="houses-view-title" className="text-base font-bold text-slate-900">
            Casas e Pessoas Assistidas ({houses.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre, edite ou remova residências e clientes atendidos pela operação.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="houses-search" className="sr-only">
              Buscar casa ou pessoa assistida
            </label>
            <input
              id="houses-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar casa ou assistido..."
              className="w-full pl-9 sm:pl-8 pr-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={onOpenNewHouse}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova casa</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 sm:p-12 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhuma casa encontrada</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Cadastre uma nova residência para incluí-la nas escalas semanais.
          </p>
          <button
            type="button"
            onClick={onOpenNewHouse}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeira casa</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 p-4 sm:p-5">
          {filtered.map((house) => (
            <article
              key={house.id}
              className="rounded-xl border border-slate-200/80 p-4 hover:border-slate-300 transition-colors flex flex-col justify-between bg-slate-50/30"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{house.name}</h3>
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Assistido(a): {house.assisted_person}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditHouse(house)}
                      className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                      aria-label={`Editar casa ${house.name}`}
                      title="Editar casa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHouse(house)}
                      className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      aria-label={`Excluir casa ${house.name}`}
                      title="Remover casa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-slate-700">{house.neighborhood}</strong> ·{' '}
                    {house.address}
                  </span>
                </div>

                {house.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                    {house.notes}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

interface ProfessionalsViewProps {
  professionals: Professional[];
  onOpenNewProfessional: () => void;
  onEditProfessional: (prof: Professional) => void;
  onDeleteProfessional: (prof: Professional) => void;
}

const AVATAR_BG: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  blue: 'bg-sky-100 text-sky-700',
  purple: 'bg-purple-100 text-purple-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-cyan-100 text-cyan-700',
  violet: 'bg-violet-100 text-violet-700',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700'
};

export const ProfessionalsView: React.FC<ProfessionalsViewProps> = ({
  professionals,
  onOpenNewProfessional,
  onEditProfessional,
  onDeleteProfessional
}) => {
  const [search, setSearch] = useState('');

  const filtered = professionals.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  return (
    <section
      aria-labelledby="team-view-title"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 id="team-view-title" className="text-base font-bold text-slate-900">
            Equipe de Profissionais ({professionals.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie cuidadores e técnicos de enfermagem disponíveis para as escalas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="team-search" className="sr-only">
              Buscar profissional
            </label>
            <input
              id="team-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar profissional..."
              className="w-full pl-9 sm:pl-8 pr-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={onOpenNewProfessional}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo profissional</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 sm:p-12 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum profissional encontrado</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Cadastre profissionais para atribuí-los aos plantões das casas.
          </p>
          <button
            type="button"
            onClick={onOpenNewProfessional}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B4FE9] text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar profissional</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 p-4 sm:p-5">
          {filtered.map((prof) => {
            const colorClass = AVATAR_BG[prof.avatar_color] || AVATAR_BG.indigo;
            return (
              <article
                key={prof.id}
                className="rounded-xl border border-slate-200/80 p-4 flex items-start justify-between gap-3 bg-slate-50/30 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 ${colorClass}`}
                  >
                    {prof.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{prof.name}</h3>
                    <p className="text-xs text-slate-500">{prof.role}</p>
                    {prof.phone && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{prof.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEditProfessional(prof)}
                    className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                    aria-label={`Editar profissional ${prof.name}`}
                    title="Editar profissional"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProfessional(prof)}
                    className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    aria-label={`Remover profissional ${prof.name}`}
                    title="Remover profissional"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
