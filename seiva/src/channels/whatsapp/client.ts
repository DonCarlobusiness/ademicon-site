import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { FormData, request } from 'undici';
import { env } from '../../config/env.js';
import { httpJson, httpBuffer } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';

/** Limite duro da Meta para corpo de mensagem de texto. */
export const WHATSAPP_TEXT_LIMIT = 4096;

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${path}`;
}

function authHeaders(): Record<string, string> {
  return { authorization: `Bearer ${env.WHATSAPP_TOKEN ?? ''}` };
}

/**
 * Quebra texto longo em partes que cabem no limite da Meta, cortando em
 * paragrafo ou frase — nao no meio de uma palavra.
 */
export function splitForWhatsApp(text: string, limit = WHATSAPP_TEXT_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    let cut = window.lastIndexOf('\n\n');
    if (cut < limit * 0.5) cut = window.lastIndexOf('\n');
    if (cut < limit * 0.5) cut = window.lastIndexOf('. ');
    if (cut < limit * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = limit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length > 0) parts.push(rest);
  return parts;
}

export async function sendText(to: string, body: string): Promise<void> {
  for (const chunk of splitForWhatsApp(body)) {
    await httpJson(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
      method: 'POST',
      headers: authHeaders(),
      label: 'whatsapp.sendText',
      body: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: chunk },
      },
    });
  }
}

export async function sendImage(to: string, filePath: string, caption?: string): Promise<void> {
  const mediaId = await uploadMedia(filePath, 'image/png');
  await httpJson(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: 'POST',
    headers: authHeaders(),
    label: 'whatsapp.sendImage',
    body: {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      // Legenda tem limite menor que o texto solto.
      image: { id: mediaId, ...(caption ? { caption: caption.slice(0, 1024) } : {}) },
    },
  });
}

export async function sendAudio(to: string, audio: Buffer): Promise<void> {
  const mediaId = await uploadBuffer(audio, 'audio/ogg', 'resposta.ogg');
  await httpJson(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: 'POST',
    headers: authHeaders(),
    label: 'whatsapp.sendAudio',
    body: { messaging_product: 'whatsapp', to, type: 'audio', audio: { id: mediaId } },
  });
}

/** Baixa midia recebida: primeiro resolve a URL, depois o binario. */
export async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const meta = await httpJson<{ url: string; mime_type: string }>(graphUrl(mediaId), {
    headers: authHeaders(),
    label: 'whatsapp.mediaMeta',
  });
  const buffer = await httpBuffer(meta.url, {
    headers: authHeaders(),
    label: 'whatsapp.mediaDownload',
    timeoutMs: 30_000,
  });
  return { buffer, mimeType: meta.mime_type };
}

async function uploadMedia(filePath: string, mimeType: string): Promise<string> {
  return uploadBuffer(await readFile(filePath), mimeType, basename(filePath));
}

async function uploadBuffer(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const res = await request(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/media`), {
    method: 'POST',
    headers: authHeaders(),
    body: form,
    headersTimeout: 30_000,
    bodyTimeout: 30_000,
  });
  if (res.statusCode >= 400) {
    const text = await res.body.text();
    logger.error({ status: res.statusCode, body: text.slice(0, 300) }, 'upload de midia falhou');
    throw new Error(`upload de midia falhou: ${res.statusCode}`);
  }
  const json = (await res.body.json()) as { id: string };
  return json.id;
}

/** Indicador de "digitando" — o produtor sabe que a resposta vem vindo. */
export async function markTyping(messageId: string): Promise<void> {
  try {
    await httpJson(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
      method: 'POST',
      headers: authHeaders(),
      label: 'whatsapp.typing',
      retries: 0,
      body: {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' },
      },
    });
  } catch {
    // Puramente cosmetico: nunca deve impedir a resposta.
  }
}
