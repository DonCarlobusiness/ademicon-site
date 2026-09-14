import { request } from 'undici';
import { logger } from './logger.js';

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  /** Rotulo para log — nunca inclua segredo aqui. */
  label: string;
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly bodyText: string, label: string) {
    super(`${label}: HTTP ${status}`);
    this.name = 'HttpError';
  }
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Toda chamada externa passa por aqui: timeout, retry com backoff e log.
 * Conexao de campo cai; sem retry o produtor recebe "deu erro" a toa.
 */
export async function httpJson<T>(url: string, opts: HttpOptions): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = 15_000, retries = 2, label } = opts;
  const isForm = typeof body === 'string';
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await request(url, {
        method,
        headers: {
          accept: 'application/json',
          ...(body !== undefined
            ? { 'content-type': isForm ? 'application/x-www-form-urlencoded' : 'application/json' }
            : {}),
          ...headers,
        },
        body: body === undefined ? undefined : isForm ? (body as string) : JSON.stringify(body),
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
      });

      if (res.statusCode >= 400) {
        const text = await res.body.text();
        const err = new HttpError(res.statusCode, text.slice(0, 500), label);
        if (RETRYABLE.has(res.statusCode) && attempt < retries) {
          await sleep(backoffMs(attempt));
          lastErr = err;
          continue;
        }
        throw err;
      }
      return (await res.body.json()) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof HttpError && !RETRYABLE.has(err.status)) throw err;
      if (attempt === retries) break;
      await sleep(backoffMs(attempt));
    }
  }
  logger.warn({ label, err: String(lastErr) }, 'chamada externa falhou');
  throw lastErr instanceof Error ? lastErr : new Error(`${label}: falha desconhecida`);
}

/** Baixa binario (midia do WhatsApp, PNG do Sentinel). */
export async function httpBuffer(url: string, opts: HttpOptions): Promise<Buffer> {
  const { method = 'GET', headers = {}, body, timeoutMs = 20_000, label } = opts;
  const res = await request(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
  });
  if (res.statusCode >= 400) {
    throw new HttpError(res.statusCode, (await res.body.text()).slice(0, 500), label);
  }
  return Buffer.from(await res.body.arrayBuffer());
}

function backoffMs(attempt: number): number {
  // 400ms, 800ms, 1600ms + jitter
  return 400 * 2 ** attempt + Math.floor(Math.random() * 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
