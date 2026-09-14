import { query } from './pool.js';
import type {
  Crop, Field, GeoJSONPolygon, LatLon, Locale, OnboardingStep, Producer, SoilAnalysis,
} from '../domain/types.js';
import type Anthropic from '@anthropic-ai/sdk';

// ------------------------------------------------------------------ produtores

interface ProducerRow {
  id: string; wa_id: string; name: string | null; municipality: string | null;
  uf: string | null; locale: string; lgpd_consent_at: Date | null;
  onboarding_step: string; created_at: Date;
}

function toProducer(r: ProducerRow): Producer {
  return {
    id: r.id,
    waId: r.wa_id,
    name: r.name,
    municipality: r.municipality,
    uf: r.uf,
    locale: r.locale as Locale,
    lgpdConsentAt: r.lgpd_consent_at,
    onboardingStep: r.onboarding_step as OnboardingStep,
    createdAt: r.created_at,
  };
}

/** Cria na primeira mensagem. Nesse ponto so existe o telefone. */
export async function findOrCreateProducer(waId: string, locale: Locale): Promise<Producer> {
  const rows = await query<ProducerRow>(
    `INSERT INTO producers (wa_id, locale)
     VALUES ($1, $2)
     ON CONFLICT (wa_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [waId, locale],
  );
  return toProducer(rows[0]!);
}

export async function updateProducer(
  id: string,
  patch: Partial<Pick<Producer, 'name' | 'municipality' | 'uf' | 'locale' | 'onboardingStep'>> &
    { lgpdConsent?: boolean },
): Promise<Producer> {
  const sets: string[] = ['updated_at = now()'];
  const vals: unknown[] = [];
  const push = (col: string, val: unknown) => { vals.push(val); sets.push(`${col} = $${vals.length + 1}`); };

  if (patch.name !== undefined) push('name', patch.name);
  if (patch.municipality !== undefined) push('municipality', patch.municipality);
  if (patch.uf !== undefined) push('uf', patch.uf);
  if (patch.locale !== undefined) push('locale', patch.locale);
  if (patch.onboardingStep !== undefined) push('onboarding_step', patch.onboardingStep);
  if (patch.lgpdConsent !== undefined) {
    sets.push(`lgpd_consent_at = ${patch.lgpdConsent ? 'now()' : 'NULL'}`);
  }

  const rows = await query<ProducerRow>(
    `UPDATE producers SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...vals],
  );
  return toProducer(rows[0]!);
}

/** LGPD: o produtor pede e some tudo. ON DELETE CASCADE leva talhoes e historico. */
export async function deleteProducer(id: string): Promise<void> {
  await query('DELETE FROM producers WHERE id = $1', [id]);
}

// --------------------------------------------------------------------- talhoes

interface FieldRow {
  id: string; producer_id: string; name: string; crop: string;
  area_ha: string; lat: number; lon: number; geom: string | null; planted_at: Date | null;
}

function toField(r: FieldRow): Field {
  return {
    id: r.id,
    producerId: r.producer_id,
    name: r.name,
    crop: r.crop as Crop,
    areaHa: Number(r.area_ha),
    centroid: { lat: r.lat, lon: r.lon },
    geom: r.geom ? (JSON.parse(r.geom) as GeoJSONPolygon) : null,
    plantedAt: r.planted_at,
  };
}

const FIELD_SELECT = `
  id, producer_id, name, crop, area_ha,
  ST_Y(centroid::geometry) AS lat,
  ST_X(centroid::geometry) AS lon,
  ST_AsGeoJSON(geom) AS geom,
  planted_at`;

export async function createField(input: {
  producerId: string; name?: string; crop: Crop; areaHa: number;
  centroid: LatLon; geom?: GeoJSONPolygon | null;
}): Promise<Field> {
  const rows = await query<FieldRow>(
    `WITH inserted AS (
       INSERT INTO fields (producer_id, name, crop, area_ha, centroid, geom)
       VALUES ($1, $2, $3, $4,
               ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
               CASE WHEN $7::text IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)::geography END)
       RETURNING *
     )
     SELECT ${FIELD_SELECT} FROM inserted`,
    [
      input.producerId,
      input.name ?? 'Talhao 1',
      input.crop,
      input.areaHa,
      input.centroid.lon,
      input.centroid.lat,
      input.geom ? JSON.stringify(input.geom) : null,
    ],
  );
  return toField(rows[0]!);
}

