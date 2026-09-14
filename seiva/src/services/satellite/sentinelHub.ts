import { env } from '../../config/env.js';
import { httpJson } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import type { Field, NdviResult, ToolResult } from '../../domain/types.js';
import { daysAgoISO, fieldPolygon, todayISO } from './geo.js';
import { renderIndexPng } from './render.js';

/**
 * Sentinel Hub (Copernicus).
 *
 * REGRA DE PRODUTO: nunca inventar dado de satelite. Se nao houver passagem
 * com nuvem abaixo do limite, devolvemos { ok: false, reason: 'no_clear_pass' }
 * e o agente diz isso ao produtor — nunca estima um NDVI plausivel.
 */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!env.SENTINEL_HUB_CLIENT_ID || !env.SENTINEL_HUB_CLIENT_SECRET) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.SENTINEL_HUB_CLIENT_ID,
    client_secret: env.SENTINEL_HUB_CLIENT_SECRET,
  }).toString();

  const res = await httpJson<{ access_token: string; expires_in: number }>(
    `${env.SENTINEL_HUB_BASE_URL}/oauth/token`,
    { method: 'POST', body, label: 'sentinelhub.token' },
  );
  cachedToken = { value: res.access_token, expiresAt: Date.now() + res.expires_in * 1000 };
  return cachedToken.value;
}

const EVALSCRIPT_STATS = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B05", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "index", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ],
    mosaicking: "ORBIT"
  };
}
function evaluatePixel(s) {
  // INDEX_EXPR e trocado em runtime por NDVI ou NDRE.
  let idx = INDEX_EXPR;
  // SCL 3=sombra de nuvem, 8/9=nuvem media/alta, 10=cirrus. Fora da mascara
  // o pixel nao entra na estatistica — nuvem nao vira "planta fraca".
  let valid = (s.dataMask === 1 && s.SCL !== 3 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10) ? 1 : 0;
  return { index: [idx], dataMask: [valid] };
}`;

function evalscriptFor(index: 'NDVI' | 'NDRE'): string {
  const expr = index === 'NDVI'
    ? '(s.B08 - s.B04) / (s.B08 + s.B04)'
    : '(s.B08 - s.B05) / (s.B08 + s.B05)';
  return EVALSCRIPT_STATS.replace('INDEX_EXPR', expr);
}

interface StatsResponse {
  data: {
    interval: { from: string; to: string };
    outputs: {
      index: {
        bands: {
          B0: { stats: { mean: number; min: number; max: number; stDev: number; sampleCount: number; noDataCount: number } };
        };
      };
    };
  }[];
}

export async function getFieldIndex(
  field: Field,
  opts: { index?: 'NDVI' | 'NDRE'; lookbackDays?: number } = {},
): Promise<ToolResult<NdviResult>> {
  const index = opts.index ?? 'NDVI';
  const lookbackDays = opts.lookbackDays ?? 30;

  const token = await getToken().catch((err) => {
    logger.warn({ err: String(err) }, 'falha no token do sentinel hub');
    return null;
  });
  if (!token) return { ok: false, reason: 'not_configured', detail: 'Sentinel Hub sem credencial' };

  const polygon = fieldPolygon(field);

  let stats: StatsResponse;
  try {
    stats = await httpJson<StatsResponse>(`${env.SENTINEL_HUB_BASE_URL}/api/v1/statistics`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      label: 'sentinelhub.statistics',
      timeoutMs: 25_000,
      body: {
        input: {
          bounds: { geometry: polygon, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
          data: [{
            type: 'sentinel-2-l2a',
            dataFilter: { maxCloudCoverage: Math.round(env.SENTINEL_MAX_CLOUD_COVER * 100) },
          }],
        },
        aggregation: {
          timeRange: { from: `${daysAgoISO(lookbackDays)}T00:00:00Z`, to: `${todayISO()}T23:59:59Z` },
          aggregationInterval: { of: 'P1D' },
          resx: 10, resy: 10,
          evalscript: evalscriptFor(index),
        },
      },
    });
  } catch (err) {
    logger.warn({ err: String(err), fieldId: field.id }, 'statistics do sentinel hub falhou');
    return { ok: false, reason: 'upstream_error' };
  }

  // Uma passagem so conta se sobrou pixel valido depois da mascara de nuvem.
  const passes = (stats.data ?? [])
    .map((d) => {
      const b = d.outputs?.index?.bands?.B0?.stats;
      if (!b || b.sampleCount === 0) return null;
      const valid = b.sampleCount - b.noDataCount;
      if (valid <= 0) return null;
      const cloudFraction = b.noDataCount / b.sampleCount;
      return {
        date: d.interval.from.slice(0, 10),
        mean: b.mean, min: b.min, max: b.max, stdev: b.stDev,
        cloudCover: cloudFraction,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .filter((p) => p.cloudCover <= env.SENTINEL_MAX_CLOUD_COVER)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // mais nova primeiro

  if (passes.length === 0) {
    // Sem imagem limpa: o agente e obrigado a dizer isso ao produtor.
    return { ok: false, reason: 'no_clear_pass', detail: `${lookbackDays} dias` };
  }

  const latest = passes[0]!;
  const pngPath = await renderIndexPng(field, index, latest.date, token).catch((err) => {
    logger.warn({ err: String(err) }, 'render do mapa falhou; segue sem imagem');
    return null;
  });

  return {
    ok: true,
    data: {
      index,
      acquiredAt: latest.date,
      cloudCover: Number(latest.cloudCover.toFixed(3)),
      mean: Number(latest.mean.toFixed(4)),
      min: Number(latest.min.toFixed(4)),
      max: Number(latest.max.toFixed(4)),
      stdev: Number(latest.stdev.toFixed(4)),
      history: passes.slice(1, 6).map((p) => ({ date: p.date, mean: Number(p.mean.toFixed(4)) })),
      pngPath,
    },
  };
}
