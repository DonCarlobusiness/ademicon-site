import { z } from 'zod';
import type { AgentTool } from './types.js';
import { getWeather, dryStreak } from '../../services/weather/openMeteo.js';
import { t } from '../../i18n/index.js';

const input = z.object({ days: z.number().int().min(1).max(14).default(7) });

export const getWeatherTool: AgentTool = {
  definition: {
    name: 'get_weather',
    description:
      'Previsao do tempo dos proximos dias no talhao do produtor, com janelas de aplicacao ' +
      'ja calculadas (vento, chuva, umidade, temperatura). Use para perguntas sobre chuva, ' +
      'geada, seca, "posso pulverizar hoje", "da para plantar", "da para colher".',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'integer', description: 'Quantos dias de previsao (1 a 14). Padrao 7.' },
      },
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  async run(raw, ctx) {
    const parsed = input.safeParse(raw ?? {});
    if (!parsed.success) return 'Erro: parametros invalidos para get_weather.';
    if (!ctx.field) return t(ctx.locale, 'noFieldYet');

    const res = await getWeather(ctx.field.centroid, parsed.data.days);
    if (!res.ok) {
      return 'SEM DADO DE CLIMA: nao consegui a previsao agora. Diga isso ao produtor e NAO invente previsao.';
    }

    const w = res.data;
    const rows = w.daily.map((d) => {
      const win = w.sprayWindows.find((s) => s.date === d.date);
      const spray = win?.suitable ? 'aplicacao OK' : `evitar aplicacao (${win?.reasons.join('; ')})`;
      return `${d.date}: ${d.tMinC.toFixed(0)} a ${d.tMaxC.toFixed(0)} C, chuva ${d.rainMm.toFixed(1)} mm ` +
        `(${d.rainProb.toFixed(0)}% chance), vento ${d.windKmh.toFixed(0)} km/h, umidade ${d.humidityPct.toFixed(0)}% — ${spray}`;
    });

    const totalRain = w.daily.reduce((s, d) => s + d.rainMm, 0);
    const dry = dryStreak(w.daily);
    const frost = w.daily.filter((d) => d.tMinC <= 3);

    const notes = [
      `Chuva acumulada prevista: ${totalRain.toFixed(1)} mm em ${w.daily.length} dias.`,
      dry >= 5 ? `ALERTA: ${dry} dias seguidos sem chuva relevante na previsao.` : '',
      frost.length > 0
        ? `ALERTA DE GEADA: minima de ${Math.min(...frost.map((f) => f.tMinC)).toFixed(0)} C em ${frost.map((f) => f.date).join(', ')}.`
        : '',
    ].filter(Boolean);

    return [`Previsao para o talhao (${w.timezone}):`, ...rows, ...notes].join('\n');
  },
};
