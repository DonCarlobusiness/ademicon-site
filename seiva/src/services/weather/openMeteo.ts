import { env } from '../../config/env.js';
import { httpJson } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import type { LatLon, ToolResult, WeatherDay, WeatherResult } from '../../domain/types.js';
import { computeSprayWindows } from './windows.js';

interface OpenMeteoResponse {
  timezone: string;
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
    relative_humidity_2m_mean?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
}

/**
 * Open-Meteo nao pede chave e cobre o Brasil inteiro. Fallback INMET fica
 * para quando houver contrato; ate la uma falha vira 'upstream_error' e o
 * agente diz que nao tem previsao — nao inventa.
 */
export async function getWeather(at: LatLon, days = 7): Promise<ToolResult<WeatherResult>> {
  const url =
    `${env.OPEN_METEO_BASE_URL}/v1/forecast?latitude=${at.lat.toFixed(4)}&longitude=${at.lon.toFixed(4)}` +
    `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,` +
    `wind_speed_10m_max,relative_humidity_2m_mean,et0_fao_evapotranspiration` +
    `&forecast_days=${Math.min(days, 16)}&timezone=auto`;

  let res: OpenMeteoResponse;
  try {
    res = await httpJson<OpenMeteoResponse>(url, { label: 'openmeteo.forecast', timeoutMs: 12_000 });
  } catch (err) {
    logger.warn({ err: String(err) }, 'open-meteo falhou');
    return { ok: false, reason: 'upstream_error' };
  }

  const d = res.daily;
  if (!d?.time?.length) return { ok: false, reason: 'no_data' };

  const daily: WeatherDay[] = d.time.map((date, i) => ({
    date,
    tMinC: d.temperature_2m_min[i] ?? 0,
    tMaxC: d.temperature_2m_max[i] ?? 0,
    rainMm: d.precipitation_sum[i] ?? 0,
    rainProb: d.precipitation_probability_max?.[i] ?? 0,
    windKmh: d.wind_speed_10m_max[i] ?? 0,
    humidityPct: d.relative_humidity_2m_mean?.[i] ?? 0,
    et0Mm: d.et0_fao_evapotranspiration?.[i] ?? null,
  }));

  return {
    ok: true,
    data: {
      latitude: at.lat,
      longitude: at.lon,
      timezone: res.timezone,
      daily,
      sprayWindows: computeSprayWindows(daily),
    },
  };
}

export { computeSprayWindows, dryStreak } from './windows.js';
