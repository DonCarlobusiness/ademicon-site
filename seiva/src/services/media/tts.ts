import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { httpBuffer } from '../../lib/http.js';
import type { Locale } from '../../domain/types.js';

const VOICE_BY_LOCALE: Record<Locale, string> = {
  'pt-BR': 'pt-BR',
  'es-419': 'es-MX',
  en: 'en-US',
};

/**
 * Sintetiza a resposta em audio. REGRA DE PRODUTO: audio responde audio.
 * Se o TTS nao estiver configurado ou falhar, devolve null e o chamador
 * manda texto — nunca deixa o produtor sem resposta.
 */
export async function synthesize(text: string, locale: Locale): Promise<Buffer | null> {
  if (env.TTS_PROVIDER === 'none' || !env.TTS_BASE_URL) return null;

  // WhatsApp corta audio longo e o produtor perde o fio; 900 caracteres
  // dao cerca de 1 minuto de fala.
  const speakable = text.length > 900 ? `${text.slice(0, 880)}...` : text;

  try {
    return await httpBuffer(`${env.TTS_BASE_URL}/v1/audio/speech`, {
      method: 'POST',
      label: 'tts.speech',
      timeoutMs: 45_000,
      headers: { accept: 'audio/ogg' },
      body: {
        input: speakable,
        voice: env.TTS_VOICE || VOICE_BY_LOCALE[locale],
        response_format: 'opus',
      },
    });
  } catch (err) {
    logger.warn({ err: String(err) }, 'tts falhou; respondendo em texto');
    return null;
  }
}