export async function getPrimaryField(producerId: string): Promise<Field | null> {
  const rows = await query<FieldRow>(
    `SELECT ${FIELD_SELECT} FROM fields WHERE producer_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [producerId],
  );
  return rows[0] ? toField(rows[0]) : null;
}

export async function listAllFields(): Promise<(Field & { waId: string; locale: Locale })[]> {
  const rows = await query<FieldRow & { wa_id: string; locale: string }>(
    `SELECT ${FIELD_SELECT}, p.wa_id, p.locale
       FROM fields f JOIN producers p ON p.id = f.producer_id
      WHERE p.lgpd_consent_at IS NOT NULL`,
  );
  return rows.map((r) => ({ ...toField(r), waId: r.wa_id, locale: r.locale as Locale }));
}

// ------------------------------------------------------------------ conversa

export async function appendMessage(
  producerId: string,
  role: 'user' | 'assistant',
  content: Anthropic.MessageParam['content'],
): Promise<void> {
  await query('INSERT INTO conversations (producer_id, role, content) VALUES ($1, $2, $3)', [
    producerId, role, JSON.stringify(content),
  ]);
}

/**
 * Ultimas `limit` mensagens em ordem cronologica. A primeira precisa ser
 * do 'user': a Messages API rejeita um historico que comeca no assistant.
 */
export async function loadHistory(producerId: string, limit = 30): Promise<Anthropic.MessageParam[]> {
  const rows = await query<{ role: 'user' | 'assistant'; content: unknown }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at FROM conversations
        WHERE producer_id = $1 ORDER BY created_at DESC LIMIT $2
     ) t ORDER BY created_at ASC`,
    [producerId, limit],
  );
  const msgs = rows.map((r) => ({
    role: r.role,
    content: r.content as Anthropic.MessageParam['content'],
  }));
  while (msgs.length > 0 && msgs[0]!.role !== 'user') msgs.shift();
  return msgs;
}

// ------------------------------------------------------------- idempotencia

/** true = primeira vez que vemos esse id; false = reentrega, ignore. */
export async function claimMessage(providerMessageId: string): Promise<boolean> {
  const rows = await query(
    `INSERT INTO processed_messages (provider_message_id) VALUES ($1)
     ON CONFLICT DO NOTHING RETURNING provider_message_id`,
    [providerMessageId],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------- satelite

export async function saveNdviReading(fieldId: string, r: {
  index: string; acquiredAt: string; cloudCover: number;
  mean: number; min: number; max: number; stdev: number;
}): Promise<void> {
  await query(
    `INSERT INTO ndvi_readings (field_id, index_name, acquired_at, cloud_cover, mean, min, max, stdev)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (field_id, index_name, acquired_at) DO NOTHING`,
    [fieldId, r.index, r.acquiredAt, r.cloudCover, r.mean, r.min, r.max, r.stdev],
  );
}

export async function lastNdviReadings(fieldId: string, limit = 6) {
  return query<{ acquired_at: Date; mean: string }>(
    `SELECT acquired_at, mean FROM ndvi_readings
      WHERE field_id = $1 AND index_name = 'NDVI'
      ORDER BY acquired_at DESC LIMIT $2`,
    [fieldId, limit],
  );
}

// -------------------------------------------------------------------- solo

export async function getLatestSoilAnalysis(fieldId: string): Promise<SoilAnalysis | null> {
  const rows = await query<{ data: SoilAnalysis }>(
    `SELECT data FROM soil_analyses WHERE field_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [fieldId],
  );
  return rows[0]?.data ?? null;
}

export async function saveSoilAnalysis(
  fieldId: string, data: SoilAnalysis, source: 'ocr' | 'manual' | 'regional',
): Promise<void> {
  await query('INSERT INTO soil_analyses (field_id, data, source) VALUES ($1,$2,$3)', [
    fieldId, JSON.stringify(data), source,
  ]);
}

// ----------------------------------------------------------------- alertas

/** true = alerta novo (pode enviar); false = ja avisamos isso. */
export async function claimAlert(fieldId: string, kind: string, dedupeKey: string): Promise<boolean> {
  const rows = await query(
    `INSERT INTO alerts_sent (field_id, kind, dedupe_key) VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING RETURNING id`,
    [fieldId, kind, dedupeKey],
  );
  return rows.length > 0;
}
