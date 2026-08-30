# Terra Oeste — Radar Agro Financeiro

Plataforma de inteligência financeira e prospecção estratégica para o
agronegócio. Reúne empresas com sinais públicos de endividamento,
recuperação judicial ou reestruturação, organiza esses sinais em um
radar priorizado por score, e dá suporte a um pipeline comercial (CRM)
para qualificar oportunidades — **sem nunca inferir automaticamente que
um passivo público é "dívida rural confirmada"**.

Esta pasta é a v2 do produto: reconstrução completa do protótipo
HTML/CSS/JS original (`Radar_Agro_Financeiro_Profissional.html`),
mantendo 100% de compatibilidade de execução (abre direto num
navegador, sem build) e elevando o nível de arquitetura, visual e
integridade de dados.

## Como rodar

Como o app usa ES Modules (`<script type="module">`), ele precisa ser
servido por HTTP — abrir o `index.html` direto via `file://` não
funciona (CORS bloqueia os `import`).

```bash
cd radar-agro-financeiro
python3 -m http.server 8080
# abrir http://localhost:8080
```

Qualquer outro servidor estático (`npx serve`, `live-server` etc.)
funciona igualmente. Não há passo de build.

## Estrutura de arquivos

```
radar-agro-financeiro/
├── index.html                  # shell: sidebar, topbar, containers de view, drawer, toasts
├── css/
│   ├── tokens.css              # paleta, tipografia, raio, sombra, timing — a "fonte da verdade" visual
│   ├── base.css                # reset, tipografia base, scrollbar, foco
│   ├── layout.css              # grid da sidebar/topbar/coluna principal, responsividade de shell
│   └── components.css          # botões, cards, KPIs, tabela, badges, drawer, modal, kanban, import, toast
└── js/
    ├── app.js                  # bootstrap, rotas (hash router), sidebar, topbar, status do sistema
    ├── data/
    │   ├── schema.js            # modelo de dados, helpers de CNPJ, regra de "dívida rural confirmada"
    │   ├── seed.js               # base pesquisada (preservada do protótipo original)
    │   └── store.js              # estado central (pub/sub), merge não-destrutivo, localStorage
    ├── services/
    │   ├── scoring.js            # motor de score 0–100
    │   ├── importer.js           # parsing CSV/XLSX, auto-mapeamento, validação, dedupe
    │   └── exporter.js           # exportação CSV/XLSX
    └── ui/
        ├── helpers.js             # esc(), toast(), badges, ícones, formatação
        ├── opportunityTable.js    # tabela avançada reutilizada por Radar/Empresas/RJ/Passivos
        ├── filtersPanel.js        # painel de filtros avançados (modal)
        ├── exportPanel.js         # painel de exportação (escopo × formato)
        ├── dossie.js               # drawer do dossiê empresarial (5 abas)
        └── views/
            ├── overview.js, radar.js, companies.js, recuperacaoJudicial.js,
            ├── passivosPublicos.js, creditoRural.js, importar.js, crm.js,
            └── fontes.js, settings.js
```

Cada view é uma função `render(container) → cleanup?`, chamada pelo
router em `app.js`. A tabela de oportunidades é o único componente
pesado e é **reutilizada** (não duplicada) em quatro telas diferentes
via um `presetFilter`.

## Regra central: sinal público ≠ dívida rural confirmada

Isso está codificado em `js/data/schema.js`:

```js
export function isConfirmedRuralDebt(company) {
  return !!(company.confirmedRuralDebt && company.hasDocumentaryEvidence);
}
```

Um registro só é exibido como "Dívida rural confirmada" (badge dourado)
quando **os dois campos** são verdadeiros. Todo o resto — inclusive
100% da base pesquisada atual, que vem de sinais públicos de
recuperação judicial — aparece como "Sinal público — não confirmado".
Isso é deliberado e não deve ser "otimizado" para simplificar a UI.

## Import não-destrutivo

Um bug real foi encontrado e corrigido durante o desenvolvimento: a
primeira versão do importador preenchia valores padrão (`segmento:
'Base importada'`, `signal: 'Registro Importado'` etc.) mesmo quando a
planilha não trazia aquela coluna, e esses defaults *sobrescreviam*
dados melhores já existentes (ex.: um sinal real de "Recuperação
Judicial" virava "Registro Importado" só porque a planilha do usuário
não tinha coluna de sinal). A correção (`js/services/importer.js`):

- `rowToCompany()` agora gera um **patch parcial** — só os campos
  mapeados pelo usuário ficam preenchidos.
- Defaults (`withNewCompanyDefaults`) só são aplicados quando o CNPJ é
  **inédito** na base.
- `store.js → mergePreferBetter()` nunca deixa um campo vazio
  sobrescrever um campo já preenchido.

## Modelo de dados (PostgreSQL / Supabase)

Hoje a persistência é local (`localStorage`), mas o formato dos objetos
já espelha o modelo relacional abaixo — migrar significa trocar
`js/data/store.js` por chamadas a uma API, sem reescrever as views.

