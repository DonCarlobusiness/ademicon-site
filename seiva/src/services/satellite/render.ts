import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '../../config/env.js';
import { httpBuffer } from '../../lib/http.js';
import type { Field } from '../../domain/types.js';
import { bboxOf, fieldPolygon } from './geo.js';

/**
 * Pede ao Sentinel Hub o PNG ja colorido do indice (Process API faz o
 * render no servidor). Paleta escolhida para leitura de produtor:
 * vermelho = fraco, amarelo = medio, verde = bom — a mesma ordem descrita
 * na legenda que vai junto da imagem.
 */
const EVALSCRIPT_PNG = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function ramp(v) {
  if (v < 0.20) return [0.66, 0.13, 0.13];  // vermelho: solo/planta muito fraca
  if (v < 0.35) return [0.86, 0.42, 0.16];  // laranja
  if (v < 0.50) return [0.95, 0.77, 0.20];  // amarelo: vigor medio
  if (v < 0.65) return [0.60, 0.80, 0.25];  // verde claro
  if (v < 0.80) return [0.24, 0.63, 0.24];  // verde
  return [0.05, 0.40, 0.12];                 // verde forte: vigor bom
}
function evaluatePixel(s) {
  if (s.dataMask !== 1) return [0, 0, 0, 0];
  // Nuvem sai transparente em vez de virar "area ruim".
  if (s.SCL === 3 || s.SCL === 8 || s.SCL === 9 || s.SCL === 10) return [0.6, 0.6, 0.6, 0.5];
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  let c = ramp(ndvi);
  return [c[0], c[1], c[2], 1];
}`;

export async function renderIndexPng(
  field: Field,
  index: 'NDVI' | 'NDRE',
  date: string,
  token: string,
): Promise<string | null> {
  const polygon = fieldPolygon(field);
  const [minLon, minLat, maxLon, maxLat] = bboxOf(polygon);

  const png = await httpBuffer(`${env.SENTINEL_HUB_BASE_URL}/api/v1/process`, {
    method: 'POST',
    label: 'sentinelhub.process',
    timeoutMs: 30_000,
    headers: { authorization: `Bearer ${token}`, accept: 'image/png' },
    body: {
      input: {
        bounds: {
          bbox: [minLon, minLat, maxLon, maxLat],
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [{
          type: 'sentinel-2-l2a',
          dataFilter: { timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` } },
        }],
      },
      output: {
        width: 720,
        height: 720,
        responses: [{ identifier: 'default', format: { type: 'image/png' } }],
      },
      evalscript: EVALSCRIPT_PNG,
    },
  });

  const dir = await mkdtemp(join(tmpdir(), 'seiva-ndvi-'));
  const path = join(dir, `${field.id}-${index}-${date}.png`);
  await writeFile(path, png);
  return path;
}
