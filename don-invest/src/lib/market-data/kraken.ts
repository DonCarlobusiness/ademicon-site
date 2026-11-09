/**
 * Conector Kraken — SOMENTE endpoints públicos de dados de mercado.
 * Nenhuma conta é conectada e nenhuma ordem é enviada.
 * Docs: https://docs.kraken.com/api/docs/rest-api/get-ticker-information
 */
import { z } from "zod";
import { cached, fetchJson, type SafeFetchOptions } from "./http";
import { REALTIME_MARKET, DAILY_OFFICIAL, makeSource } from "./source";
import type { ProviderResult, SourceRecord } from "./types";
import { annualizedVolatility, maxDrawdown } from "../finance/stats";

const BASE = "https://api.kraken.com/0/public";

/**
 * Mapeamento EXPLÍCITO de pares. Não presumimos que o identificador da Kraken
 * corresponda a outros tickers (ex.: Kraken usa "XBT"/"XXBTZUSD" para Bitcoin).
 */
export const KRAKEN_PAIRS = {
  BTCUSD: { request: "XBTUSD", resultKey: "XXBTZUSD", asset: "Bitcoin (BTC)", base: "BTC", quote: "USD" },
  ETHUSD: { request: "ETHUSD", resultKey: "XETHZUSD", asset: "Ether (ETH)", base: "ETH", quote: "USD" },
} as const;
export type KrakenPairId = keyof typeof KRAKEN_PAIRS;

const KrakenEnvelope = z.object({ error: z.array(z.string()), result: z.record(z.string(), z.unknown()).optional() });

const TickerSchema = z.object({
  a: z.tuple([z.string(), z.string(), z.string()]),
  b: z.tuple([z.string(), z.string(), z.string()]),
  c: z.tuple([z.string(), z.string()]),
  v: z.tuple([z.string(), z.string()]),
  l: z.tuple([z.string(), z.string()]),
  h: z.tuple([z.string(), z.string()]),
  o: z.string(),
});

