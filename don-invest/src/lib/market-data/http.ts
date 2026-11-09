/**
 * Fetch seguro: allowlist de hosts, timeout, retry limitado com backoff,
 * cache em memória com TTL e circuit breaker simples por host.
 * Não registra cabeçalhos/segredos em logs.
 */

export const ALLOWED_HOSTS = new Set([
  "api.bcb.gov.br",
  "api.kraken.com",
  "www.tesourotransparente.gov.br",
  "dados.cvm.gov.br",
]);

export class FetchBlockedError extends Error {}
export class CircuitOpenError extends Error {}
export class UpstreamError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export function assertAllowedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchBlockedError(`URL inválida: ${raw}`);
  }
  if (url.protocol !== "https:") throw new FetchBlockedError(`Somente HTTPS é permitido: ${raw}`);
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new FetchBlockedError(`Host não permitido para coleta: ${url.hostname}`);
  }
  return url;
}

// ---------- Cache ----------
interface CacheEntry {
  expires: number;
  value: unknown;
  storedAt: number;
}
const cache = new Map<string, CacheEntry>();

export function cacheGet<T>(key: string): { value: T; storedAt: number } | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return { value: e.value as T, storedAt: e.storedAt };
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  cache.set(key, { value, expires: Date.now() + ttlMs, storedAt: Date.now() });
}

export function cacheClear() {
  cache.clear();
}

// ---------- Circuit breaker ----------
interface CircuitState {
  failures: number;
  openedAt: number | null;
  lastError?: string;
  lastSuccessAt?: number;
}
const circuits = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 3;
const OPEN_MS = 60_000;

function circuit(host: string): CircuitState {
  let c = circuits.get(host);
  if (!c) {
    c = { failures: 0, openedAt: null };
    circuits.set(host, c);
  }
  return c;
}

export function circuitStatus(host: string): {
  state: "fechado" | "aberto" | "meio-aberto";
  lastError?: string;
  lastSuccessAt?: string;
} {
  const c = circuit(host);
  let state: "fechado" | "aberto" | "meio-aberto" = "fechado";
  if (c.openedAt !== null) state = Date.now() - c.openedAt < OPEN_MS ? "aberto" : "meio-aberto";
  return {
    state,
    lastError: c.lastError,
    lastSuccessAt: c.lastSuccessAt ? new Date(c.lastSuccessAt).toISOString() : undefined,
  };
}

export function resetCircuits() {
  circuits.clear();
}

function recordSuccess(host: string) {
  const c = circuit(host);
  c.failures = 0;
  c.openedAt = null;
  c.lastSuccessAt = Date.now();
}

function recordFailure(host: string, err: string) {
  const c = circuit(host);
  c.failures += 1;
  c.lastError = err;
  if (c.failures >= FAILURE_THRESHOLD) c.openedAt = Date.now();
}

// ---------- Fetch ----------
export interface SafeFetchOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * fetch ciente de proxy: se HTTPS_PROXY estiver definido (ambientes corporativos/sandbox),
 * usa o fetch do undici com EnvHttpProxyAgent; caso contrário, o fetch nativo.
 */
let proxyFetch: typeof fetch | null | undefined;
async function defaultFetch(): Promise<typeof fetch> {
  if (proxyFetch !== undefined) return proxyFetch ?? fetch;
  if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    const undici = await import("undici");
    const agent = new undici.EnvHttpProxyAgent();
    proxyFetch = ((input: string, init?: RequestInit) =>
      undici.fetch(input, { ...(init as object), dispatcher: agent } as Parameters<typeof undici.fetch>[1])) as unknown as typeof fetch;
  } else {
    proxyFetch = null;
  }
  return proxyFetch ?? fetch;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Faz a requisição e devolve a Response (corpo ainda não consumido). */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const url = assertAllowedUrl(rawUrl);
  const host = url.hostname;
  const { timeoutMs = 10_000, retries = 2, backoffMs = 400 } = opts;
  const fetchImpl = opts.fetchImpl ?? (await defaultFetch());

  const c = circuit(host);
  if (c.openedAt !== null && Date.now() - c.openedAt < OPEN_MS) {
    throw new CircuitOpenError(`Circuito aberto para ${host} após falhas repetidas: ${c.lastError ?? ""}`);
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json, text/csv, */*", "User-Agent": "DON-INVEST-research/0.1" },
        cache: "no-store",
      });
      if (res.status >= 500 || res.status === 429) {
        throw new UpstreamError(`HTTP ${res.status} de ${host}`, res.status);
      }
      if (!res.ok) {
        // 4xx (exceto 429) não melhora com retry
        const err = new UpstreamError(`HTTP ${res.status} de ${host}`, res.status);
        recordFailure(host, err.message);
        throw err;
      }
      recordSuccess(host);
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (e instanceof UpstreamError && e.status && e.status < 500 && e.status !== 429) throw e;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }
  const msg =
    lastErr instanceof Error
      ? lastErr.name === "AbortError"
        ? `Tempo esgotado (${timeoutMs} ms) consultando ${host}`
        : lastErr.message
      : String(lastErr);
  recordFailure(host, msg);
  throw new UpstreamError(msg);
}

export async function fetchJson<T = unknown>(url: string, opts?: SafeFetchOptions): Promise<T> {
  const res = await safeFetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new UpstreamError(`Resposta não-JSON de ${new URL(url).hostname}`);
  }
}

/** Executa `loader` usando cache TTL; informa se veio do cache. */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ value: T; fromCache: boolean; storedAt: number }> {
  const hit = cacheGet<T>(key);
  if (hit) return { value: hit.value, fromCache: true, storedAt: hit.storedAt };
  const value = await loader();
  cacheSet(key, value, ttlMs);
  return { value, fromCache: false, storedAt: Date.now() };
}
