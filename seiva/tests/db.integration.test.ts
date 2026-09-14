import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  findOrCreateProducer, updateProducer, createField, getPrimaryField,
  listAllFields, appendMessage, loadHistory, claimMessage, saveNdviReading,
  lastNdviReadings, saveSoilAnalysis, getLatestSoilAnalysis, claimAlert, deleteProducer,
  patchOnboardingData, clearOnboardingData,
} from '../src/db/repo.js';
import { closePool, query } from '../src/db/pool.js';
import { circleFromArea } from '../src/services/satellite/geo.js';

/**
 * Testes de integracao contra Postgres+PostGIS de verdade.
 *
 * Rodam so quando SEIVA_TEST_DB=1 (o CI e o `npm run test:db` ligam isso).
 * Sem banco real nao daria para pegar coisas como coluna ambigua em JOIN,
 * inversao de lat/lon no ST_MakePoint ou cascade de exclusao LGPD — nenhuma
 * delas aparece em teste unitario.
 */
const ENABLED = process.env.SEIVA_TEST_DB === '1';
const opts = { skip: ENABLED ? false : 'defina SEIVA_TEST_DB=1 e DATABASE_URL para rodar' };

const created: string[] = [];
const newWaId = () => `5566${Math.floor(Math.random() * 1e9)}`;

before(async () => {
  if (!ENABLED) return;
  await query('SELECT 1');
});

after(async () => {
  if (!ENABLED) return;
  for (const id of created) await deleteProducer(id).catch(() => undefined);
  await closePool();
});

async function producer(step = 'done' as const) {
  const p = await findOrCreateProducer(newWaId(), 'pt-BR');
  created.push(p.id);
  return updateProducer(p.id, { name: 'Joao', municipality: 'Sorriso', uf: 'MT', lgpdConsent: true, onboardingStep: step });
}

test('upsert de produtor nao duplica pelo mesmo telefone', opts, async () => {
  const wa = newWaId();
  const a = await findOrCreateProducer(wa, 'pt-BR');
  created.push(a.id);
  const b = await findOrCreateProducer(wa, 'pt-BR');
  assert.equal(b.id, a.id);
  assert.equal(a.onboardingStep, 'consent');
});

test('talhao por pin grava lat/lon na ordem certa', opts, async () => {
  // ST_MakePoint recebe (lon, lat). Trocar a ordem poe o talhao no oceano
  // e so aparece contra PostGIS real.
  const p = await producer();
  const centroid = { lat: -12.5453, lon: -55.7211 };
  const f = await createField({ producerId: p.id, crop: 'soja', areaHa: 30.5, centroid });
  assert.ok(Math.abs(f.centroid.lat - centroid.lat) < 1e-6, `lat veio ${f.centroid.lat}`);
  assert.ok(Math.abs(f.centroid.lon - centroid.lon) < 1e-6, `lon veio ${f.centroid.lon}`);
  assert.equal(f.areaHa, 30.5);
  assert.equal(f.geom, null);
});

test('poligono desenhado volta como GeoJSON valido', opts, async () => {
  const p = await producer();
  const centroid = { lat: -12.5, lon: -55.7 };
  const f = await createField({
    producerId: p.id, crop: 'milho', areaHa: 12, centroid, geom: circleFromArea(centroid, 12),
  });
  assert.equal(f.geom?.type, 'Polygon');
  assert.ok((f.geom?.coordinates[0]?.length ?? 0) > 30);
});

test('listAllFields faz JOIN sem coluna ambigua', opts, async () => {
  // Regressao: `id`/`name`/`created_at` existem em fields E producers.
  // Com colunas nao qualificadas o Postgres recusa (42702) e a varredura
  // diaria de alertas quebrava inteira.
  const p = await producer();
  const centroid = { lat: -12.5, lon: -55.7 };
  await createField({ producerId: p.id, crop: 'soja', areaHa: 30, centroid });

  const mine = (await listAllFields()).filter((f) => f.producerId === p.id);
  assert.equal(mine.length, 1);
  assert.equal(mine[0]!.waId, p.waId);
  assert.equal(mine[0]!.locale, 'pt-BR');
  assert.equal(mine[0]!.crop, 'soja');
});

test('varredura ignora quem nao deu consentimento LGPD', opts, async () => {
  const p = await findOrCreateProducer(newWaId(), 'pt-BR');
  created.push(p.id);
  await createField({ producerId: p.id, crop: 'soja', areaHa: 10, centroid: { lat: -12, lon: -55 } });
  const mine = (await listAllFields()).filter((f) => f.producerId === p.id);
  assert.equal(mine.length, 0, 'talhao sem consentimento nao pode entrar na varredura');
});

