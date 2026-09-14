import Fastify from 'fastify';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { whatsappRoutes } from './channels/whatsapp/routes.js';
import { closePool, pool } from './db/pool.js';
import { startAlertWorker, stopAlertWorker } from './jobs/proactive.js';

const app = Fastify({
  loggerInstance: logger,
  // A Meta pode mandar varias mensagens num POST so.
  bodyLimit: 5 * 1024 * 1024,
});

/**
 * Guarda o corpo bruto: a validacao do X-Hub-Signature-256 e sobre os bytes
 * originais, e o parser JSON do Fastify descarta esse buffer.
 */
app.addHook('onRequest', async (req) => {
  (req as typeof req & { rawBody?: Buffer }).rawBody = undefined;
});

app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  (req as typeof req & { rawBody?: Buffer }).rawBody = body as Buffer;
  try {
    done(null, JSON.parse((body as Buffer).toString('utf8')));
  } catch (err) {
    done(err as Error, undefined);
  }
});

app.get('/health', async () => {
  await pool.query('SELECT 1');
  return { status: 'ok', service: 'seiva' };
});

await app.register(whatsappRoutes);

const server = await app.listen({ port: env.PORT, host: '0.0.0.0' });
logger.info({ url: server }, 'SEIVA no ar');

if (env.NODE_ENV !== 'test') startAlertWorker();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      logger.info({ signal }, 'encerrando');
      await stopAlertWorker().catch(() => undefined);
      await app.close().catch(() => undefined);
      await closePool().catch(() => undefined);
      process.exit(0);
    })();
  });
}
