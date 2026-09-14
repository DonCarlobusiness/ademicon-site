import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type Anthropic from '@anthropic-ai/sdk';
import type { AgentTool } from './types.js';
import { anthropic } from '../client.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { saveSoilAnalysis } from '../../db/repo.js';
import type { SoilAnalysis } from '../../domain/types.js';

/**
 * Leitura do laudo de analise de solo (foto ou PDF).
 *
 * Laudo de laboratorio nao tem layout padrao no Brasil: cada um nomeia as
 * colunas de um jeito e usa unidade diferente. Em vez de regex por
 * laboratorio, usamos a visao do modelo com saida estruturada — e cada campo
 * e opcional, porque um laudo incompleto tem que virar "esse dado nao veio"
 * e nao um numero inventado que iria direto para a conta de adubo.
 */

const SoilSchema = z.object({
  found: z.boolean().describe('true se a imagem/PDF e mesmo um laudo de analise de solo'),
  lab_name: z.string().describe('Nome do laboratorio, ou string vazia'),
  sampled_at: z.string().describe('Data da amostragem em AAAA-MM-DD, ou string vazia'),
  depth_cm: z.string().describe('Profundidade amostrada, ex "0-20", ou string vazia'),

  ph_cacl2: z.number().nullable().describe('pH em CaCl2. Se so houver pH em agua, converta: pH CaCl2 ~ pH agua - 0.6'),
  om_pct: z.number().nullable().describe('Materia organica em %. Se vier em g/dm3, divida por 10'),
  p_mehlich: z.number().nullable().describe('Fosforo Mehlich-1 em mg/dm3'),
  k: z.number().nullable().describe('Potassio em mg/dm3. Se vier em cmolc/dm3, multiplique por 391'),
  ca: z.number().nullable().describe('Calcio em cmolc/dm3'),
  mg: z.number().nullable().describe('Magnesio em cmolc/dm3'),
  ctc: z.number().nullable().describe('CTC a pH 7 (T) em cmolc/dm3'),
  base_saturation: z.number().nullable().describe('Saturacao por bases V em %'),
  clay_pct: z.number().nullable().describe('Argila em %'),

  unit_warnings: z.string().describe('Conversoes que voce fez ou unidades ambiguas. Vazio se nada a relatar'),
  unreadable_fields: z.string().describe('Campos que nao deu para ler com seguranca. Vazio se nenhum'),
});

const EXTRACTION_PROMPT = `Voce esta lendo um laudo de analise de solo de laboratorio brasileiro.

Extraia apenas o que estiver EXPLICITAMENTE no documento. Regras:
- Campo que nao aparece no laudo, ou que voce nao consegue ler com certeza: devolva null e cite em unreadable_fields.
- NUNCA estime, interpole ou preencha por "valor tipico". Um numero errado aqui vira recomendacao de adubo errada e prejuizo real para o produtor.
- Converta unidades quando necessario e registre a conversao em unit_warnings:
  - materia organica em g/dm3 -> dividir por 10 para ter %
  - K em cmolc/dm3 -> multiplicar por 391 para ter mg/dm3
  - pH em agua -> pH CaCl2 aproximado subtraindo 0,6 (marque como aproximacao)
- Se houver varias amostras/profundidades, use a camada 0-20 cm. Se nao houver, use a primeira e diga qual em unit_warnings.
- Se o documento nao for um laudo de solo, devolva found = false.`;

const input = z.object({});

function toSoilAnalysis(d: z.infer<typeof SoilSchema>): SoilAnalysis {
  const out: SoilAnalysis = {};
  if (d.ph_cacl2 !== null) out.phCaCl2 = d.ph_cacl2;
  if (d.om_pct !== null) out.om = d.om_pct;
  if (d.p_mehlich !== null) out.pMehlich = d.p_mehlich;
  if (d.k !== null) out.k = d.k;
  if (d.ca !== null) out.ca = d.ca;
  if (d.mg !== null) out.mg = d.mg;
  if (d.ctc !== null) out.ctc = d.ctc;
  if (d.base_saturation !== null) out.baseSaturation = d.base_saturation;
  if (d.clay_pct !== null) out.clayPct = d.clay_pct;
  return out;
}

