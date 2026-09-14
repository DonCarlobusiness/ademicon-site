/**
 * `npm run chat` — conversa com o SEIVA pelo terminal, sem WhatsApp.
 *
 * Serve para testar o agente inteiro (onboarding, ferramentas, satelite,
 * adubacao) tendo apenas ANTHROPIC_API_KEY e Postgres. Sem isso so da para
 * exercitar o agente depois de aprovar um numero na Meta, que leva dias.
 *
 * Reusa o mesmo onboarding e o mesmo runAgent do fluxo real — o que muda e
 * so o transporte (stdout no lugar da Graph API), entao o que voce ve aqui
 * e o que o produtor recebe.
 */
import { createInterface } from 'node:readline/promises';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { stdin, stdout } from 'node:process';
import { env } from '../config/env.js';
import { closePool } from '../db/pool.js';
import { findOrCreateProducer, getPrimaryField, deleteProducer } from '../db/repo.js';
import { handleOnboarding, maybeRegisterFieldFromPin } from '../channels/whatsapp/onboarding.js';
import { buildUserContent } from '../channels/whatsapp/reply.js';
import { runAgent } from '../agent/runner.js';
import { detectLocale } from '../i18n/index.js';
import type { InboundMessage, Locale } from '../domain/types.js';

const WA_ID = process.env.SEIVA_CHAT_WA_ID ?? '5566900000000';

const IMAGE_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/webp'> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

const HELP = `
  SEIVA — modo terminal (numero simulado: ${WA_ID})

  Digite sua mensagem normalmente. Comandos:
    /pin <lat> <lon>   envia uma localizacao (ex: /pin -12.5453 -55.7211)
    /foto <caminho>    envia uma imagem (folha, lavoura, laudo)
    /pdf <caminho>     envia um PDF (laudo de solo)
    /reset             apaga este produtor e recomeca do zero
    /sair              encerra
`;

function inbound(partial: Partial<InboundMessage>): InboundMessage {
  return {
    providerMessageId: `cli.${Date.now()}.${Math.random()}`,
    waId: WA_ID,
    kind: 'text',
    text: null,
    mediaId: null,
    mimeType: null,
    location: null,
    timestamp: new Date(),
    profileName: null,
    ...partial,
  };
}

const rl = createInterface({ input: stdin, output: stdout });
console.log(HELP);

const prompt = (): void => { stdout.write('voce > '); };

try {
  prompt();
  // Iterador async em vez de rl.question() em loop: assim funciona tanto no
  // terminal quanto com entrada redirecionada (echo ... | npm run chat),
  // que e como os testes exercitam este fluxo.
  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) { prompt(); continue; }

    if (line === '/sair' || line === '/exit') break;
    if (line === '/ajuda' || line === '/help') { console.log(HELP); prompt(); continue; }

    let producer = await findOrCreateProducer(WA_ID, env.DEFAULT_LOCALE);

    if (line === '/reset') {
      await deleteProducer(producer.id);
      console.log('seiva> (produtor apagado, proxima mensagem comeca do zero)\n');
      prompt();
      continue;
    }

    // --- monta a mensagem de entrada ---
    let msg: InboundMessage;
    const images: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }[] = [];
    const documents: { base64: string; filename: string }[] = [];

    if (line.startsWith('/pin ')) {
      const [lat, lon] = line.slice(5).trim().split(/[\s,]+/).map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.log('seiva> uso: /pin -12.5453 -55.7211\n');
        prompt();
        continue;
      }
      msg = inbound({ kind: 'location', location: { lat: lat!, lon: lon! } });
    } else if (line.startsWith('/foto ')) {
      const path = line.slice(6).trim();
      const media = IMAGE_TYPES[extname(path).toLowerCase()];
      if (!media) { console.log('seiva> use .jpg, .png ou .webp\n'); prompt(); continue; }
      try {
        images.push({ base64: (await readFile(path)).toString('base64'), mediaType: media });
      } catch { console.log(`seiva> nao consegui abrir ${path}\n`); prompt(); continue; }
      msg = inbound({ kind: 'image', text: 'o que e isso na minha lavoura?' });
    } else if (line.startsWith('/pdf ')) {
      const path = line.slice(5).trim();
      try {
        documents.push({ base64: (await readFile(path)).toString('base64'), filename: 'laudo.pdf' });
      } catch { console.log(`seiva> nao consegui abrir ${path}\n`); prompt(); continue; }
      msg = inbound({ kind: 'document', text: 'segue minha analise de solo' });
    } else {
      msg = inbound({ kind: 'text', text: line });
    }

    // --- mesmo fluxo do WhatsApp, sem a Graph API ---
    const locale: Locale = detectLocale(msg.text, producer.locale);
    const onboarding = await handleOnboarding(producer, msg, msg.text, locale);
    if (onboarding.handled) {
      if (onboarding.reply) console.log(`seiva> ${onboarding.reply}\n`);
      prompt();
      continue;
    }

    if (await maybeRegisterFieldFromPin(producer, msg)) {
      console.log('seiva> (talhao cadastrado a partir do pin)');
    }
    producer = await findOrCreateProducer(WA_ID, locale);
    const field = await getPrimaryField(producer.id);

    const locationNote = msg.location
      ? `[O produtor enviou a localizacao: ${msg.location.lat.toFixed(5)}, ${msg.location.lon.toFixed(5)}]`
      : null;

    process.stdout.write('seiva> (pensando...)\r');
    const reply = await runAgent({
      producer,
      field,
      locale,
      userContent: buildUserContent({ text: msg.text, images, documents, locationNote }),
      images,
      documents,
    });

    console.log(`seiva> ${reply.text}\n`);
    for (const a of reply.attachments) {
      console.log(`       [imagem gerada: ${a.path}]`);
      console.log(`       ${a.caption}\n`);
    }
    prompt();
  }
} finally {
  rl.close();
  await closePool();
}
