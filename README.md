# Plantão em Dia — SaaS Multi-tenant de Escalas e Checagens (Neon Lakebase Postgres)

Aplicação web e mobile-first em português do Brasil com arquitetura **SaaS Multi-tenant (Multi-empresa)** e banco de dados na nuvem **Lakebase Postgres (Neon)** para organizar escalas semanais de trabalho e acompanhar checagens de plantão por empresa, casa, pessoa assistida, data e turno.

---

## Tecnologias Utilizadas

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + `xlsx-js-style` (Importação e exportação de planilhas Excel coloridas)
- **Backend:** Node.js + Express + TypeScript + `pg` (`node-postgres`)
- **Banco de Dados:** **Lakebase Postgres no Neon** (usando conexão *Pooled* `DATABASE_URL` para tráfego da aplicação e conexão *Direct* `DATABASE_URL_UNPOOLED` para migrações SQL)
- **Infraestrutura como Código:** `neon.ts` (`@neon/config`)

---

## Como Configurar e Executar em Desenvolvimento

### 1. Provisionar / Sincronizar Variáveis do Neon

Na raiz do projeto:

```bash
neon deploy
```

Isso garante que o branch do projeto no Neon (`sparkling-cloud-36906969`) esteja sincronizado com `neon.ts` e atualiza `.env.local` com `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.

### 2. Iniciar o Backend (API + Neon Postgres)

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

O servidor iniciará em `http://localhost:3001`.

### 3. Iniciar o Frontend (React + Vite)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse no navegador em: **`http://localhost:5173`**

---

## Build de Produção (Raiz do Projeto)

```bash
npm run build
```
