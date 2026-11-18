# Plantão em Dia — SaaS Multi-tenant de Escalas e Checagens

Aplicação web e mobile-first em português do Brasil com arquitetura **SaaS Multi-tenant (Multi-empresa)** para organizar escalas semanais de trabalho (cuidadores / equipes de saúde residencial) e acompanhar checagens de plantão por empresa, casa, pessoa assistida, data e turno.

> **Aviso importante:** Todos os nomes de empresas, casas, pessoas assistidas, endereços e telefones pré-cadastrados são **100% fictícios e meramente demonstrativos**.

---

## Arquitetura SaaS Multi-tenant (Isolamento por Empresa)

Cada empresa cadastrada no sistema possui seu próprio ambiente isolado (**Tenant / Organization**):
- **Tabelas `organizations`, `users` e `sessions`:** Gerenciam as empresas clientes do SaaS, seus planos (`Starter`, `Profissional`, `Enterprise`), usuários administradores e tokens de sessão.
- **Isolamento por `organization_id`:** Todas as tabelas de domínio (`houses`, `professionals`, `shifts`, `checks`) possuem chave estrangeira `organization_id`, garantindo que a **Empresa A** nunca visualize nem altere dados da **Empresa B**.
- **2 Empresas Demonstrativas Pré-configuradas:**
  1. **Cuidar Bem Home Care** (`admin@cuidarbem.com.br` / senha: `123456`) — 8 casas, 8 profissionais e 24 plantões na semana.
  2. **Vida Plena Assistência Sênior** (`contato@vidaplena.com.br` / senha: `123456`) — 5 casas, 4 profissionais e escala própria totalmente independente.
- **Cadastro de Novas Empresas (Onboarding SaaS):** Pelo próprio botão seletor de empresa no topo ou na barra lateral, você pode cadastrar uma 3ª empresa do zero (ou já com dados iniciais de exemplo).

---

## Tecnologias Utilizadas

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons (Design responsivo Desktop + Mobile-first com barra inferior fixa, cartões mobile e modais em *bottom sheet*)
- **Backend:** Node.js + Express + TypeScript
- **Banco de Dados:** SQLite (`node:sqlite` nativo com migrações SQL em `001_initial_schema.sql` e `002_multi_tenant_saas.sql`)

---

## Como Instalar e Executar em Desenvolvimento

### 1. Configurar e iniciar o Backend (API + SQLite)

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

O servidor iniciará em `http://localhost:3001`.

### 2. Configurar e iniciar o Frontend (React + Vite)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse no navegador em: **`http://localhost:5173`**

---

## Endpoints Principais da API REST

- **Autenticação & Multi-tenant (`/api/auth`):**
  - `GET /api/auth/tenants` — Lista as empresas cadastradas no SaaS.
  - `GET /api/auth/me` — Retorna a empresa e o usuário autenticado atual.
  - `POST /api/auth/register` — Cadastra uma nova empresa + usuário administrador no SaaS.
  - `POST /api/auth/login` — Autentica por e-mail e senha e retorna token de sessão.
  - `POST /api/auth/switch-tenant` — Alterna rapidamente entre empresas no ambiente demonstrativo.
- **Domínio (isolados por `organization_id`):**
  - `GET /api/summary` — Resumo de plantões da semana, casas atendidas, checagens pendentes e plantões 24h/48h da empresa ativa.
  - `GET/POST/PUT/DELETE /api/houses` — CRUD de casas da empresa ativa.
  - `GET/POST/PUT/DELETE /api/professionals` — CRUD da equipe da empresa ativa.
  - `GET/POST/PUT/DELETE /api/shifts` — CRUD de escalas da empresa ativa.
  - `GET /api/checks` e `POST /api/checks/toggle` — Checagens de plantão da empresa ativa.
