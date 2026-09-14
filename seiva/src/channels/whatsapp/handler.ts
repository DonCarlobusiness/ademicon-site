import type { InboundMessage, Locale } from '../../domain/types.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { t, detectLocale } from '../../i18n/index.js';
import {
  claimMessage, countRecentUserMessages, deleteProducer, findOrCreateProducer,
  getPrimaryField, updateProducer,
} from '../../db/repo.js';
import { downloadMedia, markTyping, sendText } from './client.js';
import { handleOnboarding, maybeRegisterFieldFromPin } from './onboarding.js';
import { buildUserContent, deliverReply } from './reply.js';
import { transcribe } from '../../services/media/stt.js';
import { runAgent } from '../../agent/runner.js';

const SUPPORTED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
/**
 * Teto de mensagens por produtor por hora. Um produtor de verdade nao passa
 * nem perto disso; o limite existe para um loop ou um numero abusivo nao
 * virar conta de API.
 */
const MAX_MESSAGES_PER_HOUR = 60;
/** Limite da Files/Messages API para PDF em base64 no corpo da requisicao. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const DELETE_REQUEST = /apagar meus dados|borrar mis datos|delete my data/i;

/**
 * Orquestra uma mensagem recebida. Roda FORA do ciclo do webhook: a Meta
 * exige 200 em poucos segundos e uma volta com satelite passa disso.
 */
export async function handleInbound(inbound: InboundMessage): Promise<void> {
  // A Meta reentrega o mesmo evento quando o 200 demora. Sem isto o produtor
  // recebe a resposta duas vezes (e pagamos o dobro de tokens).
  const first = await claimMessage(inbound.providerMessageId);
  if (!first) {
    logger.debug({ messageId: inbound.providerMessageId }, 'mensagem repetida, ignorando');
    return;
  }

  const provisionalLocale = detectLocale(inbound.text, env.DEFAULT_LOCALE);
  let producer = await findOrCreateProducer(inbound.waId, provisionalLocale);
  const locale: Locale = producer.locale ?? provisionalLocale;

  void markTyping(inbound.providerMessageId);

  try {
    // 1. Texto: do corpo da mensagem ou transcrito do audio.
    let text = inbound.text;
    if (inbound.kind === 'audio' && inbound.mediaId) {
      const media = await downloadMedia(inbound.mediaId);
      text = await transcribe(media.buffer, media.mimeType);
      if (!text) {
        await sendText(inbound.waId, t(locale, 'audioTranscriptionFailed'));
        return;
      }
      logger.debug({ producerId: producer.id }, 'audio transcrito');
    }

    // 2. LGPD: exclusao a qualquer momento, sem passar pelo modelo.
    if (text && DELETE_REQUEST.test(text)) {
      await deleteProducer(producer.id);
      await sendText(inbound.waId, t(locale, 'dataDeleted'));
      logger.info({ waId: inbound.waId }, 'dados apagados a pedido do produtor');
      return;
    }

    // 2b. Limite de uso por produtor.
    if (await countRecentUserMessages(producer.id) >= MAX_MESSAGES_PER_HOUR) {
      logger.warn({ producerId: producer.id }, 'produtor atingiu o limite por hora');
      await sendText(inbound.waId, t(locale, 'rateLimited'));
      return;
    }

    // 3. Ajusta o idioma se o produtor mudou de lingua.
    const detected = detectLocale(text, locale);
    if (detected !== producer.locale) {
      producer = await updateProducer(producer.id, { locale: detected });
    }
    const activeLocale = producer.locale;

    // 4. Onboarding e deterministico e vem antes do agente.
    const onboarding = await handleOnboarding(producer, inbound, text, activeLocale);
    if (onboarding.handled) {
      if (onboarding.reply) {
        await deliverReply(inbound.waId, { text: onboarding.reply }, inbound.kind, activeLocale);
      }
      return;
    }

    // 5. Pin enviado depois do onboarding cadastra talhao se faltar.
    if (await maybeRegisterFieldFromPin(producer, inbound)) {
      logger.info({ producerId: producer.id }, 'talhao criado a partir de pin avulso');
    }

    // 6. Imagens do turno.
    const images: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }[] = [];
    if (inbound.kind === 'image' && inbound.mediaId) {
      const media = await downloadMedia(inbound.mediaId);
      if (SUPPORTED_IMAGE.has(media.mimeType)) {
        images.push({
          base64: media.buffer.toString('base64'),
          mediaType: media.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        });
      } else {
        await sendText(inbound.waId, t(activeLocale, 'unsupportedMedia'));
        return;
      }
    }

    // 6b. PDF (tipicamente o laudo de solo) vai como bloco de documento.
    const documents: { base64: string; filename: string }[] = [];
    if (inbound.kind === 'document' && inbound.mediaId) {
      const media = await downloadMedia(inbound.mediaId);
      if (media.mimeType === 'application/pdf') {
        if (media.buffer.byteLength > MAX_PDF_BYTES) {
          await sendText(inbound.waId, t(activeLocale, 'documentTooBig'));
          return;
        }
        documents.push({ base64: media.buffer.toString('base64'), filename: 'laudo.pdf' });
      } else {
        await sendText(inbound.waId, t(activeLocale, 'unsupportedMedia'));
        return;
      }
    }

    if (inbound.kind === 'unsupported') {
      await sendText(inbound.waId, t(activeLocale, 'unsupportedMedia'));
      return;
    }

    // 7. Agente.
    const field = await getPrimaryField(producer.id);
    const locationNote = inbound.location
      ? `[O produtor enviou a localizacao: ${inbound.location.lat.toFixed(5)}, ${inbound.location.lon.toFixed(5)}]`
      : null;

    if (!text && images.length === 0 && documents.length === 0 && !locationNote) return;

    const reply = await runAgent({
      producer,
      field,
      locale: activeLocale,
      userContent: buildUserContent({ text, images, documents, locationNote }),
      images,
      documents,
    });

    await deliverReply(inbound.waId, reply, inbound.kind, activeLocale);
  } catch (err) {
    logger.error({ err: String(err), producerId: producer.id }, 'falha ao tratar mensagem');
    // O produtor nunca fica sem resposta.
    await sendText(inbound.waId, t(locale, 'genericError')).catch(() => undefined);
  }
}
