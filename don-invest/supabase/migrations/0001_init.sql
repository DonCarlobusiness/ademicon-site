-- DON INVEST — esquema inicial (Fase 2: ainda não conectado ao app).
-- Datas em UTC (timestamptz). Separação explícita entre dado externo, entrada manual e inferência.

create type data_origin as enum ('externo_api', 'publicacao_oficial', 'regra_catalogada', 'entrada_manual', 'inferencia');

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now()
);

create table investor_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective text not null,
  horizons text[] not null,
  liquidity_need text not null,
  has_emergency_reserve text not null,
  max_tolerable_loss_pct numeric not null,
  region_preference text not null,
  is_preliminary boolean not null default true,
  updated_at timestamptz not null default now()
);

create table research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  capital_brl numeric not null check (capital_brl > 0),
  input jsonb not null,
  status text not null check (status in ('completo', 'parcial', 'indisponivel')),
  created_at timestamptz not null default now()
);

create table source_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_runs(id) on delete cascade,
  source_key text not null,
  provider text not null,
  url text not null,
  origin data_origin not null,
  collected_at timestamptz not null,
  reference_at timestamptz,
  freshness text not null,
  confidence numeric not null check (confidence between 0 and 1)
);

create table instruments (
  id text primary key,
  name text not null,
  category text not null,
  issuer text,
  currency text not null,
  maturity date
);

create table market_snapshots (
  id uuid primary key default gen_random_uuid(),
  instrument_id text not null references instruments(id),
  source_record_id uuid references source_records(id) on delete set null,
  origin data_origin not null,
  rate_pct numeric,
  price numeric,
  reference_at timestamptz not null,
  collected_at timestamptz not null default now()
);

create table institution_terms (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  field text not null,
  value text not null,
  status text not null check (status in ('verificado_api', 'regra_catalogada', 'nao_verificado')),
  official_url text,
  last_checked_at timestamptz
);

create table analysis_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_runs(id) on delete cascade,
  report jsonb not null,
  llm_synthesis text, -- interpretação de IA separada dos dados observados
  created_at timestamptz not null default now()
);

create table risk_assessments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_runs(id) on delete cascade,
  instrument_id text not null,
  horizon text not null,
  eligible boolean not null,
  vetoes text[] not null default '{}',
  score integer,
  origin data_origin not null default 'inferencia'
);

create table simulation_scenarios (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references research_runs(id) on delete cascade,
  instrument_id text not null,
  horizon text not null,
  assumptions jsonb not null, -- hipóteses editáveis
  result jsonb not null,
  origin data_origin not null default 'inferencia'
);

-- RLS: cada usuário vê apenas os próprios dados.
alter table user_profiles enable row level security;
alter table investor_preferences enable row level security;
alter table research_runs enable row level security;
alter table source_records enable row level security;
alter table analysis_reports enable row level security;
alter table risk_assessments enable row level security;
alter table simulation_scenarios enable row level security;
alter table instruments enable row level security;
alter table market_snapshots enable row level security;
alter table institution_terms enable row level security;

create policy own_profile on user_profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_prefs on investor_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_runs on research_runs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_sources on source_records for select using (exists (select 1 from research_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy own_reports on analysis_reports for select using (exists (select 1 from research_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy own_risk on risk_assessments for select using (exists (select 1 from research_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy own_sims on simulation_scenarios for select using (exists (select 1 from research_runs r where r.id = run_id and r.user_id = auth.uid()));
-- Dados de mercado públicos: leitura para autenticados; escrita só via service role.
create policy read_instruments on instruments for select to authenticated using (true);
create policy read_snapshots on market_snapshots for select to authenticated using (true);
create policy read_terms on institution_terms for select to authenticated using (true);
