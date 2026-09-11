-- =============================================================================
-- SiteHunter AI — Esquema PostgreSQL / Supabase
--
-- A aplicação hoje persiste em localStorage (js/store.js). Este arquivo é o
-- espelho relacional dessa estrutura: ao migrar, apenas os métodos de acesso de
-- store.js precisam ser reescritos — nenhuma tela muda.
--
-- Execute no editor SQL do Supabase ou via psql.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- users
-- Com Supabase Auth, esta tabela é o perfil que estende auth.users.
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,                       -- referencia auth.users(id)
  nome          text not null,
  email         text not null unique,
  telefone      text,
  empresa       text,                              -- marca do consultor, usada nas propostas
  plano         text not null default 'free',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- companies — empresas prospectadas
-- -----------------------------------------------------------------------------
create table if not exists public.companies (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references public.users(id) on delete cascade,

  nome             text not null,                  -- nome fantasia
  razao_social     text,
  cnpj             text,
  cnae             text,
  cnae_descricao   text,
  segmento         text,
  porte            text check (porte in ('PEQUENO','MEDIO','GRANDE')),
  situacao         text default 'ATIVA',
  data_abertura    date,

  cep              text,
  endereco         text,
  bairro           text,
  cidade           text not null,
  uf               char(2) not null,
  latitude         numeric(10,7),                  -- via OpenStreetMap/Nominatim
  longitude        numeric(10,7),

  telefone         text,
  whatsapp         text,
  email            text,
  website          text,
  site_fraco       boolean not null default false,
  dominio_proprio  boolean not null default false,
  instagram        text,
  facebook         text,
  google_business  boolean not null default false,

  servicos         text[] not null default '{}',
  origem           text,                           -- 'Dados Abertos CNPJ', 'Importação CSV', ...
  descoberto_em    timestamptz not null default now(),

  -- Score materializado para permitir ordenação e filtro no banco.
  -- A fonte da verdade continua sendo o motor em js/score.js.
  score            smallint check (score between 0 and 100),
  score_faixa      text,

  removido_em      timestamptz,                    -- exclusão lógica (pedido de remoção)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint companies_cnpj_owner_unico unique (owner_id, cnpj)
);

create index if not exists companies_owner_idx     on public.companies (owner_id);
create index if not exists companies_uf_cidade_idx on public.companies (uf, cidade);
create index if not exists companies_segmento_idx  on public.companies (segmento);
create index if not exists companies_score_idx     on public.companies (score desc);
create index if not exists companies_sem_site_idx  on public.companies (owner_id) where website is null;

-- -----------------------------------------------------------------------------
-- digital_audits — diagnóstico de presença digital (histórico)
-- -----------------------------------------------------------------------------
create table if not exists public.digital_audits (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  indice         smallint not null check (indice between 0 and 100),
  score          smallint check (score between 0 and 100),
  score_faixa    text,
  itens          jsonb not null default '[]',      -- [{id,rotulo,estado,pts,max}]
  detalhes       jsonb not null default '[]',      -- justificativa item a item do score
  recomendacao   text,
  fonte          text,
  created_at     timestamptz not null default now()
);

create index if not exists audits_company_idx on public.digital_audits (company_id, created_at desc);

-- -----------------------------------------------------------------------------
-- leads — empresa dentro do funil comercial
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.users(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  estagio          text not null default 'novo'
                   check (estagio in ('novo','analisado','demo','contatado','respondeu',
                                      'reuniao','proposta','fechado','perdido')),
  valor_potencial  numeric(12,2) not null default 0,
  ultimo_contato   timestamptz,
  proxima_acao     text,
  notas            text,
  motivo_perda     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint leads_company_unico unique (owner_id, company_id)
);

create index if not exists leads_owner_estagio_idx on public.leads (owner_id, estagio);

-- -----------------------------------------------------------------------------
-- crm_events — trilha de auditoria do funil
-- -----------------------------------------------------------------------------
create table if not exists public.crm_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references public.leads(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  tipo        text not null,                        -- criacao | mudanca_estagio | mensagem | ...
  de          text,
  para        text,
  descricao   text,
  created_at  timestamptz not null default now()
);

create index if not exists crm_events_company_idx on public.crm_events (company_id, created_at desc);

-- -----------------------------------------------------------------------------
-- demos — sites de demonstração gerados
-- -----------------------------------------------------------------------------
create table if not exists public.demos (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.users(id) on delete cascade,
  company_id     uuid not null references public.companies(id) on delete cascade,
  slug           text not null,
  template       text not null default 'institucional',
  status         text not null default 'pronta' check (status in ('gerando','pronta','enviada','arquivada')),
  html           text,                              -- snapshot do HTML publicado
  url_publica    text,
  enviada_em     timestamptz,
  visualizacoes  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint demos_slug_unico unique (owner_id, slug)
);

