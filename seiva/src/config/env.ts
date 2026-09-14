import { z } from 'zod';

/**
 * Env validado no boot. Se faltar algo essencial o processo nao sobe —
 * e melhor falhar no deploy do que responder besteira para um produtor.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  PUBLIC_BASE_URL: z.url().optional(),
  DEFAULT_LOCALE: z.enum(['pt-BR', 'es-419', 'en']).default('pt-BR'),

  ANTHROPIC_API_KEY: z.string().min(1),
  SEIVA_MODEL: z.string().default('claude-opus-5'),
  SEIVA_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('medium'),

  WHATSAPP_PROVIDER: z.enum(['meta', 'evolution']).default('meta'),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_GRAPH_VERSION: z.string().default('v21.0'),

  EVOLUTION_BASE_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  SENTINEL_HUB_CLIENT_ID: z.string().optional(),
  SENTINEL_HUB_CLIENT_SECRET: z.string().optional(),
  SENTINEL_HUB_BASE_URL: z.string().default('https://services.sentinel-hub.com'),
  SENTINEL_MAX_CLOUD_COVER: z.coerce.number().min(0).max(1).default(0.35),

  OPEN_METEO_BASE_URL: z.string().default('https://api.open-meteo.com'),

  STT_PROVIDER: z.enum(['whisper_local', 'none']).default('none'),
  STT_BASE_URL: z.string().optional(),
  TTS_PROVIDER: z.enum(['none', 'http']).default('none'),
  TTS_BASE_URL: z.string().optional(),
  TTS_VOICE: z.string().default('pt-BR'),

  MARKET_PRICE_BASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuracao invalida (.env):\n${issues}`);
  }
  const env = parsed.data;

  // Em producao a assinatura do webhook nao e opcional: sem ela qualquer um
  // consegue injetar mensagens no agente em nome de um produtor.
  if (env.NODE_ENV === 'production' && env.WHATSAPP_PROVIDER === 'meta' && !env.WHATSAPP_APP_SECRET) {
    throw new Error('WHATSAPP_APP_SECRET e obrigatorio em producao (validacao X-Hub-Signature-256).');
  }
  return env;
}

export const env: Env = load();
export const isProd = env.NODE_ENV === 'production';
