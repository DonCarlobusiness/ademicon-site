import type { SprayWindow, WeatherDay } from '../../domain/types.js';

/**
 * Regras agronomicas de janela de aplicacao. Modulo puro, sem env e sem
 * rede: sao as regras que decidem se o produtor pode pulverizar hoje, e
 * precisam ser testaveis isoladamente do cliente HTTP de previsao.
 *
 * Criterios praticos de campo:
 * - vento 3 a 10 km/h (abaixo disso ha inversao termica, acima ha deriva)
 * - sem chuva no dia (lava a calda)
 * - umidade >= 55% e temperatura < 30 C (acima a gota evapora antes da folha)
 */
export function computeSprayWindows(daily: WeatherDay[]): SprayWindow[] {
  return daily.map((day) => {
    const reasons: string[] = [];
    if (day.windKmh > 10) reasons.push('vento forte (risco de deriva)');
    if (day.windKmh < 3) reasons.push('vento fraco (risco de inversao termica)');
    if (day.rainMm >= 2 || day.rainProb >= 60) reasons.push('chuva prevista (lava a calda)');
    if (day.humidityPct > 0 && day.humidityPct < 55) reasons.push('umidade baixa (gota evapora)');
    if (day.tMaxC >= 30) reasons.push('temperatura alta');
    return { date: day.date, suitable: reasons.length === 0, reasons };
  });
}

/** Dias seguidos sem chuva relevante a partir de hoje. */
export function dryStreak(daily: WeatherDay[], thresholdMm = 2): number {
  let n = 0;
  for (const day of daily) {
    if (day.rainMm >= thresholdMm) break;
    n++;
  }
  return n;
}
