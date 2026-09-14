import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

/**
 * Cliente unico. O SDK ja faz retry (429/5xx/rede); nao empilhar outro por cima.
 * Timeout generoso porque uma volta com satelite + clima demora.
 */
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 120_000,
});
