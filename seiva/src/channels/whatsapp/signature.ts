import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Valida o X-Hub-Signature-256 da Meta sobre o corpo BRUTO da requisicao.
 * Precisa ser o raw body: reserializar o JSON muda bytes e quebra o HMAC.
 *
 * Sem isso qualquer um posta no webhook e fala como se fosse um produtor.
 */
export function verifyMetaSignature(rawBody: Buffer, headerValue: string | undefined): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    // Em dev sem app secret seguimos em frente; em producao o boot ja
    // teria falhado em config/env.ts.
    return env.NODE_ENV !== 'production';
  }
  if (!headerValue?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest();
  const received = Buffer.from(headerValue.slice('sha256='.length), 'hex');
  if (received.length !== expected.length) return false;
  return timingSafeEqual(expected, received);
}

/** Handshake de verificacao do webhook (GET). */
export function checkVerifyToken(mode: string | undefined, token: string | undefined): boolean {
  return mode === 'subscribe' && !!env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN;
}
