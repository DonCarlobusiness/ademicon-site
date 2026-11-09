/** Limitador simples em memória (janela deslizante de 60 s por chave). */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limitPerMin = Number(process.env.RESEARCH_RATE_LIMIT_PER_MIN || 6)): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= limitPerMin) {
    hits.set(key, arr);
    return { ok: false, retryAfterSec: Math.ceil((60_000 - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true, retryAfterSec: 0 };
}
