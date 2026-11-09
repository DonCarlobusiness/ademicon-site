/**
 * Matriz explicável de aderência. Cada dimensão recebe nota 0–100 com justificativa;
 * pesos são editáveis por horizonte. NÃO é ranking universal de "melhor investimento".
 */
import type { Horizon, ResearchInput } from "./input";
import { HORIZON_DAYS } from "./input";
import type { Dimension, DimensionScore, Opportunity, Weights } from "./types";
import type { SourceRecord } from "../market-data/types";
import { pctFmt } from "./context";

export const DEFAULT_WEIGHTS: Record<Horizon, Weights> = {
  curto: { risco: 0.3, liquidez: 0.25, custo: 0.1, prazo: 0.15, retorno: 0.1, cambio: 0.05, dados: 0.05 },
  medio: { risco: 0.2, liquidez: 0.15, custo: 0.1, prazo: 0.2, retorno: 0.2, cambio: 0.05, dados: 0.1 },
  longo: { risco: 0.15, liquidez: 0.1, custo: 0.1, prazo: 0.2, retorno: 0.25, cambio: 0.1, dados: 0.1 },
  indefinido: { risco: 0.25, liquidez: 0.25, custo: 0.1, prazo: 0.1, retorno: 0.15, cambio: 0.05, dados: 0.1 },
};

export function resolveWeights(input: ResearchInput, h: Horizon): Weights {
  const ov = input.weights?.[h] ?? {};
  const w = { ...DEFAULT_WEIGHTS[h], ...ov } as Weights;
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum <= 0) return DEFAULT_WEIGHTS[h];
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / sum])) as Weights;
}

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

function maturityFit(o: Opportunity, h: Horizon, now: Date): { score: number; why: string } {
  const H = HORIZON_DAYS[h];
  const m = o.maturityIso ? (new Date(o.maturityIso).getTime() - now.getTime()) / 86_400_000 : null;
  switch (o.category) {
    case "tesouro_selic":
      return { score: { curto: 95, medio: 85, longo: 65, indefinido: 90 }[h], why: "Pós-fixado com liquidez diária e baixa oscilação: adapta-se a vários prazos; em prazos longos não trava ganho real." };
    case "poupanca":
      return { score: { curto: 75, medio: 50, longo: 30, indefinido: 70 }[h], why: "Liquidez imediata serve ao curto prazo; em prazos longos o rendimento tende a ficar atrás de alternativas." };
    case "tesouro_renda_mais":
      return h === "longo" ? { score: 70, why: "Produto desenhado para renda futura de muito longo prazo." } : { score: 10, why: "Prazo do produto muito superior ao horizonte." };
    case "cripto":
      return { score: { curto: 5, medio: 25, longo: 40, indefinido: 15 }[h], why: "Volatilidade extrema exige horizonte longo e tolerância a perdas; mesmo assim não há retorno esperado confiável." };
    case "oferta_manual":
      return { score: 50, why: "Prazo/liquidez informados pelo usuário e não verificados." };
    default: {
      if (m === null) return { score: 50, why: "Vencimento desconhecido." };
      if (m <= H * 1.15 && m >= H * 0.4) return { score: 90, why: `Vence em ~${(m / 365).toFixed(1)} anos, compatível com o horizonte: pode ser mantido até o vencimento.` };
      if (m > H * 1.15) return { score: h === "curto" ? 15 : 40, why: `Vence em ~${(m / 365).toFixed(1)} anos, após o horizonte: resgate antecipado ocorre a preço de mercado.` };
      return { score: 60, why: `Vence em ~${(m / 365).toFixed(1)} anos, antes do horizonte: haverá reinvestimento a taxas desconhecidas.` };
    }
  }
}

function riskScore(o: Opportunity, h: Horizon, now: Date): { score: number; why: string } {
  const H = HORIZON_DAYS[h];
  const m = o.maturityIso ? (new Date(o.maturityIso).getTime() - now.getTime()) / 86_400_000 : null;
  switch (o.category) {
    case "tesouro_selic": return { score: 92, why: "Risco soberano e baixa marcação a mercado." };
    case "poupanca": return { score: 88, why: "Coberta pelo FGC nos limites; sem oscilação de preço." };
    case "tesouro_prefixado":
    case "tesouro_ipca":
    case "tesouro_ipca_juros": {
      const fits = m !== null && m <= H * 1.15;
      return fits ? { score: 80, why: "Risco soberano; mantido até o vencimento, a taxa contratada é preservada." } : { score: 50, why: "Risco soberano, porém o vencimento excede o horizonte: risco de perda na venda antecipada." };
    }
    case "tesouro_renda_mais": return { score: 45, why: "Risco soberano, mas duração muito longa gera oscilações grandes de preço." };
    case "oferta_manual": return { score: 60, why: "Risco de crédito do emissor; FGC só se o produto for coberto (não verificado)." };
    case "cripto": {
      const vol = o.model?.type === "volatil" ? o.model.annualVol : 0.8;
      return { score: clamp(40 - vol * 50), why: `Sem garantia; volatilidade histórica ${pctFmt(vol * 100, 0)} a.a.` };
    }
  }
}

