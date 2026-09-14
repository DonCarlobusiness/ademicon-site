import { z } from 'zod';
import type { AgentTool } from './types.js';
import type { Crop } from '../../domain/types.js';
import { calculateFertilizer } from '../../services/agronomy/fertilizer.js';
import { getLatestSoilAnalysis } from '../../db/repo.js';

const CROPS = [
  'soja', 'milho', 'cafe', 'algodao', 'feijao', 'trigo', 'cana', 'pastagem', 'hortalicas', 'outro',
] as const;

const input = z.object({
  crop: z.enum(CROPS).optional(),
  target_yield: z.number().positive().optional(),
  area_ha: z.number().positive().optional(),
});

const NOTE_TEXT: Record<string, string> = {
  n_fixacao_biologica:
    'Cultura fixadora: o nitrogenio vem da fixacao biologica com inoculante. NAO recomende ureia — ' +
    'adubo nitrogenado aqui atrapalha a nodulacao e e dinheiro jogado fora.',
  n_descontado_mo: 'Parte do N foi descontada pela materia organica do solo.',
  sem_laudo_estimativa_regional:
    'SEM LAUDO DE SOLO: o calculo assumiu fertilidade media da regiao. Diga isso ao produtor e ' +
    'peca a foto do laudo para refinar — pode mudar bastante a conta.',
  fertilidade_muito_baixa:
    'Solo com teor muito baixo de P e/ou K: a dose inclui construcao de fertilidade, nao so manutencao.',
};

export const fertilizerCalcTool: AgentTool = {
  definition: {
    name: 'fertilizer_calc',
    description:
      'Calcula adubacao NPK e necessidade de calagem por hectare e para o talhao inteiro, ' +
      'a partir da meta de produtividade e da analise de solo do produtor (se houver). ' +
      'Devolve doses em kg/ha, produtos comerciais, quantidade total e epoca de aplicacao. ' +
      'Use sempre que o assunto for adubo, calcario, formulacao ou correcao de solo.',
    input_schema: {
      type: 'object',
      properties: {
        crop: { type: 'string', enum: [...CROPS], description: 'Cultura. Padrao: a do talhao cadastrado.' },
        target_yield: {
          type: 'number',
          description: 'Meta de produtividade em sacas/ha (graos) ou t/ha (cana, pastagem, hortalicas). ' +
            'Se o produtor nao disser, deixe em branco e a media da cultura sera usada.',
        },
        area_ha: { type: 'number', description: 'Area em hectares. Padrao: a do talhao cadastrado.' },
      },
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  async run(raw, ctx) {
    const parsed = input.safeParse(raw ?? {});
    if (!parsed.success) return 'Erro: parametros invalidos para fertilizer_calc.';

    const crop = (parsed.data.crop ?? ctx.field?.crop ?? 'outro') as Crop;
    const areaHa = parsed.data.area_ha ?? ctx.field?.areaHa;
    if (!areaHa) {
      return 'Falta a area do talhao. Pergunte ao produtor quantos hectares tem a area antes de calcular.';
    }

    const soil = ctx.field ? await getLatestSoilAnalysis(ctx.field.id).catch(() => null) : null;

    const res = calculateFertilizer({
      crop, areaHa, targetYield: parsed.data.target_yield, soil,
    });
    if (!res.ok) return `Erro no calculo: ${res.detail ?? res.reason}.`;

    const p = res.data;
    const lines = [
      `Plano de adubacao — ${p.crop}, ${p.areaHa} ha, meta ${p.targetYield}.`,
      `Base do calculo: ${p.basis === 'soil_analysis' ? 'analise de solo do produtor' : 'estimativa regional (sem laudo)'}.`,
      `Nutrientes: N ${p.nutrients.n} kg/ha, P2O5 ${p.nutrients.p2o5} kg/ha, K2O ${p.nutrients.k2o} kg/ha.`,
      '',
      'Produtos:',
      ...p.products.map(
        (pr) => `- ${pr.name}: ${pr.kgPerHa} kg/ha = ${pr.totalKg.toLocaleString('pt-BR')} kg no talhao (${pr.timing}).`,
      ),
    ];

    if (p.liming.needed) {
      lines.push('', `Calagem: ${p.liming.tHa} t/ha de calcario pelo metodo da saturacao por bases.`);
    } else if (p.liming.note === 'saturacao_adequada') {
      lines.push('', 'Calagem: saturacao por bases ja esta no alvo, nao precisa calcario agora.');
    } else if (p.liming.note === 'sem_dados_calagem' || p.liming.note === 'sem_laudo') {
      lines.push('', 'Calagem: sem CTC e saturacao por bases no laudo, nao da para calcular calcario.');
    }

    if (p.totalCost !== null) lines.push('', `Custo estimado dos insumos: R$ ${p.totalCost.toLocaleString('pt-BR')}.`);

    const notes = p.notes.map((n) => NOTE_TEXT[n]).filter(Boolean);
    if (notes.length > 0) lines.push('', 'Observacoes tecnicas:', ...notes.map((n) => `- ${n}`));

    return lines.join('\n');
  },
};
