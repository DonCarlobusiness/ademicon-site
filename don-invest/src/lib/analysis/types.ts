import type { SourceRecord, ProviderStatus, ProviderId } from "../market-data/types";
import type { Horizon, ResearchInput } from "./input";
import type { ScenarioAssumption, ScenarioResult } from "../finance/scenarios";
import type { TaxRegime } from "../finance/tax";

export type OpportunityModel =
  | { type: "renda_fixa"; grossAnnualRate: number; taxRegime: TaxRegime; custodyRate: number; holdToMaturityDays: number | null; rateBasis: string }
  | { type: "volatil"; annualVol: number; maxDrawdown: number; historyDays: number }
  | null;

export type Dimension = "risco" | "liquidez" | "custo" | "prazo" | "retorno" | "cambio" | "dados";
export type Weights = Record<Dimension, number>;

export const DIMENSION_LABEL: Record<Dimension, string> = {
  risco: "Segurança do principal",
  liquidez: "Liquidez",
  custo: "Custo",
  prazo: "Adequação ao prazo",
  retorno: "Retorno líquido real (cenário)",
  cambio: "Baixa exposição cambial",
  dados: "Confiabilidade dos dados",
};

export interface DimensionScore {
  dimension: Dimension;
  score: number; // 0–100
  weight: number;
  justification: string;
}

/** Estado de evidência exibido na UI. */
export type EvidenceState = "DADO_OBSERVADO" | "ESTIMATIVA_CENARIO" | "INFORMADO_USUARIO" | "INDISPONIVEL";

export interface ProductProjection {
  months: number;
  state: EvidenceState;
  totalInvested: number | null;
  finalBalance: number | null;
  grossGain: number | null;
  taxStatus: "calculado" | "nao_calculado" | "isento" | null;
  taxes: number | null;
  netBalance: number | null;
  realNetBalance: number | null;
  range: { pessimista: number; otimista: number } | null;
  note: string;
}

export interface WhereToCheck {
  label: string;
  url: string;
  kind: "oficial" | "usuario";
  /** true somente se o sistema acessou a URL nesta pesquisa. */
  linkCheckedBySystem: boolean;
}

export type DataStatus = "verificado" | "parcial" | "indisponivel" | "manual";

export type Category =
  | "tesouro_selic"
  | "tesouro_prefixado"
  | "tesouro_ipca"
  | "tesouro_ipca_juros"
  | "tesouro_renda_mais"
  | "poupanca"
  | "oferta_manual"
  | "cripto";

export interface FieldValue {
  display: string;
  value?: number | null;
  sourceIds: string[];
  verified: boolean;
}

export interface Opportunity {
  id: string;
  name: string;
  category: Category;
  classLabel: string;
  issuer: string;
  currency: "BRL" | "USD";
  minimum: FieldValue;
  rateOrPrice: FieldValue;
  benchmark: string;
  liquidity: string;
  maturity: string | null;
  maturityIso: string | null;
  taxes: string;
  costs: string;
  protection: string;
  risks: string[];
  pros: string[];
  cons: string[];
  invalidators: string[];
  missingInfo: string[];
  viableWithCapital: boolean | null;
  viabilityNote: string;
  incomeNote?: string;
  dataStatus: DataStatus;
  sourceIds: string[];
  observedAt: string | null;
  officialUrl: string;
  model: OpportunityModel;
  projections: ProductProjection[];
  whereToCheck: WhereToCheck[];
  identifier: string;
  /** Avaliação por horizonte */
  byHorizon: Partial<Record<Horizon, HorizonAssessment>>;
}

export interface HorizonAssessment {
  horizon: Horizon;
  eligible: boolean;
  vetoes: string[];
  warnings: string[];
  scores: DimensionScore[];
  total: number | null;
  scenario: (ScenarioResult & { label: string; basis: string }) | null;
  volatileRange?: { pessimista: number; central: number; otimista: number; label: string } | null;
}

export interface HorizonSection {
  horizon: Horizon;
  title: string;
  focus: string;
  rankedIds: string[]; // elegíveis, por pontuação de aderência
  vetoedIds: string[];
  conclusion: string;
  insufficientBasis: boolean;
  weights: Weights;
}

export interface MacroItem {
  key: string;
  label: string;
  value: number;
  unit: string;
  referenceDate: string;
  sourceId: string;
}

export interface PlatformField {
  value: string;
  status: "verificado_api" | "regra_catalogada" | "nao_verificado";
  sourceId?: string;
}

export interface Platform {
  id: string;
  name: string;
  products: string;
  fees: PlatformField;
  fx: PlatformField;
  protection: PlatformField;
  jurisdiction: PlatformField;
  eligibility: PlatformField;
  officialUrl: string;
  lastChecked: string | null;
}

export interface UnavailableClass {
  className: string;
  reason: string;
  howToIntegrate: string;
}

export interface ProviderRun {
  provider: ProviderId;
  label: string;
  status: ProviderStatus;
  durationMs: number;
  fromCache: boolean;
  error?: string;
}

export interface AuditCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ResearchReport {
  id: string;
  version: 1;
  createdAt: string;
  input: ResearchInput;
  status: "completo" | "parcial" | "indisponivel";
  mode: { regulatedAdvice: false; llmSynthesis: boolean; storage: "local_limitado" | "supabase" };
  orchestrator: { scope: string[]; interpretedQuestion: string; profile: { label: string; preliminary: true; rationale: string[] } };
  executiveSummary: string[];
  uncertainties: string[];
  globalWarnings: string[];
  macro: MacroItem[];
  macroNotes: string[];
  opportunities: Opportunity[];
  horizons: HorizonSection[];
  horizonMonths: number[];
  breakEven: { label: string; value: string; basis: string }[];
  platforms: Platform[];
  unavailableClasses: UnavailableClass[];
  assumptions: ScenarioAssumption[];
  evidence: SourceRecord[];
  providerRuns: ProviderRun[];
  audit: { checks: AuditCheck[]; removed: string[] };
  disclaimers: string[];
}