test('historico volta cronologico e nunca comeca no assistant', opts, async () => {
  const p = await producer();
  await appendMessage(p.id, 'assistant', [{ type: 'text', text: 'oi' }]);
  await appendMessage(p.id, 'user', [{ type: 'text', text: 'vai chover?' }]);
  await appendMessage(p.id, 'assistant', [{ type: 'text', text: 'sim' }]);

  const hist = await loadHistory(p.id);
  // A Messages API rejeita historico que comeca no assistant.
  assert.equal(hist[0]!.role, 'user');
  assert.equal(hist.length, 2);
});

test('idempotencia bloqueia reentrega do mesmo evento', opts, async () => {
  const mid = `wamid.${Math.random()}`;
  assert.equal(await claimMessage(mid), true);
  assert.equal(await claimMessage(mid), false);
});

test('NDVI da mesma data nao duplica', opts, async () => {
  const p = await producer();
  const f = await createField({ producerId: p.id, crop: 'soja', areaHa: 10, centroid: { lat: -12, lon: -55 } });
  const row = { index: 'NDVI', acquiredAt: '2026-09-01', cloudCover: 0.1, min: 0.3, max: 0.9, stdev: 0.08 };
  await saveNdviReading(f.id, { ...row, mean: 0.72 });
  await saveNdviReading(f.id, { ...row, mean: 0.99 });
  const reads = await lastNdviReadings(f.id);
  assert.equal(reads.length, 1);
  assert.equal(Number(reads[0]!.mean), 0.72);
});

test('laudo de solo grava e volta como objeto', opts, async () => {
  const p = await producer();
  const f = await createField({ producerId: p.id, crop: 'soja', areaHa: 10, centroid: { lat: -12, lon: -55 } });
  await saveSoilAnalysis(f.id, { phCaCl2: 5.2, pMehlich: 8, k: 60, ctc: 7.5, baseSaturation: 45, clayPct: 40 }, 'ocr');
  const soil = await getLatestSoilAnalysis(f.id);
  assert.equal(soil?.pMehlich, 8);
  assert.equal(soil?.clayPct, 40);
});

test('alerta nao repete no mesmo dia mas repete no dia seguinte', opts, async () => {
  const p = await producer();
  const f = await createField({ producerId: p.id, crop: 'soja', areaHa: 10, centroid: { lat: -12, lon: -55 } });
  assert.equal(await claimAlert(f.id, 'frost', '2026-09-10'), true);
  assert.equal(await claimAlert(f.id, 'frost', '2026-09-10'), false);
  assert.equal(await claimAlert(f.id, 'frost', '2026-09-11'), true);
});

test('exclusao LGPD leva talhoes e historico junto', opts, async () => {
  const p = await producer();
  const f = await createField({ producerId: p.id, crop: 'soja', areaHa: 10, centroid: { lat: -12, lon: -55 } });
  await appendMessage(p.id, 'user', [{ type: 'text', text: 'oi' }]);
  await saveNdviReading(f.id, { index: 'NDVI', acquiredAt: '2026-09-02', cloudCover: 0.1, mean: 0.5, min: 0.1, max: 0.8, stdev: 0.05 });

  await deleteProducer(p.id);

  assert.equal(await getPrimaryField(p.id), null);
  assert.equal((await loadHistory(p.id)).length, 0);
  assert.equal((await lastNdviReadings(f.id)).length, 0);
});

test('estado do onboarding sobrevive a reinicio do processo', opts, async () => {
  // Regressao: o pin ficava num Map em memoria. Reiniciar o app no meio do
  // cadastro perdia o talhao do produtor.
  const p = await findOrCreateProducer(newWaId(), 'pt-BR');
  created.push(p.id);

  await patchOnboardingData(p.id, { pendingLat: -12.5453, pendingLon: -55.7211 });
  // Segundo passo nao pode apagar o primeiro (merge, nao overwrite).
  await patchOnboardingData(p.id, { pendingCrop: 'soja' });

  const reloaded = await findOrCreateProducer(p.waId, 'pt-BR');
  assert.equal(reloaded.onboardingData.pendingLat, -12.5453);
  assert.equal(reloaded.onboardingData.pendingLon, -55.7211);
  assert.equal(reloaded.onboardingData.pendingCrop, 'soja');

  await clearOnboardingData(p.id);
  const cleared = await findOrCreateProducer(p.waId, 'pt-BR');
  assert.deepEqual(cleared.onboardingData, {});
});

test('produtor novo comeca com onboardingData vazio', opts, async () => {
  const p = await findOrCreateProducer(newWaId(), 'pt-BR');
  created.push(p.id);
  assert.deepEqual(p.onboardingData, {});
});
