/**
 * Conector Banco Central do Brasil — SGS (Sistema Gerenciador de Séries Temporais).
 * API pública: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json
 * Endpoint usado: /dados?formato=json&dataInicial=dd/mm/aaaa&dataFinal=dd/mm/aaaa.
 */
import { z } from "zod";
import { cached, fetchJson, type SafeFetchOptions } from "./http";
import { brDateToIso } from "./time";
import { DAILY_OFFICIAL, MONTHLY_OFFICIAL, makeSource, type FreshnessPolicy } from "./source";
import type { ProviderResult, SourceRecord } from "./types";

export type BcbSeriesKey =
  | "selic_meta"
  | "selic_efetiva"
  | "cdi"
  | "ipca_mensal"
  | "ipca_12m"
  | "usdbrl"
  | "poupanca";

export interface BcbSeriesDef {
  key: BcbSeriesKey;
  code: number;
  label: string;
  unit: string;
  frequency: "diaria" | "mensal";
  policy: FreshnessPolicy;
}

/** Catálogo validado contra a API em 09/11/2026 (ver docs/data-sources.md). */
export const BCB_SERIES: Record<BcbSeriesKey, BcbSeriesDef> = {
  selic_meta: { key: "selic_meta", code: 432, label: "Meta Selic definida pelo Copom", unit: "% a.a.", frequency: "diaria", policy: DAILY_OFFICIAL },
  selic_efetiva: { key: "selic_efetiva", code: 1178, label: "Taxa Selic anualizada base 252", unit: "% a.a.", frequency: "diaria", policy: DAILY_OFFICIAL },
  cdi: { key: "cdi", code: 4389, label: "CDI anualizado base 252", unit: "% a.a.", frequency: "diaria", policy: DAILY_OFFICIAL },
  ipca_mensal: { key: "ipca_mensal", code: 433, label: "IPCA — variação mensal", unit: "% a.m.", frequency: "mensal", policy: MONTHLY_OFFICIAL },
  ipca_12m: { key: "ipca_12m", code: 13522, label: "IPCA — acumulado em 12 meses", unit: "%", frequency: "mensal", policy: MONTHLY_OFFICIAL },
  usdbrl: { key: "usdbrl", code: 1, label: "Dólar comercial (venda) — taxa livre", unit: "R$/US$", frequency: "diaria", policy: DAILY_OFFICIAL },
  poupanca: { key: "poupanca", code: 195, label: "Poupança — rentabilidade no período (depósitos a partir de 04/05/2012)", unit: "% no período mensal", frequency: "diaria", policy: DAILY_OFFICIAL },
};

const RawPoint = z.object({
  data: z.string(),
  valor: z.string(),
  dataFim: z.string().optional(),
});
const RawSeries = z.array(RawPoint);

export interface BcbPoint {
  date: string; // ISO UTC
  value: number;
  endDate?: string;
}

export interface BcbSeries {
  def: BcbSeriesDef;
  points: BcbPoint[]; // ordenados por data crescente, sem datas futuras
  latest: BcbPoint;
  url: string;
  source: SourceRecord;
  discardedFuturePoints: number;
}

const fmtBr = (d: Date) => {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("day")}/${g("month")}/${g("year")}`;
};

/**
 * URL por intervalo de datas (dataInicial/dataFinal). Preferimos intervalo a /ultimos/N
 * porque algumas séries (ex.: 432, meta Selic) publicam pontos com datas futuras,
 * e /ultimos/N retornaria apenas o futuro. O BCB limita consultas diárias a 10 anos.
 */
export function bcbUrl(code: number, now: Date, lookbackDays: number): string {
  const start = new Date(now.getTime() - lookbackDays * 86_400_000);
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${encodeURIComponent(fmtBr(start))}&dataFinal=${encodeURIComponent(fmtBr(now))}`;
}

/**
 * Normaliza a resposta do SGS: valida schema, converte decimais, ordena por data
 * (a API não garante ordem) e descarta pontos com data futura (a série 432 —
 * meta Selic — publica a meta vigente para dias à frente).
 */
export function parseBcbSeries(raw: unknown, now: Date = new Date()): { points: BcbPoint[]; discardedFuture: number } {
  const parsed = RawSeries.parse(raw);
  const all = parsed.map((p) => {
    const value = Number(p.valor.replace(",", "."));
    if (!Number.isFinite(value)) throw new Error(`Valor não numérico na série: ${p.valor}`);
    return {
      date: brDateToIso(p.data),
      value,
      endDate: p.dataFim ? brDateToIso(p.dataFim) : undefined,
    };
  });
  all.sort((a, b) => a.date.localeCompare(b.date));
  const points = all.filter((p) => new Date(p.date).getTime() <= now.getTime());
  return { points, discardedFuture: all.length - points.length };
}

export async function fetchBcbSeries(
  key: BcbSeriesKey,
  opts: SafeFetchOptions & { now?: Date } = {},
): Promise<BcbSeries & { fromCache: boolean }> {
  const def = BCB_SERIES[key];
  const now = opts.now ?? new Date();
  const url = bcbUrl(def.code, now, def.frequency === "mensal" ? 400 : 30);
  const { value: raw, fromCache, storedAt } = await cached(`bcb:${url}`, 30 * 60_000, () => fetchJson(url, opts));
  const collectedAt = fromCache ? new Date(storedAt) : (opts.now ?? new Date());
  const { points, discardedFuture } = parseBcbSeries(raw, opts.now ?? new Date());
  if (points.length === 0) throw new Error(`Série ${def.code} sem pontos válidos até a data atual`);
  const latest = points[points.length - 1];
  const source = makeSource({
    id: `bcb-${def.code}`,
    provider: "bcb_sgs",
    label: `BCB/SGS ${def.code} — ${def.label}`,
    url,
    method: "api_oficial_publica",
    collectedAt,
    referenceAt: latest.date,
    policy: def.policy,
    confidence: 0.98,
    note: discardedFuture > 0 ? `${discardedFuture} ponto(s) com data futura descartado(s)` : undefined,
  });
  return { def, points, latest, url, source, discardedFuturePoints: discardedFuture, fromCache };
}

export type MacroSnapshot = Partial<Record<BcbSeriesKey, BcbSeries>>;

/** Busca o conjunto macro. Falhas individuais não derrubam as demais (resultado parcial). */
export async function fetchMacroSnapshot(opts: SafeFetchOptions & { now?: Date } = {}): Promise<ProviderResult<MacroSnapshot> & { errors: Record<string, string> }> {
  const t0 = Date.now();
  const keys = Object.keys(BCB_SERIES) as BcbSeriesKey[];
  const settled = await Promise.allSettled(keys.map((k) => fetchBcbSeries(k, opts)));
  const data: MacroSnapshot = {};
  const errors: Record<string, string> = {};
  const sources: SourceRecord[] = [];
  let allCache = true;
  settled.forEach((r, i) => {
    const k = keys[i];
    if (r.status === "fulfilled") {
      data[k] = r.value;
      sources.push(r.value.source);
      allCache &&= r.value.fromCache;
    } else {
      errors[k] = r.reason instanceof Error ? r.reason.message : String(r.reason);
    }
  });
  const ok = Object.keys(data).length;
  return {
    provider: "bcb_sgs",
    status: ok === keys.length ? "ok" : ok > 0 ? "parcial" : "falhou",
    data: ok > 0 ? data : null,
    sources,
    error: ok < keys.length ? Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join("; ") : undefined,
    durationMs: Date.now() - t0,
    fromCache: ok > 0 && allCache,
    errors,
  };
}
