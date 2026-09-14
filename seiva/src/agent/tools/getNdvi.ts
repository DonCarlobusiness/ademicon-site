import { z } from 'zod';
import type { AgentTool } from './types.js';
import { getFieldIndex } from '../../services/satellite/sentinelHub.js';
import { saveNdviReading } from '../../db/repo.js';
import { t } from '../../i18n/index.js';

const input = z.object({
  index: z.enum(['NDVI', 'NDRE']).default('NDVI'),
  lookback_days: z.number().int().min(5).max(90).default(30),
});

export const getNdviTool: AgentTool = {
  definition: {
    name: 'get_ndvi',
    description:
      'Vigor da vegetacao do talhao do produtor por satelite Sentinel-2 (NDVI ou NDRE), ' +
      'com historico das passagens limpas anteriores e um mapa PNG para enviar. ' +
      'Use quando o produtor perguntar como esta a lavoura, se tem falha no talhao, ' +
      'se a planta esta bem, ou quiser comparar com semanas anteriores. ' +
      'Pode nao haver imagem: se o retorno disser que nao houve passagem sem nuvem, ' +
      'informe isso ao produtor e NAO estime um valor.',
    input_schema: {
      type: 'object',
      properties: {
        index: {
          type: 'string',
          enum: ['NDVI', 'NDRE'],
          description: 'NDVI para vigor geral (padrao). NDRE para lavoura fechada, com muita folha.',
        },
        lookback_days: {
          type: 'integer',
          description: 'Quantos dias para tras procurar passagem sem nuvem. Padrao 30.',
        },
      },
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  async run(raw, ctx) {
    const parsed = input.safeParse(raw ?? {});
    if (!parsed.success) return 'Erro: parametros invalidos para get_ndvi.';
    if (!ctx.field) return t(ctx.locale, 'noFieldYet');

    const res = await getFieldIndex(ctx.field, {
      index: parsed.data.index,
      lookbackDays: parsed.data.lookback_days,
    });

    if (!res.ok) {
      if (res.reason === 'no_clear_pass') {
        // Texto explicito para o modelo nao tentar preencher a lacuna.
        return (
          `SEM DADO DE SATELITE: nao houve passagem do Sentinel-2 sem nuvem sobre este talhao ` +
          `nos ultimos ${parsed.data.lookback_days} dias. Nao existe valor de ${parsed.data.index} ` +
          `para informar. Diga isso ao produtor e NAO estime nenhum numero.`
        );
      }
      if (res.reason === 'not_configured') {
        return 'SEM DADO DE SATELITE: integracao de satelite indisponivel no momento. Nao invente valores.';
      }
      return 'SEM DADO DE SATELITE: falha ao consultar o satelite. Nao invente valores; peca para tentar mais tarde.';
    }

    const d = res.data;
    ctx.satelliteToolSucceeded = true;

    await saveNdviReading(ctx.field.id, {
      index: d.index, acquiredAt: d.acquiredAt, cloudCover: d.cloudCover,
      mean: d.mean, min: d.min, max: d.max, stdev: d.stdev,
    }).catch(() => { /* persistir historico nao pode derrubar a resposta */ });

    if (d.pngPath) {
      ctx.attachments.push({
        path: d.pngPath,
        caption: t(ctx.locale, 'ndviLegend', { date: fmt(d.acquiredAt), mean: d.mean.toFixed(2) }),
      });
    }

    const trend = describeTrend(d.mean, d.history);
    const lines = [
      `${d.index} do talhao em ${d.acquiredAt} (nuvem ${(d.cloudCover * 100).toFixed(0)}%):`,
      `media ${d.mean.toFixed(2)}, minimo ${d.min.toFixed(2)}, maximo ${d.max.toFixed(2)}, desvio ${d.stdev.toFixed(2)}.`,
      `Interpretacao da media: ${classify(d.mean)}.`,
      `Desvio ${d.stdev.toFixed(2)}: ${d.stdev > 0.12 ? 'talhao desuniforme, vale investigar as manchas' : 'talhao uniforme'}.`,
      trend,
      d.history.length > 0
        ? `Passagens anteriores: ${d.history.map((h) => `${h.date}=${h.mean.toFixed(2)}`).join(', ')}.`
        : 'Sem passagens limpas anteriores para comparar.',
      d.pngPath ? 'O mapa colorido ja vai ser enviado junto da sua resposta.' : '',
    ];
    return lines.filter(Boolean).join('\n');
  },
};

function classify(mean: number): string {
  if (mean < 0.2) return 'solo exposto ou lavoura muito fraca';
  if (mean < 0.35) return 'vigor baixo';
  if (mean < 0.5) return 'vigor medio';
  if (mean < 0.7) return 'vigor bom';
  return 'vigor muito bom, lavoura fechada';
}

function describeTrend(current: number, history: { date: string; mean: number }[]): string {
  const previous = history[0];
  if (!previous) return 'Sem leitura anterior para comparar tendencia.';
  const delta = current - previous.mean;
  const pct = previous.mean !== 0 ? (delta / previous.mean) * 100 : 0;
  if (Math.abs(pct) < 5) return `Estavel em relacao a ${previous.date} (${pct.toFixed(0)}%).`;
  return pct < 0
    ? `QUEDA de ${Math.abs(pct).toFixed(0)}% desde ${previous.date} — investigar.`
    : `Alta de ${pct.toFixed(0)}% desde ${previous.date} — lavoura desenvolvendo.`;
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
