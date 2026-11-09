import type { Freshness, ObtainMethod, ProviderId, SourceRecord } from "./types";
import { ageMinutes } from "./time";

export interface FreshnessPolicy {
  /** até este limite (min): "atual" */
  currentMax: number;
  /** até este limite (min): "defasado"; acima: "desatualizado" */
  staleMax: number;
}

export function classifyFreshness(age: number | null, policy: FreshnessPolicy): Freshness {
  if (age === null) return "indisponivel";
  if (age <= policy.currentMax) return "atual";
  if (age <= policy.staleMax) return "defasado";
  return "desatualizado";
}

export function makeSource(args: {
  id: string;
  provider: ProviderId | "catalogo" | "usuario";
  label: string;
  url: string;
  method: ObtainMethod;
  collectedAt: Date;
  referenceAt: string | null;
  policy: FreshnessPolicy;
  confidence: number;
  note?: string;
}): SourceRecord {
  const age = ageMinutes(args.referenceAt, args.collectedAt);
  return {
    id: args.id,
    provider: args.provider,
    label: args.label,
    url: args.url,
    method: args.method,
    collectedAt: args.collectedAt.toISOString(),
    referenceAt: args.referenceAt,
    ageMinutes: age,
    freshness: classifyFreshness(age, args.policy),
    confidence: args.confidence,
    note: args.note,
  };
}

const DAY = 1440;
/** Séries diárias oficiais: dados de D-1 a D-4 (fim de semana/feriado) são normais. */
export const DAILY_OFFICIAL: FreshnessPolicy = { currentMax: 5 * DAY, staleMax: 10 * DAY };
/** Séries mensais (IPCA): publicadas com ~1 mês de defasagem. */
export const MONTHLY_OFFICIAL: FreshnessPolicy = { currentMax: 75 * DAY, staleMax: 120 * DAY };
/** Mercado contínuo (cripto). */
export const REALTIME_MARKET: FreshnessPolicy = { currentMax: 10, staleMax: 120 };
