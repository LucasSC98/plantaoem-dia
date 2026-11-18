import React, { useState } from 'react';
import {
  Calendar,
  KeyRound,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Building2,
  User as UserIcon
} from 'lucide-react';

interface AuthScreenProps {
  onLogin: (data: { email: string; password: string }) => Promise<void>;
  onRegisterCompany: (data: {
    organizationName: string;
    document: string;
    plan: string;
    userName: string;
    email: string;
    password: string;
    seedSampleData: boolean;
  }) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegisterCompany }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registro de nova empresa
  const [orgName, setOrgName] = useState('');
  const [document, setDocument] = useState('');
  const [plan, setPlan] = useState('Profissional');
  const [userName, setUserName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [seedSampleData, setSeedSampleData] = useState(true);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin({ email: loginEmail, password: loginPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onRegisterCompany({
        organizationName: orgName,
        document,
        plan,
        userName,
        email: regEmail,
        password: regPassword,
        seedSampleData
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#5B4FE9] flex items-center justify-center text-white shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-2xl tracking-tight font-bold text-slate-900">
            plantão<span className="text-[#5B4FE9]">em dia</span>
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
          {mode === 'login'
            ? 'Acesse o painel da sua empresa'
            : 'Cadastre sua empresa no Plantão em Dia'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Entre com seu e-mail corporativo e senha para gerenciar suas escalas.'
            : 'Crie o ambiente exclusivo da sua empresa e organize suas escalas e checagens.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-5 sm:px-8 shadow-sm rounded-2xl border border-slate-200/90">
          {/* Seletor Entrar / Cadastrar Empresa */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#5B4FE9] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Entrar com E-mail</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#5B4FE9] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Criar Conta Empresa</span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  E-mail corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seuemail@empresa.com.br"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5B4FE9] text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span>{loading ? 'Autenticando...' : 'Entrar no painel'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reg-org-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nome da sua Empresa *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ex: Cuidare Home Care"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-user-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Seu Nome (Coordenador/Admin) *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-user-name"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Ex: Juliana Alves"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-plan"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Plano
                  </label>
                  <select
                    id="reg-plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Profissional">Profissional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-doc"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  CNPJ / Identificador (Opcional)
                </label>
                <input
                  id="reg-doc"
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  E-mail de acesso da empresa *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="coordenacao@suaempresa.com.br"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Crie uma senha *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedSampleData}
                  onChange={(e) => setSeedSampleData(e.target.checked)}
                  className="mt-0.5 rounded border-indigo-300 text-[#5B4FE9] focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-indigo-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#5B4FE9]" />
                    Incluir casas e plantões fictícios de exemplo
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Desmarque se quiser começar com a conta da empresa totalmente vazia.
                  </p>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5B4FE9] text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span>{loading ? 'Criando conta...' : 'Cadastrar Empresa e Entrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