```sql
-- CNPJ é sempre TEXT: nunca NUMERIC. Preparado para o formato
-- alfanumérico que a Receita Federal está introduzindo.
create table companies (
  id                  uuid primary key default gen_random_uuid(),
  cnpj                text not null unique,
  razao_social        text not null,
  nome_fantasia       text,
  status_cadastral    text not null default 'ATIVA',
  municipio           text,
  uf                  char(2),
  segmento            text,
  cnae_principal      text,
  cnae_descricao      text,
  cnaes_secundarios   text[] default '{}',
  porte               text,
  capital_social      numeric(18,2),
  data_abertura       date,
  responsavel         text,
  quadro_societario   jsonb default '[]',
  score               integer not null default 0,
  origem              text not null default 'importado', -- 'pesquisado' | 'importado'
  opt_out             boolean not null default false,
  nao_contatar        boolean not null default false,
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index companies_uf_idx on companies (uf);
create index companies_score_idx on companies (score desc);
create index companies_cnae_idx on companies (cnae_principal);

create table company_contacts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  telefone      text,
  whatsapp      text,
  email         text,
  site          text,
  is_primary    boolean default true
);

create table company_owners (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  nome          text not null,
  papel         text -- sócio, administrador, etc.
);

create table financial_signals (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references companies(id) on delete cascade,
  signal_type              text not null, -- 'Recuperação Judicial', 'Dívida Ativa da União', ...
  confirmed_rural_debt     boolean not null default false,
  has_documentary_evidence boolean not null default false,
  passivo_descricao        text,
  passivo_valor            numeric(18,2),
  processo_numero          text,
  tribunal                 text,
  published_at             date,
  data_source_id           uuid references data_sources(id),
  created_at               timestamptz not null default now()
);

create table data_sources (
  id             uuid primary key default gen_random_uuid(),
  source_name    text not null,
  source_url     text,
  collected_at   timestamptz not null default now(),
  published_at   date,
  confidence     text not null default 'baixa', -- 'alta' | 'media' | 'baixa'
  data_type      text not null -- 'cadastral' | 'sinal judicial' | 'importado' | ...
);

create table crm_leads (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade unique,
  status             text not null default 'Novo Lead',
  responsavel        text,
  ultima_interacao   date,
  proxima_acao       text,
  notas              text,
  updated_at         timestamptz not null default now()
);

create table crm_interactions (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references crm_leads(id) on delete cascade,
  detail       text not null,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) -- Supabase Auth
);

create table imports (
  id             uuid primary key default gen_random_uuid(),
  file_name      text not null,
  imported_by    uuid references auth.users(id),
  imported_count integer not null default 0,
  updated_count  integer not null default 0,
  duplicated     integer not null default 0,
  errors         integer not null default 0,
  created_at     timestamptz not null default now()
);

create table import_rows (
  id           uuid primary key default gen_random_uuid(),
  import_id    uuid not null references imports(id) on delete cascade,
  raw_row      jsonb not null,
  status       text not null, -- 'imported' | 'updated' | 'duplicated' | 'error'
  error_reason text,
  company_id   uuid references companies(id)
);

create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  target       text,
  detail       text,
  actor_id     uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create table search_jobs (
  id            uuid primary key default gen_random_uuid(),
  source_name   text not null,
  status        text not null default 'pending', -- 'pending' | 'running' | 'success' | 'failed'
  started_at    timestamptz,
  finished_at   timestamptz,
  error_message text,
  retry_count   integer not null default 0
);
```

Com Supabase, `audit_logs`, `crm_interactions` e `import_rows` também
servem como trilha de auditoria nativa via Row Level Security — cada
usuário autenticado só vê/edita o que sua política permitir.

## Proposta de migração para Next.js + TypeScript

O app atual é deliberadamente zero-build para poder ser aberto e
avaliado imediatamente. Para produção como SaaS multiusuário, a
recomendação é:

1. **Next.js (App Router) + TypeScript** — cada view atual
   (`js/ui/views/*.js`) vira uma rota (`app/(dashboard)/radar/page.tsx`
   etc.); `opportunityTable.js` vira um componente de tabela genérico
   com props tipadas em vez de closures sobre `container`.
2. **Banco de dados**: Postgres via Supabase, usando o schema acima.
   `store.js` é substituído por hooks de dados (TanStack Query) que
   chamam rotas de API ou o client Supabase diretamente.
3. **Auth**: Supabase Auth ou Better-Auth, com RLS por usuário/equipe —
   hoje o app roda em modo single-user local (ver Configurações →
   "Controle de acesso").
4. **Importação**: mover o parsing de planilha para uma Edge
   Function/Route Handler, permitindo arquivos maiores e importação
   assíncrona com progresso.
5. **Jobs agendados**: `search_jobs` alimenta um worker (Vercel Cron ou
   fila dedicada) para atualização periódica de fontes, com retry e
   histórico de falha por fonte — a UI de "Atualizar dados" já está
   desenhada para consumir esse histórico.
6. **Design system**: os tokens de `css/tokens.css` migram 1:1 para
   variáveis Tailwind (`tailwind.config.ts`), preservando a identidade
   visual exatamente como está.

Nenhuma dessas mudanças altera a UX ou o modelo de dados definidos
aqui — a v2 atual já foi desenhada para ser a "casca" desse produto
final.

## Pontos de melhoria conscientes (débito técnico da v1 estática)

- Persistência em `localStorage` é por navegador/dispositivo — não há
  hoje sincronização entre usuários (resolvido pela migração acima).
- A tela "Inteligência de Crédito Rural" está com a integração
  Banco Central/SICOR/MDCR ainda não conectada — a UI já está pronta
  para recebê-la (ver `js/ui/views/creditoRural.js`).
- O motor de atualização (`btnRefresh`) hoje só marca
  `lastUpdate`/gera log de auditoria; não há execução real de coleta —
  é o ponto de entrada para os `search_jobs` da migração.
- Autenticação e controle de acesso por papel estão sinalizados na UI
  ("Configurações → Controle de acesso: Em preparação") mas não
  implementados nesta fase estática.
