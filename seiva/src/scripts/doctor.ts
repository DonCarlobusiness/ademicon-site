/**
 * `npm run doctor` — diz exatamente o que falta para o SEIVA funcionar.
 *
 * Checa config e conectividade de cada integracao e separa o que e
 * BLOQUEANTE (sem isso nao atende ninguem) do que e opcional (degrada uma
 * funcionalidade). Nao usa a config validada de env.ts de proposito: aqui
 * queremos listar TUDO que falta, nao morrer no primeiro campo vazio.
 */
import { request } from 'undici';
import pg from 'pg';

type Level = 'bloqueante' | 'degrada' | 'ok';
interface Check { name: string; level: Level; detail: string; fix?: string }

const results: Check[] = [];
const add = (c: Check): void => { results.push(c); };
const has = (v: string | undefined) => typeof v === 'string' && v.trim().length > 0;

const E = process.env;

async function checkAnthropic(): Promise<void> {
  if (!has(E.ANTHROPIC_API_KEY)) {
    return add({
      name: 'Anthropic (Claude)', level: 'bloqueante',
      detail: 'ANTHROPIC_API_KEY nao definida — o agente nao responde nada',
      fix: 'Pegue em console.anthropic.com > API keys e coloque no .env',
    });
  }
  try {
    const res = await request('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': E.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      headersTimeout: 15_000, bodyTimeout: 15_000,
    });
    if (res.statusCode === 200) {
      add({ name: 'Anthropic (Claude)', level: 'ok', detail: `chave valida, modelo ${E.SEIVA_MODEL ?? 'claude-opus-5'}` });
    } else {
      add({
        name: 'Anthropic (Claude)', level: 'bloqueante',
        detail: `a API respondeu HTTP ${res.statusCode}`,
        fix: res.statusCode === 401 ? 'Chave invalida ou revogada' : 'Verifique credito e limites da conta',
      });
    }
  } catch (err) {
    add({ name: 'Anthropic (Claude)', level: 'bloqueante', detail: `sem conexao: ${String(err)}` });
  }
}

