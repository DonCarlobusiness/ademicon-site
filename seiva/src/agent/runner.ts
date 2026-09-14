import type Anthropic from '@anthropic-ai/sdk';
import { anthropic } from './client.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { SYSTEM_BASE, buildContextBlock } from './systemPrompt.js';
import { TOOL_DEFINITIONS, findTool } from './tools/index.js';
import type { ToolContext } from './tools/types.js';
import { applyPesticideWarning, looksLikeFabricatedIndex } from './guards.js';
import { appendMessage, loadHistory } from '../db/repo.js';
import type { Field, Locale, Producer } from '../domain/types.js';
import { t } from '../i18n/index.js';

/**
 * Teto de voltas de ferramenta por mensagem. Uma pergunta real resolve em
 * 1 a 3 voltas; acima disso quase sempre e loop. O teto protege a conta e o
 * tempo de resposta do produtor, que esta esperando no WhatsApp.
 */
const MAX_TOOL_ITERATIONS = 6;

/**
 * WhatsApp corta em 4096 caracteres e a resposta boa aqui tem 5 linhas.
 * 4096 de saida sobra para a volta mais longa (plano de adubacao completo).
 */
const MAX_TOKENS = 4096;

export interface AgentReply {
  text: string;
  attachments: { path: string; caption: string }[];
}

export async function runAgent(params: {
  producer: Producer;
  field: Field | null;
  locale: Locale;
  userContent: Anthropic.MessageParam['content'];
  images?: ToolContext['pendingImages'];
}): Promise<AgentReply> {
  const { producer, field, locale, userContent } = params;

  const ctx: ToolContext = {
    producer,
    field,
    locale,
    pendingImages: params.images ?? [],
    attachments: [],
    satelliteToolSucceeded: false,
  };

  const history = await loadHistory(producer.id);
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userContent },
  ];

  await appendMessage(producer.id, 'user', userContent);

  let finalText = '';

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: env.SEIVA_MODEL,
      max_tokens: MAX_TOKENS,
      // Pensar ajuda no raciocinio agronomico (ligar NDVI + clima + estagio
      // da cultura). 'medium' porque o produtor esta esperando no WhatsApp.
      thinking: { type: 'adaptive' },
      output_config: { effort: env.SEIVA_EFFORT },
      system: [
        // Bloco estavel primeiro, com o ponto de cache no fim dele.
        // O contexto (nome, talhao, data de hoje) vem depois: muda toda hora
        // e invalidaria o prefixo se viesse antes.
        { type: 'text', text: SYSTEM_BASE, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: buildContextBlock(producer, field, locale) },
      ],
      tools: TOOL_DEFINITIONS,
      messages,
    });

    logger.debug({
      producerId: producer.id,
      iteration,
      stopReason: response.stop_reason,
      cacheRead: response.usage.cache_read_input_tokens,
      cacheWrite: response.usage.cache_creation_input_tokens,
    }, 'volta do agente');

    // Classificador de seguranca recusou. Nao ha content util para ler.
    if (response.stop_reason === 'refusal') {
      logger.warn({ producerId: producer.id, details: response.stop_details }, 'requisicao recusada');
      return { text: t(locale, 'genericError'), attachments: [] };
    }

    messages.push({ role: 'assistant', content: response.content });
    await appendMessage(producer.id, 'assistant', response.content);

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (toolUses.length === 0) {
      finalText = textOf(response.content);
      break;
    }

    // Paralelo de proposito: NDVI e clima sao independentes e cada um leva
    // segundos. Os resultados TEM que voltar numa unica mensagem do usuario,
    // senao o modelo aprende a parar de pedir em paralelo.
    const results = await Promise.all(
      toolUses.map(async (block): Promise<Anthropic.ToolResultBlockParam> => {
        const tool = findTool(block.name);
        if (!tool) {
          return { type: 'tool_result', tool_use_id: block.id, content: `Ferramenta desconhecida: ${block.name}`, is_error: true };
        }
        try {
          const out = await tool.run(block.input, ctx);
          return { type: 'tool_result', tool_use_id: block.id, content: out };
        } catch (err) {
          // Uma ferramenta nao deveria lancar, mas se lancar o turno continua:
          // o modelo recebe o erro e explica ao produtor.
          logger.error({ err: String(err), tool: block.name }, 'ferramenta lancou excecao');
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Falha interna nesta consulta. Nao invente o dado; diga que nao conseguiu obter agora.',
            is_error: true,
          };
        }
      }),
    );

    const toolResultMessage: Anthropic.MessageParam = { role: 'user', content: results };
    messages.push(toolResultMessage);
    await appendMessage(producer.id, 'user', results);

    // Ultima volta permitida e ainda pedindo ferramenta: fecha com o que tem.
    if (iteration === MAX_TOOL_ITERATIONS - 1) {
      logger.warn({ producerId: producer.id }, 'teto de voltas de ferramenta atingido');
      finalText = textOf(response.content);
    }
  }

  if (!finalText.trim()) finalText = t(locale, 'genericError');

  if (looksLikeFabricatedIndex(finalText, ctx.satelliteToolSucceeded)) {
    // Nao reescrevemos: so marcamos. Um pico aqui e sinal de regressao no prompt.
    logger.error({ producerId: producer.id }, 'resposta cita indice de satelite sem dado real');
  }

  return {
    text: applyPesticideWarning(finalText, locale),
    attachments: ctx.attachments,
  };
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