function liquidityScore(o: Opportunity): { score: number; why: string } {
  switch (o.category) {
    case "tesouro_selic": return { score: 90, why: "Resgate D+1 com baixa oscilação." };
    case "poupanca": return { score: 88, why: "Saque imediato, mas rendimento só no aniversário." };
    case "tesouro_renda_mais": return { score: 40, why: "Resgate antecipado a preço de mercado em produto muito longo." };
    case "cripto": return { score: 65, why: "Mercado 24/7, mas conversão para BRL e saque têm etapas e prazos não verificados." };
    case "oferta_manual": return /di[aá]ria/i.test(o.liquidity) ? { score: 80, why: "Liquidez diária informada (não verificada)." } : { score: 45, why: "Liquidez não verificada ou com carência." };
    default: return { score: 60, why: "Resgate D+1, porém sujeito à marcação a mercado." };
  }
}

function costScore(o: Opportunity): { score: number; why: string } {
  switch (o.category) {
    case "poupanca": return { score: 95, why: "Sem custos explícitos típicos." };
    case "tesouro_selic":
      return o.model?.type === "renda_fixa" && o.model.custodyRate === 0 ? { score: 90, why: "Isento de custódia B3 até R$ 10 mil; taxa do agente não verificada." } : { score: 80, why: "Custódia B3 0,20% a.a.; taxa do agente não verificada." };
    case "tesouro_prefixado":
    case "tesouro_ipca":
    case "tesouro_ipca_juros":
    case "tesouro_renda_mais": return { score: 80, why: "Custódia B3 0,20% a.a. (regra catalogada); taxa do agente não verificada." };
    case "oferta_manual": return { score: 75, why: "Custos não verificados." };
    case "cripto": return { score: 35, why: "Taxas de negociação/câmbio/depósito não totalmente verificadas; spread e custos podem pesar em valores pequenos." };
  }
}

function dataScore(o: Opportunity, sources: Map<string, SourceRecord>): { score: number; why: string } {
  if (o.dataStatus === "manual") return { score: 25, why: "Dados fornecidos pelo usuário, sem verificação." };
  const recs = o.sourceIds.map((id) => sources.get(id)).filter((s): s is SourceRecord => !!s && s.method !== "regra_catalogada");
  if (!recs.length) return { score: 10, why: "Sem fonte primária." };
  let score = Math.min(...recs.map((r) => r.confidence)) * 100;
  const worst = recs.some((r) => r.freshness === "desatualizado") ? "desatualizado" : recs.some((r) => r.freshness === "defasado") ? "defasado" : "atual";
  if (worst === "desatualizado") score -= 40;
  if (worst === "defasado") score -= 15;
  if (o.sourceIds.some((id) => sources.get(id)?.method === "regra_catalogada")) score -= 5;
  if (o.dataStatus === "parcial") score -= 15;
  return { score: clamp(score), why: `${recs.length} fonte(s) primária(s); pior frescor: ${worst}${o.sourceIds.some((id) => sources.get(id)?.method === "regra_catalogada") ? "; depende de regras catalogadas" : ""}.` };
}

/** Pós-fixados em horizontes > 2 anos dependem de hipótese de taxa constante, não de taxa contratada. */
function floatingLongPenalty(o: Opportunity, h: Horizon): boolean {
  return o.model?.type === "renda_fixa" && o.model.holdToMaturityDays === null && HORIZON_DAYS[h] > 2 * 365;
}

export function scoreOpportunity(
  o: Opportunity,
  h: Horizon,
  weights: Weights,
  sources: Map<string, SourceRecord>,
  realNetAnnualized: number | null,
  now: Date,
): { scores: DimensionScore[]; total: number } {
  const parts: Record<Dimension, { score: number | null; why: string }> = {
    risco: riskScore(o, h, now),
    liquidez: liquidityScore(o),
    custo: costScore(o),
    prazo: maturityFit(o, h, now),
    retorno:
      realNetAnnualized === null
        ? { score: null, why: o.category === "cripto" ? "Retorno esperado não estimado: projetar seria especulação. Dimensão excluída e pesos redistribuídos." : "Cenário de retorno indisponível; dimensão excluída." }
        : floatingLongPenalty(o, h)
          ? { score: clamp(50 + realNetAnnualized * 100 * 8 - 20), why: `Cenário: ${pctFmt(realNetAnnualized * 100)} a.a. real líquido, mas supõe a taxa atual (Selic/CDI/poupança) constante por ${(HORIZON_DAYS[h] / 365).toFixed(0)} anos — hipótese muito incerta; −20 pontos por não haver taxa contratada.` }
          : { score: clamp(50 + realNetAnnualized * 100 * 8), why: `Cenário: ${pctFmt(realNetAnnualized * 100)} a.a. real líquido sob as premissas visíveis (não é promessa).` },
    cambio: o.currency === "BRL" ? { score: 100, why: "Em reais." } : { score: 25, why: "Exposição ao dólar." },
    dados: dataScore(o, sources),
  };
  const active = (Object.keys(parts) as Dimension[]).filter((d) => parts[d].score !== null);
  const wsum = active.reduce((a, d) => a + weights[d], 0) || 1;
  const scores: DimensionScore[] = (Object.keys(parts) as Dimension[]).map((d) => ({
    dimension: d,
    score: parts[d].score ?? 0,
    weight: parts[d].score === null ? 0 : weights[d] / wsum,
    justification: parts[d].why,
  }));
  const total = Math.round(scores.reduce((a, s) => a + s.score * s.weight, 0));
  return { scores, total };
}
