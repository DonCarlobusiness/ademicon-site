/**
 * Agente 3 — Fixed Income Research.
 * Monta oportunidades de renda fixa SOMENTE a partir de dados obtidos (Tesouro Transparente, BCB)
 * e de ofertas informadas manualmente pelo usuário (marcadas como não verificadas).
 */
import type { ResearchContext } from "../context";
import { brl, dateFmt, pctFmt } from "../context";
import type { Opportunity } from "../types";
import type { TesouroBond } from "../../market-data/tesouro";
import { TESOURO_DATASET_PAGE, TESOURO_OFFICIAL_SITE } from "../../market-data/tesouro";
import { addSpread, monthlyToAnnual } from "../../finance/rates";
import { tesouroMinimumInvestment } from "../../finance/costs";
import { RULES, ruleSource } from "../../catalog/rules";
import { addSources } from "../context";
import { irRegressivoRate } from "../../finance/tax";
import { daysBetween } from "../../market-data/time";
import { firstInvestable } from "../input";
import { WHERE } from "../../catalog/links";

const YEAR = 365;

function pickClosest(list: TesouroBond[], now: Date, targetDays: number): TesouroBond | null {
  if (!list.length) return null;
  return [...list].sort(
    (a, b) => Math.abs(daysBetween(now.toISOString(), a.maturity) - targetDays) - Math.abs(daysBetween(now.toISOString(), b.maturity) - targetDays),
  )[0];
}

