/**
 * Pipeline de pesquisa: conectores → normalização → agentes → auditoria → relatório.
 */
import { randomUUID } from "node:crypto";
import { ResearchInputSchema, type Horizon, type ResearchInput, type ResearchInputRaw, HORIZON_DAYS, HORIZON_LABEL } from "./input";
import type { HorizonSection, Opportunity, ProviderRun, ResearchReport } from "./types";
import type { ResearchContext } from "./context";
import { addSources } from "./context";
import { fetchMacroSnapshot } from "../market-data/bcb";
import { fetchKraken } from "../market-data/kraken";
import { fetchTesouro } from "../market-data/tesouro";
import { fetchCvmCatalog } from "../market-data/cvm";
import type { ProviderResult } from "../market-data/types";
import { runOrchestrator } from "./agents/orchestrator";
import { runMacro } from "./agents/macro";
import { runFixedIncome } from "./agents/fixed-income";
import { runGlobalMarkets } from "./agents/global-markets";
import { runBrokerCost } from "./agents/broker-cost";
import { assessRisk, globalWarnings } from "./agents/risk-guardian";
import { runAudit } from "./agents/evidence-auditor";
import { resolveWeights, scoreOpportunity } from "./scoring";
import { fixedIncomeScenario, volatileRange } from "../finance/scenarios";
import { executiveSummary, horizonConclusion, HORIZON_FOCUS } from "./synthesis";
import { complianceMode, DISCLAIMERS } from "../compliance";
import { dateFmt } from "./context";

export interface Connectors {
  macro: typeof fetchMacroSnapshot;
  kraken: typeof fetchKraken;
  tesouro: typeof fetchTesouro;
  cvm: typeof fetchCvmCatalog;
}

export const LIVE_CONNECTORS: Connectors = { macro: fetchMacroSnapshot, kraken: fetchKraken, tesouro: fetchTesouro, cvm: fetchCvmCatalog };

const LABEL: Record<string, string> = {
  bcb_sgs: "Banco Central (SGS)",
  kraken_public: "Kraken (dados públicos)",
  tesouro_transparente: "Tesouro Transparente (CSV oficial)",
  cvm_dados_abertos: "CVM Dados Abertos (disponibilidade)",
  quotes_licensed: "Cotações licenciadas (ações/FIIs/ETFs)",
};

function toRun(r: ProviderResult<unknown>): ProviderRun {
  return { provider: r.provider, label: LABEL[r.provider] ?? r.provider, status: r.status, durationMs: r.durationMs, fromCache: r.fromCache, error: r.error };
}

function settledToResult<T>(s: PromiseSettledResult<ProviderResult<T>>, provider: ProviderResult<T>["provider"]): ProviderResult<T> {
  if (s.status === "fulfilled") return s.value;
  return { provider, status: "falhou", data: null, sources: [], error: s.reason instanceof Error ? s.reason.message : String(s.reason), durationMs: 0, fromCache: false };
}

export function scenarioFor(o: Opportunity, h: Horizon, ctx: ResearchContext) {
  if (o.model?.type !== "renda_fixa") return null;
  const days = o.model.holdToMaturityDays ?? HORIZON_DAYS[h];
  if (days <= 0) return null;
  const res = fixedIncomeScenario({
    amount: ctx.input.capital,
    days,
    grossAnnualRate: o.model.grossAnnualRate,
    taxRegime: o.model.taxRegime,
    inflationAnnual: ctx.hyp.ipca ?? 0,
    annualCustodyRate: o.model.custodyRate,
  });
  const label = o.model.holdToMaturityDays ? `mantido até o vencimento em ${dateFmt(o.maturityIso)} (${(days / 365).toFixed(1)} anos)` : `${(days / 365).toFixed(1)} ano(s) — ${HORIZON_LABEL[h].toLowerCase()}`;
  return { ...res, label, basis: o.model.rateBasis + (ctx.hyp.ipca !== null ? `; inflação hipotética ${(ctx.hyp.ipca * 100).toFixed(2)}% a.a. para o valor real` : "") };
}

