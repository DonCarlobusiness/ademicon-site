import { z } from 'zod';
import type { AgentTool } from './types.js';
import type { Crop } from '../../domain/types.js';
import { getMarketPrice } from '../../services/market/prices.js';

const input = z.object({
  crop: z.string().optional(),
  region: z.string().optional(),
});

export const marketPriceTool: AgentTool = {
  definition: {
    name: 'market_price',
    description:
      'Preco spot da cultura na regiao do produtor, para decidir venda ou calcular margem. ' +
      'Use quando o produtor perguntar quanto esta o preco, se vale vender, ou pedir conta de custo x receita.',
    input_schema: {
      type: 'object',
      properties: {
        crop: { type: 'string', description: 'Cultura. Padrao: a do talhao cadastrado.' },
        region: { type: 'string', description: 'Regiao ou municipio. Padrao: o do produtor.' },
      },
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  async run(raw, ctx) {
    const parsed = input.safeParse(raw ?? {});
    if (!parsed.success) return 'Erro: parametros invalidos para market_price.';

    const crop = (parsed.data.crop ?? ctx.field?.crop ?? 'outro') as Crop;
    const region = parsed.data.region ?? ctx.producer.municipality ?? ctx.producer.uf ?? '';
    if (!region) {
      return 'Falta saber a regiao do produtor. Pergunte o municipio antes de consultar preco.';
    }

    const res = await getMarketPrice(crop, region);
    if (!res.ok) {
      return (
        'SEM DADO DE PRECO: nao tenho cotacao confiavel para essa praca agora. ' +
        'Diga isso ao produtor e NAO invente um preco — ele pode fechar negocio em cima disso. ' +
        'Sugira que ele confira com a cooperativa ou corretor da regiao.'
      );
    }
    const p = res.data;
    return `Preco ${p.crop} em ${p.region}: ${p.currency} ${p.price} por ${p.unit} (referencia ${p.referenceDate}, fonte ${p.source}).`;
  },
};
