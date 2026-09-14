import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { AgentTool } from './types.js';
import { anthropic } from '../client.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/**
 * Diagnostico por foto.
 *
 * A foto ja chega no turno principal (o modelo enxerga a imagem), mas essa
 * ferramenta faz uma chamada dedicada com prompt de fitopatologia e SAIDA
 * ESTRUTURADA. O motivo e a confianca: em texto livre o modelo tende a soar
 * seguro demais. Forcando o campo `confidence` e `image_quality` ele precisa
 * se comprometer com um numero, e o agente principal passa isso ao produtor.
 */

const DiagnosisSchema = z.object({
  label: z.string().describe('Nome do problema em linguagem de produtor, ex: "ferrugem asiatica"'),
  scientific_name: z.string().describe('Nome cientifico quando aplicavel, senao string vazia'),
  category: z.enum(['praga', 'doenca', 'deficiencia', 'daninha', 'sadio', 'indeterminado']),
  confidence: z.number().min(0).max(1).describe('0 a 1. Seja honesto: foto ruim = confianca baixa'),
  evidence: z.string().describe('O que na imagem sustenta esse diagnostico'),
  image_quality: z.enum(['boa', 'ruim']),
  image_quality_note: z.string().describe('Se ruim, o que pedir ao produtor. Senao string vazia'),
  next_step: z.string().describe('O que o produtor faz agora, em uma ou duas frases praticas'),
  requires_pesticide: z.boolean().describe('true se o manejo usual envolve defensivo agricola'),
});

const VISION_PROMPT = `Voce e fitopatologista e entomologista agricola analisando a foto de uma lavoura brasileira.

Identifique o problema principal: praga, doenca, deficiencia nutricional, planta daninha, ou planta sadia.

Seja rigoroso com a confianca:
- Muitos sintomas sao parecidos entre si (mancha de fungo vs. queima quimica vs. deficiencia de potassio).
- Foto desfocada, escura, muito longe ou mostrando so uma folha solta = confianca no maximo 0.5 e image_quality "ruim".
- Se nao der para distinguir com seguranca, use category "indeterminado" e diga o que precisa para fechar o diagnostico.
- Nao invente um nome cientifico so para parecer tecnico.

Em next_step, diga o que o produtor faz agora. Se o manejo usual envolver defensivo, marque
requires_pesticide como true e descreva o alvo e o momento — sem dose fechada.`;

const input = z.object({
  focus: z.string().optional().describe('O que o produtor perguntou sobre a foto'),
});

export const diagnosePhotoTool: AgentTool = {
  definition: {
    name: 'diagnose_photo',
    description:
      'Analisa a foto que o produtor acabou de mandar e identifica praga, doenca, deficiencia ' +
      'nutricional ou planta daninha, com nivel de confianca e proximo passo pratico. ' +
      'Use SEMPRE que o produtor mandar foto de planta, folha, solo ou lavoura. ' +
      'Se nao houver foto no turno atual, a ferramenta avisa e voce deve pedir a foto.',
    input_schema: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          description: 'O que o produtor quer saber sobre a foto, nas palavras dele.',
        },
      },
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  async run(raw, ctx) {
    const parsed = input.safeParse(raw ?? {});
    const focus = parsed.success ? parsed.data.focus : undefined;

    if (ctx.pendingImages.length === 0) {
      return 'SEM FOTO neste turno. Peca ao produtor uma foto da folha ou da planta: de perto, com luz do dia, mostrando a parte afetada.';
    }

    const cropLine = ctx.field ? `A cultura do talhao e ${ctx.field.crop}.` : '';
    const focusLine = focus ? `O produtor perguntou: "${focus}".` : '';

    try {
      const res = await anthropic.messages.parse({
        model: env.SEIVA_MODEL,
        max_tokens: 4096,
        // Diagnostico visual erra caro: vale pensar mais aqui do que na conversa.
        output_config: { effort: 'high', format: zodOutputFormat(DiagnosisSchema) },
        system: VISION_PROMPT,
        messages: [{
          role: 'user',
          content: [
            ...ctx.pendingImages.map((img) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
            })),
            { type: 'text' as const, text: [cropLine, focusLine, 'Analise a imagem.'].filter(Boolean).join(' ') },
          ],
        }],
      });

      const d = res.parsed_output;
      if (!d) return 'Nao consegui analisar a foto. Peca outra foto mais nitida, de perto e com luz do dia.';

      const lines = [
        `Diagnostico: ${d.label}${d.scientific_name ? ` (${d.scientific_name})` : ''}`,
        `Categoria: ${d.category}`,
        `Confianca: ${(d.confidence * 100).toFixed(0)}%`,
        `Evidencia na imagem: ${d.evidence}`,
        `Proximo passo: ${d.next_step}`,
      ];
      if (d.image_quality === 'ruim') {
        lines.push(`QUALIDADE DA FOTO RUIM: ${d.image_quality_note} — peca outra foto ao produtor.`);
      }
      if (d.confidence < 0.6) {
        lines.push('CONFIANCA BAIXA: diga ao produtor que nao da para cravar e o que falta para confirmar.');
      }
      if (d.requires_pesticide) {
        lines.push('Envolve defensivo: oriente alvo e momento, sem dose fechada. O aviso legal e anexado pelo sistema.');
      }
      return lines.join('\n');
    } catch (err) {
      logger.warn({ err: String(err) }, 'diagnostico por foto falhou');
      return 'Falha ao analisar a foto. Peca ao produtor para reenviar a imagem.';
    }
  },
};
