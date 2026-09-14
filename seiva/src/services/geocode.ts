import { httpJson } from '../lib/http.js';
import { logger } from '../lib/logger.js';
import type { LatLon } from '../domain/types.js';

/**
 * Reverse geocoding best-effort (Nominatim / OpenStreetMap).
 * Se falhar devolve null e o fluxo pergunta o municipio ao produtor —
 * nunca chuta uma cidade.
 *
 * Nominatim exige User-Agent identificavel e tem limite de 1 req/s.
 * Em volume, trocar por um provedor contratado ou pelo shapefile do IBGE.
 */
export async function reverseGeocode(at: LatLon): Promise<{ municipality: string; uf: string } | null> {
  try {
    const res = await httpJson<{
      address?: {
        city?: string; town?: string; village?: string; municipality?: string;
        state?: string; 'ISO3166-2-lvl4'?: string;
      };
    }>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${at.lat}&lon=${at.lon}&zoom=10&addressdetails=1`,
      {
        label: 'nominatim.reverse',
        timeoutMs: 8_000,
        retries: 1,
        headers: { 'user-agent': 'SEIVA/0.1 (agronomia; contato@seiva.app)' },
      },
    );
    const a = res.address;
    if (!a) return null;
    const municipality = a.city ?? a.town ?? a.village ?? a.municipality;
    if (!municipality) return null;
    // "BR-MT" -> "MT"
    const uf = a['ISO3166-2-lvl4']?.split('-')[1] ?? '';
    return { municipality, uf };
  } catch (err) {
    logger.warn({ err: String(err) }, 'reverse geocode falhou');
    return null;
  }
}