export const readSoilReportTool: AgentTool = {
  definition: {
    name: 'read_soil_report',
    description:
      'Le o laudo de analise de solo que o produtor mandou (foto do papel ou PDF) e guarda ' +
      'os teores no talhao dele. Use SEMPRE que o produtor enviar uma foto ou arquivo que ' +
      'pareca laudo de laboratorio, ou quando ele disser que vai mandar a analise. ' +
      'Depois de guardar, o fertilizer_calc passa a usar esses valores em vez de estimativa regional.',
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },

  async run(raw, ctx) {
    if (!input.safeParse(raw ?? {}).success) return 'Erro: parametros invalidos.';

    if (ctx.pendingImages.length === 0 && ctx.pendingDocuments.length === 0) {
      return 'SEM DOCUMENTO neste turno. Peca ao produtor a foto do laudo (pagina inteira, bem iluminada) ou o PDF do laboratorio.';
    }
    if (!ctx.field) {
      return 'Produtor ainda nao tem talhao cadastrado. Peca o pin da localizacao antes de guardar o laudo.';
    }

    const content: Anthropic.ContentBlockParam[] = [
      ...ctx.pendingDocuments.map((doc): Anthropic.ContentBlockParam => ({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 },
      })),
      ...ctx.pendingImages.map((img): Anthropic.ContentBlockParam => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
      })),
      { type: 'text', text: 'Extraia os dados deste laudo de analise de solo.' },
    ];

    try {
      const res = await anthropic.messages.parse({
        model: env.SEIVA_MODEL,
        max_tokens: 4096,
        // Ler numero errado de tabela custa caro: vale esforco alto aqui.
        output_config: { effort: 'high', format: zodOutputFormat(SoilSchema) },
        system: EXTRACTION_PROMPT,
        messages: [{ role: 'user', content }],
      });

      const d = res.parsed_output;
      if (!d) return 'Nao consegui ler o documento. Peca uma foto mais nitida da pagina inteira do laudo.';
      if (!d.found) {
        return 'O documento enviado nao parece um laudo de analise de solo. Confirme com o produtor o que ele mandou.';
      }

      const soil = toSoilAnalysis(d);
      const readCount = Object.keys(soil).length;
      if (readCount === 0) {
        return 'Achei o laudo mas nao consegui ler nenhum teor com seguranca. Peca outra foto, mais de perto na tabela de resultados.';
      }

      await saveSoilAnalysis(ctx.field.id, soil, 'ocr');
      logger.info({ fieldId: ctx.field.id, readCount }, 'laudo de solo extraido e salvo');

      const lines = [
        `Laudo lido e guardado no talhao${d.lab_name ? ` (laboratorio: ${d.lab_name})` : ''}.`,
        d.sampled_at ? `Amostragem: ${d.sampled_at}.` : '',
        d.depth_cm ? `Profundidade: ${d.depth_cm} cm.` : '',
        'Teores:',
        fmt('pH (CaCl2)', soil.phCaCl2),
        fmt('Materia organica', soil.om, '%'),
        fmt('P (Mehlich-1)', soil.pMehlich, 'mg/dm3'),
        fmt('K', soil.k, 'mg/dm3'),
        fmt('Ca', soil.ca, 'cmolc/dm3'),
        fmt('Mg', soil.mg, 'cmolc/dm3'),
        fmt('CTC (T)', soil.ctc, 'cmolc/dm3'),
        fmt('Saturacao por bases (V)', soil.baseSaturation, '%'),
        fmt('Argila', soil.clayPct, '%'),
        d.unit_warnings ? `Conversoes feitas: ${d.unit_warnings}` : '',
        d.unreadable_fields ? `NAO consegui ler: ${d.unreadable_fields}. Nao invente esses valores.` : '',
        '',
        'Agora chame fertilizer_calc para refazer a adubacao com base neste laudo.',
      ];
      return lines.filter(Boolean).join('\n');
    } catch (err) {
      logger.warn({ err: String(err) }, 'leitura do laudo falhou');
      return 'Falha ao ler o laudo. Peca ao produtor para reenviar a foto ou o PDF.';
    }
  },
};

function fmt(label: string, value: number | undefined, unit = ''): string {
  return value === undefined ? '' : `- ${label}: ${value}${unit ? ` ${unit}` : ''}`;
}
