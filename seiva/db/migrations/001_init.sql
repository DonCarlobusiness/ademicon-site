-- SEIVA — esquema inicial
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- produtores
CREATE TABLE IF NOT EXISTS producers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id            text NOT NULL UNIQUE,            -- E.164 sem '+'
  name             text,
  municipality     text,
  uf               char(2),
  locale           text NOT NULL DEFAULT 'pt-BR'
                   CHECK (locale IN ('pt-BR','es-419','en')),
  -- LGPD: sem consentimento nao persistimos talhao nem historico.
  lgpd_consent_at  timestamptz,
  onboarding_step  text NOT NULL DEFAULT 'consent'
                   CHECK (onboarding_step IN ('consent','name','location','crop','area','done')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------- talhoes
CREATE TABLE IF NOT EXISTS fields (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id  uuid NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT 'Talhao 1',
  crop         text NOT NULL,
  area_ha      numeric(10,2) NOT NULL CHECK (area_ha > 0),
  centroid     geography(Point,4326) NOT NULL,
  -- Poligono real quando o produtor desenha; NULL quando so mandou o pin
  -- (nesse caso derivamos um circulo com a area informada).
  geom         geography(Polygon,4326),
  planted_at   date,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fields_producer_idx ON fields(producer_id);
CREATE INDEX IF NOT EXISTS fields_centroid_gix ON fields USING GIST (centroid);

-- ------------------------------------------------- historico de conversa (IA)
-- Guarda os blocos da Messages API na integra (inclui tool_use/tool_result),
-- que e o que o loop precisa reenviar na proxima mensagem do produtor.
CREATE TABLE IF NOT EXISTS conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id  uuid NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('user','assistant')),
  content      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_producer_idx
  ON conversations(producer_id, created_at DESC);

-- ------------------------------------------------ idempotencia do webhook
-- A Meta reentrega o mesmo evento em caso de timeout; sem isto o produtor
-- recebe a resposta duas vezes.
CREATE TABLE IF NOT EXISTS processed_messages (
  provider_message_id text PRIMARY KEY,
  processed_at        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------- leituras de satelite
CREATE TABLE IF NOT EXISTS ndvi_readings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id     uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  index_name   text NOT NULL CHECK (index_name IN ('NDVI','NDRE')),
  acquired_at  date NOT NULL,
  cloud_cover  numeric(4,3) NOT NULL,
  mean         numeric(6,4) NOT NULL,
  min          numeric(6,4),
  max          numeric(6,4),
  stdev        numeric(6,4),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, index_name, acquired_at)
);

-- --------------------------------------------------------- analise de solo
CREATE TABLE IF NOT EXISTS soil_analyses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  sampled_at  date,
  data        jsonb NOT NULL,   -- SoilAnalysis
  source      text NOT NULL DEFAULT 'ocr' CHECK (source IN ('ocr','manual','regional')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------- alertas proativos
-- Uma linha por alerta enviado, para nao repetir o mesmo aviso todo dia.
CREATE TABLE IF NOT EXISTS alerts_sent (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  dedupe_key  text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, kind, dedupe_key)
);