create index if not exists demos_company_idx on public.demos (company_id);

-- -----------------------------------------------------------------------------
-- proposals — propostas comerciais
-- -----------------------------------------------------------------------------
create table if not exists public.proposals (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.users(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  pacote            text not null,                  -- essencial | profissional | premium | custom
  pacote_nome       text not null,
  valor             numeric(12,2) not null check (valor >= 0),
  prazo             text,
  itens             text[] not null default '{}',
  observacoes       text,
  status            text not null default 'rascunho'
                    check (status in ('rascunho','enviada','aceita','recusada','expirada')),
  valida_ate        date,
  -- Preenchidos pela integração de pagamento (Mercado Pago)
  pagamento_id      text,
  pagamento_status  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists proposals_owner_status_idx on public.proposals (owner_id, status);

-- -----------------------------------------------------------------------------
-- messages — abordagens geradas e enviadas
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  canal       text not null default 'whatsapp' check (canal in ('whatsapp','email','copia','sms')),
  estilo      text,                                 -- consultivo | direto | informal | premium | curto
  texto       text not null,
  enviada_em  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists messages_company_idx on public.messages (company_id, created_at desc);

-- -----------------------------------------------------------------------------
-- opt_outs — LGPD: contatos que pediram para não receber comunicações
-- O bloqueio é global por identificador, independentemente do owner.
-- -----------------------------------------------------------------------------
create table if not exists public.opt_outs (
  id             uuid primary key default gen_random_uuid(),
  identificador  text not null unique,              -- telefone só com dígitos, ou e-mail em minúsculas
  tipo           text not null check (tipo in ('telefone','email')),
  motivo         text,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Atualização automática de updated_at
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['users','companies','leads','demos','proposals'] loop
    execute format(
      'drop trigger if exists trg_%1$s_touch on public.%1$s;
       create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security — cada consultor enxerga apenas a própria base
-- -----------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.companies      enable row level security;
alter table public.digital_audits enable row level security;
alter table public.leads          enable row level security;
alter table public.crm_events     enable row level security;
alter table public.demos          enable row level security;
alter table public.proposals      enable row level security;
alter table public.messages       enable row level security;

-- Perfil próprio
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- Tabelas com owner_id direto
do $$
declare t text;
begin
  foreach t in array array['companies','leads','demos','proposals','messages'] loop
    execute format('drop policy if exists %1$s_owner on public.%1$s;', t);
    execute format(
      'create policy %1$s_owner on public.%1$s for all
         using (owner_id in (select id from public.users where auth_user_id = auth.uid()))
         with check (owner_id in (select id from public.users where auth_user_id = auth.uid()));', t);
  end loop;
end $$;

-- Tabelas filhas: herdam o acesso da empresa
drop policy if exists audits_owner on public.digital_audits;
create policy audits_owner on public.digital_audits for all
  using (company_id in (
    select c.id from public.companies c
    join public.users u on u.id = c.owner_id
    where u.auth_user_id = auth.uid()));

drop policy if exists crm_events_owner on public.crm_events;
create policy crm_events_owner on public.crm_events for all
  using (company_id in (
    select c.id from public.companies c
    join public.users u on u.id = c.owner_id
    where u.auth_user_id = auth.uid()));

-- opt_outs é consultado por todos os usuários autenticados (bloqueio global),
-- mas cada registro só pode ser criado, nunca editado por outro usuário.
alter table public.opt_outs enable row level security;
drop policy if exists opt_outs_leitura on public.opt_outs;
create policy opt_outs_leitura on public.opt_outs for select using (auth.role() = 'authenticated');
drop policy if exists opt_outs_insercao on public.opt_outs;
create policy opt_outs_insercao on public.opt_outs for insert with check (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- Visão de apoio: funil consolidado por consultor
-- -----------------------------------------------------------------------------
create or replace view public.v_funil as
select
  l.owner_id,
  count(*)                                                     as leads_total,
  count(*) filter (where l.estagio = 'contatado')              as contatados,
  count(*) filter (where l.estagio = 'respondeu')              as responderam,
  count(*) filter (where l.estagio = 'proposta')               as com_proposta,
  count(*) filter (where l.estagio = 'fechado')                as fechados,
  count(*) filter (where l.estagio = 'perdido')                as perdidos,
  coalesce(sum(l.valor_potencial) filter
    (where l.estagio not in ('fechado','perdido')), 0)         as potencial_aberto
from public.leads l
group by l.owner_id;
