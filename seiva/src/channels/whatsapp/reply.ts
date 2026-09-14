import type Anthropic from '@anthropic-ai/sdk';
import type { InboundKind, Locale } from '../../domain/types.js';
import { sendAudio, sendImage, sendText } from './client.js';
import { synthesize } from '../../services/media/tts.js';
import { logger } from '../../lib/logger.js';

export interface OutgoingReply {
  text: string;
  attachments?: { path: string; caption: string }[];
}

/**
 * REGRA DE PRODUTO: audio responde audio.
 *
 * Quando o produtor mandou audio, a resposta sai falada — e o texto vai
 * junto, porque ele pode estar no trator sem poder ouvir. Se o TTS nao
 * estiver configurado ou falhar, cai para texto: melhor texto do que silencio.
 */
export async function deliverReply(
  to: string,
  reply: OutgoingReply,
  inboundKind: InboundKind,
  locale: Locale,
): Promise<void> {
  const wantsAudio = inboundKind === 'audio';

  if (wantsAudio) {
    const audio = await synthesize(reply.text, locale);
    if (audio) {
      await sendAudio(to, audio);
      // Texto junto: serve de legenda e fica pesquisavel na conversa.
      await sendText(to, reply.text);
    } else {
      await sendText(to, reply.text);
    }
  } else {
    await sendText(to, reply.text);
  }

  for (const attachment of reply.attachments ?? []) {
    try {
      await sendImage(to, attachment.path, attachment.caption);
    } catch (err) {
      // Mapa e um extra; a resposta principal ja foi entregue.
      logger.warn({ err: String(err) }, 'falha ao enviar imagem anexa');
    }
  }
}

/** Monta o conteudo do turno do usuario para a Messages API. */
export function buildUserContent(parts: {
  text: string | null;
  images: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }[];
  documents?: { base64: string; filename: string }[];
  locationNote: string | null;
}): Anthropic.MessageParam['content'] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const doc of parts.documents ?? []) {
    blocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 },
    });
  }
  for (const img of parts.images) {
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    });
  }
  const text = [parts.locationNote, parts.text].filter(Boolean).join('\n');
  if (text) blocks.push({ type: 'text', text });

  // A API rejeita conteudo vazio.
  if (blocks.length === 0) blocks.push({ type: 'text', text: '(mensagem sem texto)' });
  return blocks;
}