async function checkDatabase(): Promise<void> {
  if (!has(E.DATABASE_URL)) {
    return add({
      name: 'Postgres + PostGIS', level: 'bloqueante',
      detail: 'DATABASE_URL nao definida',
      fix: 'docker compose up -d db  (e DATABASE_URL=postgres://seiva:seiva@localhost:5432/seiva)',
    });
  }
  const pool = new pg.Pool({ connectionString: E.DATABASE_URL, connectionTimeoutMillis: 5_000 });
  try {
    const gis = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'postgis'");
    if (gis.rowCount === 0) {
      add({
        name: 'Postgres + PostGIS', level: 'bloqueante',
        detail: 'conectou, mas a extensao PostGIS nao esta instalada',
        fix: 'npm run migrate (ou use a imagem postgis/postgis)',
      });
    } else {
      const tables = await pool.query(
        `SELECT count(*)::int AS n FROM information_schema.tables
          WHERE table_schema='public' AND table_name IN ('producers','fields','conversations')`,
      );
      if ((tables.rows[0]?.n ?? 0) < 3) {
        add({
          name: 'Postgres + PostGIS', level: 'bloqueante',
          detail: 'banco acessivel mas sem o schema do SEIVA',
          fix: 'npm run migrate',
        });
      } else {
        add({ name: 'Postgres + PostGIS', level: 'ok', detail: 'conectado, PostGIS ativo, schema aplicado' });
      }
    }
  } catch (err) {
    add({
      name: 'Postgres + PostGIS', level: 'bloqueante',
      detail: `nao conectou: ${err instanceof Error ? err.message : String(err)}`,
      fix: 'docker compose up -d db',
    });
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function checkWhatsApp(): Promise<void> {
  const missing = (['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'] as const)
    .filter((k) => !has(E[k]));
  if (missing.length > 0) {
    return add({
      name: 'WhatsApp (Meta Cloud API)', level: 'bloqueante',
      detail: `faltando: ${missing.join(', ')}`,
      fix: 'developers.facebook.com > seu app > WhatsApp > API Setup. Veja SETUP.md',
    });
  }
  if (!has(E.WHATSAPP_APP_SECRET)) {
    add({
      name: 'WhatsApp: assinatura', level: E.NODE_ENV === 'production' ? 'bloqueante' : 'degrada',
      detail: 'WHATSAPP_APP_SECRET ausente — webhook aceita qualquer POST',
      fix: 'App Settings > Basic > App Secret. Obrigatorio em producao',
    });
  }
  try {
    const v = E.WHATSAPP_GRAPH_VERSION ?? 'v21.0';
    const res = await request(`https://graph.facebook.com/${v}/${E.WHATSAPP_PHONE_NUMBER_ID}`, {
      headers: { authorization: `Bearer ${E.WHATSAPP_TOKEN}` },
      headersTimeout: 15_000, bodyTimeout: 15_000,
    });
    const body = (await res.body.json()) as { display_phone_number?: string; error?: { message?: string } };
    if (res.statusCode === 200) {
      add({
        name: 'WhatsApp (Meta Cloud API)', level: 'ok',
        detail: `numero ${body.display_phone_number ?? E.WHATSAPP_PHONE_NUMBER_ID} acessivel`,
      });
    } else {
      add({
        name: 'WhatsApp (Meta Cloud API)', level: 'bloqueante',
        detail: `Graph API HTTP ${res.statusCode}: ${body.error?.message ?? 'erro'}`,
        fix: 'Token temporario expira em 24h. Gere um token permanente (SETUP.md)',
      });
    }
  } catch (err) {
    add({ name: 'WhatsApp (Meta Cloud API)', level: 'bloqueante', detail: `sem conexao: ${String(err)}` });
  }
}

async function checkSentinel(): Promise<void> {
  if (!has(E.SENTINEL_HUB_CLIENT_ID) || !has(E.SENTINEL_HUB_CLIENT_SECRET)) {
    return add({
      name: 'Satelite (Sentinel Hub)', level: 'degrada',
      detail: 'sem credencial — NDVI e o mapa do talhao ficam indisponiveis',
      fix: 'Conta gratis em dataspace.copernicus.eu, crie um OAuth client. Veja SETUP.md',
    });
  }
  try {
    const base = E.SENTINEL_HUB_BASE_URL ?? 'https://services.sentinel-hub.com';
    const res = await request(`${base}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: E.SENTINEL_HUB_CLIENT_ID!,
        client_secret: E.SENTINEL_HUB_CLIENT_SECRET!,
      }).toString(),
      headersTimeout: 15_000, bodyTimeout: 15_000,
    });
    add(res.statusCode === 200
      ? { name: 'Satelite (Sentinel Hub)', level: 'ok', detail: 'autenticou com sucesso' }
      : { name: 'Satelite (Sentinel Hub)', level: 'degrada', detail: `token HTTP ${res.statusCode}`, fix: 'Confira client id/secret' });
  } catch (err) {
    add({ name: 'Satelite (Sentinel Hub)', level: 'degrada', detail: `sem conexao: ${String(err)}` });
  }
}

async function checkWeather(): Promise<void> {
  try {
    const base = E.OPEN_METEO_BASE_URL ?? 'https://api.open-meteo.com';
    const res = await request(`${base}/v1/forecast?latitude=-12.5&longitude=-55.7&daily=precipitation_sum&forecast_days=1&timezone=auto`, {
      headersTimeout: 12_000, bodyTimeout: 12_000,
    });
    add(res.statusCode === 200
      ? { name: 'Clima (Open-Meteo)', level: 'ok', detail: 'respondendo (nao precisa de chave)' }
      : { name: 'Clima (Open-Meteo)', level: 'degrada', detail: `HTTP ${res.statusCode}` });
  } catch (err) {
    add({ name: 'Clima (Open-Meteo)', level: 'degrada', detail: `sem conexao: ${String(err)}` });
  }
}

function checkAudio(): void {
  const stt = E.STT_PROVIDER ?? 'none';
  add(stt === 'none' || !has(E.STT_BASE_URL)
    ? {
        name: 'Audio: transcricao (STT)', level: 'degrada',
        detail: 'desligado — audio do produtor nao e entendido',
        fix: 'docker compose --profile audio up -d stt  e STT_PROVIDER=whisper_local, STT_BASE_URL=http://localhost:9000',
      }
    : { name: 'Audio: transcricao (STT)', level: 'ok', detail: `${stt} em ${E.STT_BASE_URL}` });

  const tts = E.TTS_PROVIDER ?? 'none';
  add(tts === 'none' || !has(E.TTS_BASE_URL)
    ? {
        name: 'Audio: resposta falada (TTS)', level: 'degrada',
        detail: 'desligado — responde em texto mesmo quando recebe audio',
        fix: 'docker compose --profile audio up -d tts  e TTS_PROVIDER=http, TTS_BASE_URL=http://localhost:5002',
      }
    : { name: 'Audio: resposta falada (TTS)', level: 'ok', detail: `${tts} em ${E.TTS_BASE_URL}` });
}

function checkRedis(): void {
  add(has(E.REDIS_URL)
    ? { name: 'Redis (alertas proativos)', level: 'ok', detail: E.REDIS_URL! }
    : {
        name: 'Redis (alertas proativos)', level: 'degrada',
        detail: 'REDIS_URL ausente — sem alerta de geada, seca e queda de NDVI',
        fix: 'docker compose up -d redis',
      });
}

function checkMarket(): void {
  add(has(E.MARKET_PRICE_BASE_URL)
    ? { name: 'Preco spot', level: 'ok', detail: E.MARKET_PRICE_BASE_URL! }
    : {
        name: 'Preco spot', level: 'degrada',
        detail: 'sem feed — o agente responde "nao tenho cotacao" em vez de chutar preco',
        fix: 'Opcional. Contrate um feed (CEPEA/B3/corretora) e defina MARKET_PRICE_BASE_URL',
      });
}

const ICON: Record<Level, string> = { ok: '  OK  ', degrada: ' AVISO', bloqueante: ' FALTA' };

await Promise.all([checkAnthropic(), checkDatabase(), checkWhatsApp(), checkSentinel(), checkWeather()]);
checkAudio();
checkRedis();
checkMarket();

console.log('\n  SEIVA — diagnostico de configuracao\n');
for (const r of results) {
  console.log(`[${ICON[r.level]}] ${r.name}`);
  console.log(`         ${r.detail}`);
  if (r.fix && r.level !== 'ok') console.log(`         -> ${r.fix}`);
}

const blockers = results.filter((r) => r.level === 'bloqueante');
const warnings = results.filter((r) => r.level === 'degrada');

console.log('');
if (blockers.length === 0) {
  console.log(`  Pronto para atender. ${warnings.length} funcionalidade(s) degradada(s).`);
  console.log('  Suba com: npm start');
} else {
  console.log(`  ${blockers.length} item(ns) BLOQUEANTE(S): ${blockers.map((b) => b.name).join(', ')}`);
  console.log('  Sem eles o SEIVA nao atende ninguem. Veja SETUP.md.');
}
console.log('');
process.exit(blockers.length === 0 ? 0 : 1);