export function selectBonds(bonds: TesouroBond[], now: Date): TesouroBond[] {
  const avail = bonds.filter((b) => b.availableForPurchase && b.buyPrice && b.buyRatePct !== null && new Date(b.maturity) > now);
  const by = (k: TesouroBond["kind"]) => avail.filter((b) => b.kind === k).sort((a, b) => a.maturity.localeCompare(b.maturity));
  const picks: (TesouroBond | null)[] = [];
  const selic = by("selic");
  picks.push(selic[0] ?? null);
  const pre = by("prefixado");
  picks.push(pre[0] ?? null, pickClosest(pre, now, 3 * YEAR), pre[pre.length - 1] ?? null);
  const ipca = by("ipca");
  picks.push(ipca[0] ?? null, pickClosest(ipca, now, 10 * YEAR));
  picks.push(pickClosest(by("ipca_juros"), now, 10 * YEAR));
  picks.push(by("renda_mais")[0] ?? null);
  const seen = new Set<string>();
  return picks.filter((b): b is TesouroBond => {
    if (!b) return false;
    const k = `${b.type}|${b.maturity}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const CATEGORY = {
  selic: "tesouro_selic",
  prefixado: "tesouro_prefixado",
  ipca: "tesouro_ipca",
  ipca_juros: "tesouro_ipca_juros",
  renda_mais: "tesouro_renda_mais",
} as const;

export function bondToOpportunity(b: TesouroBond, ctx: ResearchContext): Opportunity | null {
  const tdSrc = ctx.tesouro!.source;
  const cat = CATEGORY[b.kind as keyof typeof CATEGORY];
  if (!cat) return null;
  const capital = firstInvestable(ctx.input);
  const min = tesouroMinimumInvestment(b.buyPrice!);
  const viable = min <= capital;
  const daysToMat = daysBetween(ctx.now.toISOString(), b.maturity);
  const rate = b.buyRatePct!;
  const catalogIds = [RULES.tesouroMinimo.id, RULES.tesouroCustodia.id, RULES.tesouroLiquidez.id, RULES.irRegressivo.id, RULES.iof.id];
  addSources(ctx, [RULES.tesouroMinimo, RULES.tesouroCustodia, RULES.tesouroLiquidez, RULES.irRegressivo, RULES.iof].map(ruleSource));
  const selicExempt = b.kind === "selic" && capital <= 10_000;
  const custodyRate = selicExempt ? 0 : 0.002;

  let rateDisplay = "";
  let benchmark = "";
  let model: Opportunity["model"] = null;
  let rateBasis = "";
  const extraSrc: string[] = [];
  const missing: string[] = ["Taxa cobrada pela instituição custodiante (agente) — não verificada", "Preço/taxa intradiário do momento da compra (dado é da data-base publicada)"];

  switch (b.kind) {
    case "selic":
      rateDisplay = `Selic ${rate >= 0 ? "+" : "−"} ${pctFmt(Math.abs(rate), 4)} a.a.`;
      benchmark = "Selic (taxa básica de juros)";
      if (ctx.hyp.selic !== null) {
        rateBasis = `Selic hipotética ${pctFmt(ctx.hyp.selic * 100)} + ágio/deságio ${pctFmt(rate, 4)} da data-base`;
        model = { type: "renda_fixa", grossAnnualRate: addSpread(ctx.hyp.selic, rate / 100), taxRegime: "renda_fixa_regressiva", custodyRate, holdToMaturityDays: null, rateBasis };
        if (ctx.macro?.selic_efetiva) extraSrc.push(ctx.macro.selic_efetiva.source.id);
      }
      break;
    case "prefixado":
      rateDisplay = `${pctFmt(rate)} a.a. (prefixado)`;
      benchmark = "Taxa fixa contratada na compra";
      rateBasis = `Taxa prefixada de ${pctFmt(rate)} a.a. da data-base, mantida até o vencimento`;
      model = { type: "renda_fixa", grossAnnualRate: rate / 100, taxRegime: "renda_fixa_regressiva", custodyRate, holdToMaturityDays: daysToMat, rateBasis };
      break;
    case "ipca":
    case "ipca_juros":
    case "renda_mais":
      rateDisplay = `IPCA + ${pctFmt(rate)} a.a.`;
      benchmark = "IPCA (inflação oficial) + taxa real contratada";
      if (b.kind !== "renda_mais" && ctx.hyp.ipca !== null) {
        rateBasis = `IPCA hipotético ${pctFmt(ctx.hyp.ipca * 100)} a.a. + ${pctFmt(rate)} a.a., mantido até o vencimento${b.kind === "ipca_juros" ? " (cupons semestrais tratados como reinvestidos à mesma taxa — simplificação; na prática há IR sobre cada cupom)" : ""}`;
        model = { type: "renda_fixa", grossAnnualRate: addSpread(ctx.hyp.ipca, rate / 100), taxRegime: "renda_fixa_regressiva", custodyRate, holdToMaturityDays: daysToMat, rateBasis };
        if (ctx.macro?.ipca_12m) extraSrc.push(ctx.macro.ipca_12m.source.id);
      }
      break;
  }

  const common = {
    issuer: "Tesouro Nacional (via Tesouro Direto)",
    currency: "BRL" as const,
    minimum: {
      display: `${brl(min)} (1% do PU de ${brl(b.buyPrice)}; regra catalogada — conferir)`,
      value: min,
      sourceIds: [tdSrc.id, RULES.tesouroMinimo.id],
      verified: false,
    },
    rateOrPrice: { display: `${rateDisplay} · PU compra ${brl(b.buyPrice)}`, value: rate, sourceIds: [tdSrc.id], verified: true },
    benchmark,
    maturity: dateFmt(b.maturity),
    maturityIso: b.maturity,
    taxes: "IR regressivo sobre o rendimento (22,5% → 15%) e IOF se resgatar em menos de 30 dias (regras catalogadas).",
    costs: selicExempt
      ? "Custódia B3: isento para Tesouro Selic até R$ 10 mil (regra catalogada). Taxa do agente: não verificada."
      : "Custódia B3: 0,20% a.a. sobre o saldo (regra catalogada). Taxa do agente: não verificada.",
    protection: "Risco soberano do Tesouro Nacional. NÃO tem cobertura do FGC.",
    viableWithCapital: viable,
    viabilityNote: viable ? `Mínimo estimado ${brl(min)} cabe no capital de ${brl(capital)}.` : `Mínimo estimado ${brl(min)} excede o capital de ${brl(capital)}.`,
    dataStatus: "verificado" as const,
    sourceIds: [tdSrc.id, ...extraSrc, ...catalogIds],
    observedAt: b.baseDate,
    officialUrl: TESOURO_OFFICIAL_SITE,
    missingInfo: missing,
    model,
    byHorizon: {},
    projections: [],
    whereToCheck: [...WHERE.tesouro],
    identifier: `${b.type} — vencimento ${dateFmt(b.maturity)}`,
  };

  const mtm = "Antes do vencimento, o resgate é pelo preço de mercado do dia (marcação a mercado): se os juros subirem, o valor pode ficar abaixo do aplicado.";
  const taxIrNow = (irRegressivoRate(daysToMat) * 100).toFixed(1);

  switch (b.kind) {
    case "selic":
      return {
        ...common,
        id: `td-selic-${b.maturity.slice(0, 4)}`,
        name: `Tesouro Selic ${b.maturity.slice(0, 4)}`,
        category: cat,
        classLabel: "Título público pós-fixado",
        liquidity: "Resgate diário (D+1) via recompra do Tesouro; oscilação de preço normalmente pequena.",
        risks: ["Queda da Selic reduz o rendimento futuro", "Pequena marcação a mercado em resgates antecipados", "IR maior em prazos curtos (22,5% até 180 dias)"],
        pros: ["Acompanha a Selic", "Liquidez diária", "Baixa volatilidade relativa entre títulos públicos", "Mínimo baixo"],
        cons: ["IR regressivo e possível IOF reduzem o líquido em prazos curtos", "Não protege contra inflação de forma contratual"],
        invalidators: ["Corte relevante da Selic", "Mudança nas regras de custódia/tributação", "Taxa de agente custodiante elevada"],
      };
    case "prefixado":
      return {
        ...common,
        id: `td-pre-${b.maturity.slice(0, 4)}`,
        name: `Tesouro Prefixado ${b.maturity.slice(0, 4)}`,
        category: cat,
        classLabel: "Título público prefixado",
        liquidity: `Resgate diário pelo preço de mercado; taxa contratada só é garantida se mantido até ${dateFmt(b.maturity)}.`,
        risks: [mtm, "Inflação acima do esperado reduz o ganho real", `IR de ${taxIrNow}% se mantido até o vencimento`],
        pros: ["Rentabilidade nominal conhecida se levado ao vencimento", "Mínimo baixo"],
        cons: ["Volatilidade de preço em resgates antecipados", "Sem proteção contra inflação"],
        invalidators: ["Necessidade de resgatar antes do vencimento", "Alta de juros com venda antecipada", "Inflação muito acima da taxa contratada"],
      };
    case "ipca":
      return {
        ...common,
        id: `td-ipca-${b.maturity.slice(0, 4)}`,
        name: `Tesouro IPCA+ ${b.maturity.slice(0, 4)}`,
        category: cat,
        classLabel: "Título público atrelado à inflação",
        liquidity: `Resgate diário pelo preço de mercado; ganho real contratado só é garantido se mantido até ${dateFmt(b.maturity)}.`,
        risks: [mtm + " Títulos longos oscilam mais.", "Rendimento nominal depende do IPCA realizado"],
        pros: ["Protege o poder de compra se mantido até o vencimento", "Taxa real contratada"],
        cons: ["Alta volatilidade de preço em vencimentos longos", "Sem pagamentos periódicos (paga tudo no vencimento)"],
        invalidators: ["Resgate antecipado em momento de alta de juros reais", "Mudança tributária"],
      };
    case "ipca_juros":
      return {
        ...common,
        id: `td-ipcaj-${b.maturity.slice(0, 4)}`,
        name: `Tesouro IPCA+ com Juros Semestrais ${b.maturity.slice(0, 4)}`,
        category: cat,
        classLabel: "Título público atrelado à inflação com cupom semestral",
        liquidity: "Resgate diário pelo preço de mercado; paga juros (cupons) semestrais.",
        incomeNote: "Paga cupons SEMESTRAIS (não mensais), tributados pelo IR em cada pagamento. O valor depende do IPCA realizado.",
        risks: [mtm, "IR cobrado em cada cupom reduz o efeito dos juros compostos", "Reinvestimento dos cupons a taxas desconhecidas"],
        pros: ["Gera fluxo de caixa semestral (renda passiva não mensal)", "Proteção contra inflação"],
        cons: ["Volatilidade de preço", "Cupom tributado antecipadamente"],
        invalidators: ["Necessidade de liquidez antes do vencimento", "Queda forte do preço por alta de juros reais"],
      };
    case "renda_mais":
      return {
        ...common,
        id: `td-renda-${b.maturity.slice(0, 4)}`,
        name: `Tesouro Renda+ Aposentadoria Extra (venc. ${b.maturity.slice(0, 4)})`,
        category: cat,
        classLabel: "Título público para renda complementar futura",
        liquidity: "Resgate antecipado possível pelo preço de mercado (verifique condições específicas no site oficial).",
        incomeNote: `Pelas regras do programa (catalogadas, conferir), pagamentos mensais durante 20 anos começam por volta de ${Number(b.maturity.slice(0, 4)) - 19}, terminando no vencimento ${dateFmt(b.maturity)}. Não gera renda agora.`,
        risks: [mtm + " A duração é muito longa: oscilações podem ser grandes.", "Produto de prazo extremamente longo"],
        pros: ["Desenhado para renda mensal futura corrigida pela inflação", "Mínimo baixo"],
        cons: ["Não serve para necessidades de curto/médio prazo", "Fluxo de pagamentos complexo; cenário numérico não modelado nesta versão"],
        invalidators: ["Necessidade de resgate antes da fase de renda", "Mudança nas regras do programa"],
        missingInfo: [...missing, "Regras exatas de conversão e de resgate antecipado (não verificadas ao vivo)", "Simulação do fluxo de renda mensal (não implementada)"],
      };
  }
  return null;
}

export function poupancaOpportunity(ctx: ResearchContext): Opportunity | null {
  const s = ctx.macro?.poupanca;
  if (!s) return null;
  addSources(ctx, [ruleSource(RULES.poupancaIsencao), ruleSource(RULES.fgc)]);
  const monthly = s.latest.value / 100;
  const annual = monthlyToAnnual(monthly);
  return {
    id: "poupanca",
    name: "Caderneta de poupança",
    category: "poupanca",
    classLabel: "Depósito de poupança (regra unificada)",
    issuer: "Bancos e instituições autorizadas pelo BCB",
    currency: "BRL",
    minimum: { display: "Sem mínimo regulatório; depende da instituição (não verificado)", value: null, sourceIds: [], verified: false },
    rateOrPrice: {
      display: `${pctFmt(s.latest.value, 4)} no período mensal iniciado em ${dateFmt(s.latest.date)} (≈ ${pctFmt(annual * 100)} a.a.)`,
      value: s.latest.value,
      sourceIds: [s.source.id],
      verified: true,
    },
    benchmark: "Regra legal: 0,5% a.m. + TR (com Selic > 8,5% a.a.) ou 70% da Selic + TR",
    liquidity: "Saque a qualquer momento; rendimento só é creditado no aniversário mensal do depósito.",
    maturity: null,
    maturityIso: null,
    taxes: "Isenta de IR para pessoa física (regra catalogada).",
    costs: "Sem taxa de administração típica (não verificado por instituição).",
    protection: "FGC até R$ 250 mil por CPF por instituição, nos limites vigentes (regra catalogada).",
    risks: ["Rendimento geralmente inferior a alternativas pós-fixadas com Selic alta", "Perda do rendimento do mês em saques antes do aniversário", "Pode render abaixo da inflação"],
    pros: ["Simplicidade", "Isenção de IR", "Liquidez imediata", "Cobertura do FGC"],
    cons: ["Rentabilidade limitada pela regra legal", "Rendimento mensal 'por aniversário'"],
    invalidators: ["Mudança na regra de remuneração", "Inflação acima do rendimento"],
    missingInfo: ["Condições específicas de cada instituição"],
    viableWithCapital: true,
    viabilityNote: `Acessível com ${brl(firstInvestable(ctx.input))} (sem mínimo regulatório).`,
    dataStatus: "verificado",
    sourceIds: [s.source.id, RULES.poupancaIsencao.id, RULES.fgc.id],
    observedAt: s.latest.date,
    officialUrl: "https://www.bcb.gov.br/estabilidadefinanceira/poupanca",
    model: { type: "renda_fixa", grossAnnualRate: annual, taxRegime: "isento_pf", custodyRate: 0, holdToMaturityDays: null, rateBasis: `Rendimento mensal de ${pctFmt(s.latest.value, 4)} mantido constante (hipótese)` },
    byHorizon: {},
    projections: [],
    whereToCheck: [...WHERE.poupanca, ...WHERE.bancos],
    identifier: "Poupança (regra unificada, SGS 195)",
  };
}

export function manualOfferOpportunities(ctx: ResearchContext): Opportunity[] {
  return ctx.input.manualOffers.map((o, i) => {
    const viable = o.minimum === null || o.minimum === undefined ? null : o.minimum <= firstInvestable(ctx.input);
    const id = `manual-${i + 1}`;
    const src = {
      id: `usuario-${i + 1}`,
      provider: "usuario" as const,
      label: `Oferta informada pelo usuário: ${o.name} (${o.institution})`,
      url: o.url ?? "",
      method: "entrada_manual" as const,
      collectedAt: ctx.now.toISOString(),
      referenceAt: null,
      ageMinutes: null,
      freshness: "indisponivel" as const,
      confidence: 0.3,
      note: "Dado fornecido pelo usuário; NÃO verificado pelo sistema.",
    };
    addSources(ctx, [src, ruleSource(RULES.fgc), ruleSource(RULES.irRegressivo)]);
    const gross = o.pctOfCdi && ctx.hyp.cdi !== null ? (o.pctOfCdi / 100) * ctx.hyp.cdi : null;
    return {
      id,
      name: o.name,
      category: "oferta_manual",
      classLabel: "Oferta informada manualmente (não verificada)",
      issuer: o.institution,
      currency: "BRL",
      minimum: { display: o.minimum !== null && o.minimum !== undefined ? `${brl(o.minimum)} (informado pelo usuário)` : "não informado", value: o.minimum ?? null, sourceIds: [src.id], verified: false },
      rateOrPrice: { display: `${o.rateDescription} (informado pelo usuário)`, value: o.pctOfCdi ?? null, sourceIds: [src.id], verified: false },
      benchmark: o.pctOfCdi ? "CDI" : "não informado",
      liquidity: o.liquidity || "não informada",
      maturity: o.maturity || null,
      maturityIso: null,
      taxes: o.taxExempt ? "Informada como isenta (ex.: LCI/LCA) — conferir vigência e condições." : "Presumida tributável pelo IR regressivo (conferir natureza do produto).",
      costs: "não verificado",
      protection: "Se for CDB/RDB/LCI/LCA de instituição associada, pode haver FGC nos limites vigentes — conferir.",
      risks: ["Risco de crédito do emissor", "Liquidez e carência não verificadas", "Condições podem diferir do informado"],
      pros: ["Permite comparar uma oferta real que você encontrou"],
      cons: ["Dados não verificados pelo sistema"],
      invalidators: ["Condições divergentes na contratação", "Problemas de crédito do emissor"],
      missingInfo: ["Confirmação independente da taxa, carência, liquidez e emissor"],
      viableWithCapital: viable,
      viabilityNote: viable === null ? "Mínimo não informado." : viable ? "Mínimo informado cabe no capital." : "Mínimo informado excede o capital.",
      dataStatus: "manual",
      sourceIds: [src.id, RULES.fgc.id],
      observedAt: null,
      officialUrl: o.url ?? "",
      model: gross !== null ? { type: "renda_fixa", grossAnnualRate: gross, taxRegime: o.taxExempt ? "isento_pf" : "renda_fixa_regressiva", custodyRate: 0, holdToMaturityDays: null, rateBasis: `${o.pctOfCdi}% do CDI hipotético (${pctFmt((ctx.hyp.cdi ?? 0) * 100)} a.a.)` } : null,
      byHorizon: {},
      projections: [],
      whereToCheck: [...(o.url ? [{ label: "Página informada por você", url: o.url, kind: "usuario" as const, linkCheckedBySystem: false }] : []), ...WHERE.bancos],
      identifier: `${o.name} — ${o.institution}`,
    } satisfies Opportunity;
  });
}

/** Pontos de equilíbrio para avaliar ofertas bancárias que o usuário encontrar (não são ofertas). */
export function breakEvenReferences(ctx: ResearchContext, opps: Opportunity[]) {
  const out: { label: string; value: string; basis: string }[] = [];
  const cdi = ctx.hyp.cdi;
  const selicOpp = opps.find((o) => o.category === "tesouro_selic");
  if (!cdi) return out;
  if (selicOpp?.model?.type === "renda_fixa") {
    const pctCdi = (selicOpp.model.grossAnnualRate / cdi) * 100;
    out.push({
      label: "CDB/RDB tributável com liquidez diária precisa pagar ao menos",
      value: `${pctCdi.toFixed(1)}% do CDI`,
      basis: `para igualar o rendimento bruto do ${selicOpp.name} (mesma tabela de IR). Cálculo: taxa do título ÷ CDI hipotético de ${pctFmt(cdi * 100)}.`,
    });
    const ir1y = irRegressivoRate(365);
    const net1y = selicOpp.model.grossAnnualRate * (1 - ir1y);
    out.push({
      label: "LCI/LCA isenta (prazo de 1 ano) precisa pagar ao menos",
      value: `${((net1y / cdi) * 100).toFixed(1)}% do CDI`,
      basis: `para igualar o líquido do ${selicOpp.name} em 1 ano (365 dias → IR de ${(ir1y * 100).toFixed(1)}%). Isenção e carência devem ser conferidas na oferta.`,
    });
  }
  const p = ctx.hyp.poupancaMonthly;
  if (p !== null) {
    const annual = monthlyToAnnual(p);
    out.push({
      label: "CDB tributável (1 ano) supera a poupança a partir de",
      value: `${((annual / (1 - irRegressivoRate(365)) / cdi) * 100).toFixed(1)}% do CDI`,
      basis: `com poupança mantida em ${pctFmt(p * 100, 4)} a.m. e IR de ${(irRegressivoRate(365) * 100).toFixed(1)}% no CDB (365 dias).`,
    });
  }
  return out;
}

export function runFixedIncome(ctx: ResearchContext) {
  const opps: Opportunity[] = [];
  if (ctx.tesouro) {
    for (const b of selectBonds(ctx.tesouro.bonds, ctx.now)) {
      const o = bondToOpportunity(b, ctx);
      if (o) opps.push(o);
    }
  }
  const p = poupancaOpportunity(ctx);
  if (p) opps.push(p);
  opps.push(...manualOfferOpportunities(ctx));
  return { opportunities: opps, breakEven: breakEvenReferences(ctx, opps), datasetPage: TESOURO_DATASET_PAGE };
}
