/**
 * Projeções por produto usando o capital inicial E os aportes mensais do usuário.
 * Regras de honestidade:
 *  - Pós-fixados (Selic, poupança, % do CDI): estimativa sob hipótese de taxa constante.
 *  - Prefixado/IPCA+ antes do vencimento: NÃO calculável com a taxa contratada (marcação a mercado).
 *  - Prefixado/IPCA+ no/após o vencimento: só o capital inicial à taxa contratada; aportes futuros
 *    entrariam a taxas desconhecidas e não são modelados.
 *  - Cripto: faixa ilustrativa sobre o capital inicial; sem retorno esperado.
 */
import type { Opportunity, ProductProjection } from "./types";
import { DAYS_PER_MONTH, project } from "../finance/projection";
import { volatileRange } from "../finance/scenarios";
import { formatMonths } from "../finance/projection";

export interface ProjectionContext {
  initial: number;
  monthly: number;
  inflation: number | null;
  now: Date;
}

const empty = (months: number, state: ProductProjection["state"], note: string): ProductProjection => ({
  months, state, totalInvested: null, finalBalance: null, grossGain: null, taxStatus: null, taxes: null, netBalance: null, realNetBalance: null, range: null, note,
});

export function productProjection(o: Opportunity, months: number, c: ProjectionContext): ProductProjection {
  const m = o.model;
  if (!m) return empty(months, "INDISPONIVEL", o.category === "tesouro_renda_mais" ? "Fluxo do Renda+ (conversão e pagamentos mensais futuros) não modelado nesta versão." : "Sem taxa disponível para projetar.");
  const userData = o.dataStatus === "manual";

  if (m.type === "volatil") {
    if (c.initial <= 0) return empty(months, "INDISPONIVEL", "Faixa ilustrativa exige capital inicial.");
    const r = volatileRange(c.initial, m.annualVol, months / 12);
    return {
      ...empty(months, "ESTIMATIVA_CENARIO", `Faixa ilustrativa (~90%) para o capital inicial, com volatilidade histórica de ${(m.annualVol * 100).toFixed(0)}% a.a. e retorno esperado zero. Aportes, custos, câmbio e impostos não incluídos. Não gera renda.`),
      totalInvested: c.initial,
      range: { pessimista: r.pessimista, otimista: r.otimista },
    };
  }

  const taxMode = m.taxRegime === "isento_pf" ? "isento" : m.taxRegime === "renda_fixa_regressiva" ? "renda_fixa_regressiva" : "nao_calcular";
  if (m.holdToMaturityDays !== null) {
    const matMonths = m.holdToMaturityDays / DAYS_PER_MONTH;
    if (months < matMonths - 0.5) {
      return empty(months, "INDISPONIVEL", `Vence em ${formatMonths(Math.round(matMonths))}: resgatar em ${formatMonths(months)} seria a preço de mercado, que não é previsível. A taxa contratada só vale até o vencimento.`);
    }
    if (c.initial <= 0) return empty(months, "INDISPONIVEL", "Projeção até o vencimento exige capital inicial.");
    const hold = Math.max(1, Math.round(matMonths));
    const r = project({ initial: c.initial, monthly: 0, annualRate: m.grossAnnualRate, months: hold, inflationAnnual: c.inflation, annualCostRate: m.custodyRate, tax: taxMode });
    return {
      months,
      state: userData ? "INFORMADO_USUARIO" : "ESTIMATIVA_CENARIO",
      totalInvested: r.totalInvested,
      finalBalance: r.finalBalance,
      grossGain: r.grossGain,
      taxStatus: r.tax.status,
      taxes: r.tax.ir !== null ? r.tax.ir + (r.tax.iof ?? 0) : null,
      netBalance: r.netBalance,
      realNetBalance: r.realNetBalance,
      range: null,
      note: `Valor no vencimento (${formatMonths(hold)}) apenas do capital inicial, à taxa da data-base (${m.rateBasis}). ${c.monthly > 0 ? "Aportes mensais NÃO incluídos: entrariam a taxas futuras desconhecidas. " : ""}${months > hold + 0.5 ? "Após o vencimento, o reinvestimento não é modelado." : ""}`.trim(),
    };
  }

  const r = project({ initial: c.initial, monthly: c.monthly, annualRate: m.grossAnnualRate, months, inflationAnnual: c.inflation, annualCostRate: m.custodyRate, tax: taxMode });
  return {
    months,
    state: userData ? "INFORMADO_USUARIO" : "ESTIMATIVA_CENARIO",
    totalInvested: r.totalInvested,
    finalBalance: r.finalBalance,
    grossGain: r.grossGain,
    taxStatus: r.tax.status,
    taxes: r.tax.ir !== null ? r.tax.ir + (r.tax.iof ?? 0) : null,
    netBalance: r.netBalance,
    realNetBalance: r.realNetBalance,
    range: null,
    note: `Hipótese: ${m.rateBasis} durante ${formatMonths(months)}. ${r.tax.status === "calculado" ? "IR calculado por lote de aporte." : r.tax.note}`,
  };
}