const AssetPairSchema = z.object({
  altname: z.string(),
  ordermin: z.string().optional(),
  costmin: z.string().optional(),
  status: z.string().optional(),
  fees: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export interface KrakenTicker {
  pair: KrakenPairId;
  asset: string;
  ask: number;
  bid: number;
  last: number;
  low24h: number;
  high24h: number;
  open24h: number;
  volume24h: number;
  spreadPct: number;
  change24hPct: number;
}

export interface KrakenPairInfo {
  pair: KrakenPairId;
  orderMinBase: number | null;
  costMinQuote: number | null;
  status: string | null;
  takerFeePctBaseTier: number | null;
}

export interface KrakenHistory {
  pair: KrakenPairId;
  days: number;
  firstDate: string;
  lastDate: string;
  annualizedVol: number;
  maxDrawdown: number;
  returnPeriodPct: number;
}

function unwrap(raw: unknown): Record<string, unknown> {
  const env = KrakenEnvelope.parse(raw);
  if (env.error.length > 0) throw new Error(`Kraken: ${env.error.join(", ")}`);
  if (!env.result) throw new Error("Kraken: resposta sem campo result");
  return env.result;
}

export function parseTicker(raw: unknown, pair: KrakenPairId): KrakenTicker {
  const meta = KRAKEN_PAIRS[pair];
  const result = unwrap(raw);
  const entry = result[meta.resultKey];
  if (!entry) throw new Error(`Kraken: par ${meta.resultKey} ausente na resposta`);
  const t = TickerSchema.parse(entry);
  const ask = Number(t.a[0]);
  const bid = Number(t.b[0]);
  const last = Number(t.c[0]);
  const open = Number(t.o);
  const vals = [ask, bid, last, open];
  if (vals.some((x) => !Number.isFinite(x) || x <= 0)) throw new Error("Kraken: valores de ticker inválidos");
  const mid = (ask + bid) / 2;
  return {
    pair,
    asset: meta.asset,
    ask,
    bid,
    last,
    low24h: Number(t.l[1]),
    high24h: Number(t.h[1]),
    open24h: open,
    volume24h: Number(t.v[1]),
    spreadPct: ((ask - bid) / mid) * 100,
    change24hPct: ((last - open) / open) * 100,
  };
}

export function parseAssetPair(raw: unknown, pair: KrakenPairId): KrakenPairInfo {
  const meta = KRAKEN_PAIRS[pair];
  const result = unwrap(raw);
  const entry = result[meta.resultKey];
  if (!entry) throw new Error(`Kraken: par ${meta.resultKey} ausente em AssetPairs`);
  const p = AssetPairSchema.parse(entry);
  const fee = p.fees && p.fees.length > 0 ? p.fees[0][1] : null;
  return {
    pair,
    orderMinBase: p.ordermin ? Number(p.ordermin) : null,
    costMinQuote: p.costmin ? Number(p.costmin) : null,
    status: p.status ?? null,
    takerFeePctBaseTier: fee,
  };
}

export function parseOhlc(raw: unknown, pair: KrakenPairId, days = 365): KrakenHistory {
  const meta = KRAKEN_PAIRS[pair];
  const result = unwrap(raw);
  const rows = result[meta.resultKey];
  if (!Array.isArray(rows) || rows.length < 30) throw new Error("Kraken: histórico OHLC insuficiente");
  const recent = (rows as unknown[][]).slice(-days);
  const closes = recent.map((r) => Number(r[4]));
  const times = recent.map((r) => Number(r[0]));
  return {
    pair,
    days: recent.length,
    firstDate: new Date(times[0] * 1000).toISOString(),
    lastDate: new Date(times[times.length - 1] * 1000).toISOString(),
    annualizedVol: annualizedVolatility(closes),
    maxDrawdown: maxDrawdown(closes),
    returnPeriodPct: (closes[closes.length - 1] / closes[0] - 1) * 100,
  };
}

/** Checagens de consistência interna do ticker. Retorna lista de alertas. */
export function tickerConsistency(t: KrakenTicker): string[] {
  const issues: string[] = [];
  if (t.bid > t.ask) issues.push("bid maior que ask (livro invertido)");
  if (t.last < t.low24h * 0.99 || t.last > t.high24h * 1.01) issues.push("último preço fora da faixa mín/máx de 24h");
  if (t.spreadPct > 1) issues.push(`spread elevado (${t.spreadPct.toFixed(2)}%)`);
  return issues;
}

export interface KrakenAssetData {
  ticker: KrakenTicker;
  info: KrakenPairInfo | null;
  history: KrakenHistory | null;
  consistencyIssues: string[];
  sources: SourceRecord[];
}

export async function fetchKrakenAsset(pair: KrakenPairId, opts: SafeFetchOptions & { now?: Date } = {}): Promise<KrakenAssetData & { fromCache: boolean }> {
  const meta = KRAKEN_PAIRS[pair];
  const tickerUrl = `${BASE}/Ticker?pair=${meta.request}`;
  const pairUrl = `${BASE}/AssetPairs?pair=${meta.request}`;
  const ohlcUrl = `${BASE}/OHLC?pair=${meta.request}&interval=1440`;

  const tk = await cached(`kraken:${tickerUrl}`, 60_000, () => fetchJson(tickerUrl, opts));
  const ticker = parseTicker(tk.value, pair);
  const collected = tk.fromCache ? new Date(tk.storedAt) : (opts.now ?? new Date());
  const now = opts.now ?? new Date();
  const sources: SourceRecord[] = [
    makeSource({
      id: `kraken-ticker-${pair}`,
      provider: "kraken_public",
      label: `Kraken Ticker ${meta.request} (dados públicos)`,
      url: tickerUrl,
      method: "api_oficial_publica",
      collectedAt: now,
      // O endpoint Ticker não traz timestamp; a referência é o momento da coleta.
      referenceAt: collected.toISOString(),
      policy: REALTIME_MARKET,
      confidence: 0.9,
      note: "Ticker sem timestamp próprio: referência = horário da coleta. Preço em USD na Kraken, não é preço contratável em BRL.",
    }),
  ];

  let info: KrakenPairInfo | null = null;
  try {
    const ap = await cached(`kraken:${pairUrl}`, 6 * 3600_000, () => fetchJson(pairUrl, opts));
    info = parseAssetPair(ap.value, pair);
    sources.push(
      makeSource({
        id: `kraken-pairs-${pair}`,
        provider: "kraken_public",
        label: `Kraken AssetPairs ${meta.request} (mínimo de ordem, status, taxas)`,
        url: pairUrl,
        method: "api_oficial_publica",
        collectedAt: now,
        referenceAt: (ap.fromCache ? new Date(ap.storedAt) : now).toISOString(),
        policy: DAILY_OFFICIAL,
        confidence: 0.9,
      }),
    );
  } catch {
    info = null;
  }

  let history: KrakenHistory | null = null;
  try {
    const oh = await cached(`kraken:${ohlcUrl}`, 3600_000, () => fetchJson(ohlcUrl, opts));
    history = parseOhlc(oh.value, pair);
    sources.push(
      makeSource({
        id: `kraken-ohlc-${pair}`,
        provider: "kraken_public",
        label: `Kraken OHLC diário ${meta.request} (histórico ${history.days} dias)`,
        url: ohlcUrl,
        method: "api_oficial_publica",
        collectedAt: now,
        referenceAt: history.lastDate,
        policy: { currentMax: 2 * 1440, staleMax: 5 * 1440 },
        confidence: 0.85,
        note: "Histórico descreve o passado; não é previsão.",
      }),
    );
  } catch {
    history = null;
  }

  return { ticker, info, history, consistencyIssues: tickerConsistency(ticker), sources, fromCache: tk.fromCache };
}

export async function fetchKraken(opts: SafeFetchOptions & { now?: Date } = {}): Promise<ProviderResult<Partial<Record<KrakenPairId, KrakenAssetData>>>> {
  const t0 = Date.now();
  const pairs = Object.keys(KRAKEN_PAIRS) as KrakenPairId[];
  const settled = await Promise.allSettled(pairs.map((p) => fetchKrakenAsset(p, opts)));
  const data: Partial<Record<KrakenPairId, KrakenAssetData>> = {};
  const errs: string[] = [];
  const sources: SourceRecord[] = [];
  let allCache = true;
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      data[pairs[i]] = r.value;
      sources.push(...r.value.sources);
      allCache &&= r.value.fromCache;
    } else errs.push(`${pairs[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
  const ok = Object.keys(data).length;
  return {
    provider: "kraken_public",
    status: ok === pairs.length ? "ok" : ok > 0 ? "parcial" : "falhou",
    data: ok ? data : null,
    sources,
    error: errs.length ? errs.join("; ") : undefined,
    durationMs: Date.now() - t0,
    fromCache: ok > 0 && allCache,
  };
}
