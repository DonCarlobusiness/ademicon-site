import type { ResearchInput } from "./input";
import type { MacroSnapshot } from "../market-data/bcb";
import type { TesouroData } from "../market-data/tesouro";
import type { KrakenAssetData, KrakenPairId } from "../market-data/kraken";
import type { SourceRecord } from "../market-data/types";
import type { ScenarioAssumption } from "../finance/scenarios";

export interface ResearchContext {
  input: ResearchInput;
  now: Date;
  macro: MacroSnapshot | null;
  tesouro: TesouroData | null;
  kraken: Partial<Record<KrakenPairId, KrakenAssetData>> | null;
  sources: Map<string, SourceRecord>;
  /** Premissas usadas nos cenários (frações). null = indisponível */
  hyp: {
    selic: number | null;
    cdi: number | null;
    ipca: number | null;
    usdbrl: number | null;
    poupancaMonthly: number | null;
  };
  assumptions: ScenarioAssumption[];
}

export function addSources(ctx: ResearchContext, list: SourceRecord[]) {
  for (const s of list) ctx.sources.set(s.id, s);
}

export const brl = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const usd = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pctFmt = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const dateFmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short" }).format(new Date(iso)) : "—";