export async function runResearch(rawInput: ResearchInputRaw | ResearchInput, opts: { connectors?: Connectors; now?: Date; id?: string } = {}): Promise<ResearchReport> {
  const input = ResearchInputSchema.parse(rawInput);
  const now = opts.now ?? new Date();
  const c = opts.connectors ?? LIVE_CONNECTORS;

  const [macroS, krakenS, tesouroS, cvmS] = await Promise.allSettled([c.macro({ now }), c.kraken({ now }), c.tesouro({ now }), c.cvm({ now })]);
  const macroR = settledToResult(macroS, "bcb_sgs");
  const krakenR = settledToResult(krakenS, "kraken_public");
  const tesouroR = settledToResult(tesouroS, "tesouro_transparente");
  const cvmR = settledToResult(cvmS, "cvm_dados_abertos");

  const ctx: ResearchContext = {
    input,
    now,
    macro: macroR.data,
    tesouro: tesouroR.data,
    kraken: krakenR.data,
    sources: new Map(),
    hyp: { selic: null, cdi: null, ipca: null, usdbrl: null, poupancaMonthly: null },
    assumptions: [],
  };
  addSources(ctx, [...macroR.sources, ...krakenR.sources, ...tesouroR.sources, ...cvmR.sources]);

  const orch = runOrchestrator(input);
  const macro = runMacro(ctx);
  const fi = runFixedIncome(ctx);
  const gm = runGlobalMarkets(ctx);
  const platforms = runBrokerCost(ctx);
  let opportunities = [...fi.opportunities, ...gm.opportunities];

  // Avaliação por horizonte: risco → cenário → pontuação
  const horizons: Horizon[] = [...new Set(input.horizons)];
  for (const o of opportunities) {
    for (const h of horizons) {
      const { vetoes, warnings } = assessRisk(o, h, input, now);
      const scenario = scenarioFor(o, h, ctx);
      const weights = resolveWeights(input, h);
      const { scores, total } = scoreOpportunity(o, h, weights, ctx.sources, scenario ? scenario.realNetAnnualized : null, now);
      const vr = o.model?.type === "volatil" ? volatileRange(input.capital, o.model.annualVol, HORIZON_DAYS[h] / 365) : null;
      o.byHorizon[h] = {
        horizon: h,
        eligible: vetoes.length === 0,
        vetoes,
        warnings,
        scores,
        total: vetoes.length === 0 ? total : null,
        scenario,
        volatileRange: vr ? { pessimista: vr.pessimista, central: vr.central, otimista: vr.otimista, label: vr.confidenceLabel } : null,
      };
    }
  }

  const audit = runAudit(ctx, opportunities);
  opportunities = audit.kept;
  const byId = new Map(opportunities.map((o) => [o.id, o]));

  const sections: HorizonSection[] = horizons.map((h) => {
    const eligible = opportunities.filter((o) => o.byHorizon[h]?.eligible && o.dataStatus !== "indisponivel");
    const rankedIds = eligible.sort((a, b) => (b.byHorizon[h]!.total ?? 0) - (a.byHorizon[h]!.total ?? 0)).map((o) => o.id);
    const vetoedIds = opportunities.filter((o) => o.byHorizon[h] && !o.byHorizon[h]!.eligible).map((o) => o.id);
    const verifiedEligible = rankedIds.filter((id) => byId.get(id)?.dataStatus === "verificado" || byId.get(id)?.dataStatus === "parcial");
    const base = { horizon: h, title: HORIZON_LABEL[h], focus: HORIZON_FOCUS[h], rankedIds, vetoedIds, insufficientBasis: verifiedEligible.length === 0, weights: resolveWeights(input, h) };
    return { ...base, conclusion: horizonConclusion(base, byId) };
  });

  const runs = [toRun(macroR), toRun(tesouroR), toRun(krakenR), toRun(cvmR), { provider: "quotes_licensed" as const, label: LABEL.quotes_licensed, status: "nao_configurado" as const, durationMs: 0, fromCache: false, error: "Sem provedor licenciado configurado." }];
  const core = [macroR, tesouroR, krakenR];
  const status: ResearchReport["status"] = core.every((r) => r.status === "ok") ? "completo" : core.some((r) => r.status === "ok" || r.status === "parcial") ? "parcial" : "indisponivel";

  const createdAt = now.toISOString();
  const partial = { createdAt, input, macro: macro.items, horizons: sections, opportunities, unavailableClasses: gm.unavailable, status };
  const { summary, uncertainties } = executiveSummary(partial, runs, byId);
  const comp = complianceMode();

  return {
    id: opts.id ?? randomUUID(),
    version: 1,
    ...partial,
    mode: { regulatedAdvice: false, llmSynthesis: false, storage: "local_limitado" },
    orchestrator: orch,
    executiveSummary: summary,
    uncertainties,
    globalWarnings: globalWarnings(input),
    macroNotes: macro.notes,
    breakEven: fi.breakEven,
    platforms,
    assumptions: ctx.assumptions,
    evidence: [...ctx.sources.values()],
    providerRuns: runs,
    audit: { checks: audit.checks, removed: audit.removed },
    disclaimers: [...DISCLAIMERS, comp.notice],
  };
}
