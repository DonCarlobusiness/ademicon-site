/** Estatísticas históricas — descrevem o passado; NÃO são previsão. */

export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/** Volatilidade anualizada a partir de retornos diários (mercado 24/7 → 365). */
export function annualizedVolatility(closes: number[], periodsPerYear = 365): number {
  return stdev(logReturns(closes)) * Math.sqrt(periodsPerYear);
}

/** Maior queda pico→vale observada (fração positiva, ex.: 0.35 = −35%). */
export function maxDrawdown(closes: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    if (peak > 0) mdd = Math.max(mdd, (peak - c) / peak);
  }
  return mdd;
}
