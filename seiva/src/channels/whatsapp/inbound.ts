import { z } from 'zod';
import type { InboundMessage, InboundKind } from '../../domain/types.js';

/**
 * Payload da Meta Cloud API. Validamos com zod porque e entrada externa:
 * um campo faltando nao pode derrubar o webhook.
 */
const metaMessage = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  audio: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
  voice: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
  image: z.object({ id: z.string(), mime_type: z.string().optional(), caption: z.string().optional() }).optional(),
  document: z.object({ id: z.string(), mime_type: z.string().optional(), caption: z.string().optional() }).optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  button: z.object({ text: z.string() }).optional(),
  interactive: z.object({
    button_reply: z.object({ title: z.string() }).optional(),
    list_reply: z.object({ title: z.string() }).optional(),
  }).optional(),
});

const metaWebhook = z.object({
  object: z.string().optional(),
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        contacts: z.array(z.object({
          wa_id: z.string(),
          profile: z.object({ name: z.string() }).optional(),
        })).optional(),
        messages: z.array(metaMessage).optional(),
        statuses: z.array(z.unknown()).optional(),
      }),
    })).optional(),
  })).optional(),
});

export function parseMetaWebhook(body: unknown): InboundMessage[] {
  const parsed = metaWebhook.safeParse(body);
  if (!parsed.success) return [];

  const out: InboundMessage[] = [];
  for (const entry of parsed.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      // 'statuses' sao recibos de entrega, nao mensagens do produtor.
      const profileName = value.contacts?.[0]?.profile?.name ?? null;

      for (const m of value.messages ?? []) {
        const media = m.audio ?? m.voice ?? m.image ?? m.document;
        out.push({
          providerMessageId: m.id,
          waId: m.from,
          kind: kindOf(m.type),
          text:
            m.text?.body ??
            m.button?.text ??
            m.interactive?.button_reply?.title ??
            m.interactive?.list_reply?.title ??
            m.image?.caption ??
            m.document?.caption ??
            null,
          mediaId: media?.id ?? null,
          mimeType: media?.mime_type ?? null,
          location: m.location
            ? { lat: m.location.latitude, lon: m.location.longitude }
            : null,
          timestamp: new Date(Number(m.timestamp) * 1000),
          profileName,
        });
      }
    }
  }
  return out;
}

function kindOf(type: string): InboundKind {
  switch (type) {
    case 'text':
    case 'button':
    case 'interactive':
      return 'text';
    case 'audio':
    case 'voice':
      return 'audio';
    case 'image':
      return 'image';
    case 'location':
      return 'location';
    case 'document':
      return 'document';
    default:
      return 'unsupported';
  }
}
