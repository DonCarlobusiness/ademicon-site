import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { FormData, request } from 'undici';

/**
 * Whisper via servico HTTP (faster-whisper / whisper.cpp server).
 * Retorna null quando nao da para transcrever — o agente entao pede para
 * o produtor repetir, em vez de responder a um audio que nao entendeu.
 */
export async function transcribe(audio: Buffer, mimeType: string): Promise<string | null> {
  if (env.STT_PROVIDER === 'none' || !env.STT_BASE_URL) return null;

  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), 'audio.ogg');
    form.append('language', 'pt');
    form.append('response_format', 'json');

    const res = await request(`${env.STT_BASE_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
      headersTimeout: 60_000,
      bodyTimeout: 60_000,
    });
    if (res.statusCode >= 400) {
      logger.warn({ status: res.statusCode }, 'stt retornou erro');
      return null;
    }
    const json = (await res.body.json()) as { text?: string };
    const text = json.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (err) {
    logger.warn({ err: String(err) }, 'transcricao falhou');
    return null;
  }
}
