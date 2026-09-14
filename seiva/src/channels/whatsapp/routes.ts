import type { FastifyInstance, FastifyRequest } from 'fastify';
import { logger } from '../../lib/logger.js';
import { checkVerifyToken, verifyMetaSignature } from './signature.js';
import { parseMetaWebhook } from './inbound.js';
import { handleInbound } from './handler.js';

interface VerifyQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

export async function whatsappRoutes(app: FastifyInstance): Promise<void> {
  // Handshake de verificacao do webhook (a Meta chama uma vez ao configurar).
  app.get('/webhook/whatsapp', async (req: FastifyRequest<{ Querystring: VerifyQuery }>, reply) => {
    const q = req.query;
    if (checkVerifyToken(q['hub.mode'], q['hub.verify_token'])) {
      return reply.type('text/plain').send(q['hub.challenge'] ?? '');
    }
    return reply.code(403).send('forbidden');
  });

  app.post('/webhook/whatsapp', async (req, reply) => {
    // O HMAC e sobre os bytes originais: reserializar o JSON quebra a conta.
    const raw = (req as FastifyRequest & { rawBody?: Buffer }).rawBody;
    if (!raw || !verifyMetaSignature(raw, req.headers['x-hub-signature-256'] as string | undefined)) {
      logger.warn('assinatura do webhook invalida');
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const messages = parseMetaWebhook(req.body);

    // 200 IMEDIATO. A Meta espera poucos segundos e reentrega se demorar —
    // e uma volta com satelite + clima passa disso com folga. O processamento
    // segue em background; a idempotencia em handleInbound cobre reentrega.
    void reply.code(200).send({ received: messages.length });

    for (const message of messages) {
      handleInbound(message).catch((err) => {
        logger.error({ err: String(err), messageId: message.providerMessageId }, 'processamento falhou');
      });
    }
  });
}
