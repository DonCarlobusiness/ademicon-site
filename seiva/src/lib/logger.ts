import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Logs estruturados. `redact` evita despejar telefone e token em disco —
 * o numero do produtor e dado pessoal (LGPD).
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-hub-signature-256"]',
      'phone',
      '*.phone',
      'waId',
      '*.waId',
    ],
    censor: '[redacted]',
  },
  base: { service: 'seiva' },
});

export type Logger = typeof logger;
