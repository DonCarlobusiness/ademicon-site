/**
 * Agente 4 — Global Markets Research.
 * Fase 1: criptoativos via Kraken (dados públicos). Ações/ETFs/FIIs/REITs dependem de
 * provedor licenciado — ficam como classes indisponíveis, sem notas inventadas.
 */
import type { ResearchContext } from "../context";
import { brl, pctFmt, usd } from "../context";
import type { Opportunity, UnavailableClass } from "../types";
import { KRAKEN_PAIRS, type KrakenPairId } from "../../market-data/kraken";
import { quotesStatus } from "../../market-data/quotes";
import { RULES, ruleSource } from "../../catalog/rules";
import { addSources } from "../context";
import { firstInvestable } from "../input";
import { WHERE } from "../../catalog/links";

export function cryptoOpportunity(ctx: ResearchContext, pair: KrakenPairId): Opportunity | null {
  const d = ctx.kraken?.[pair];
  if (!d) return null;
  const meta = KRAKEN_PAIRS[pair];
  const t = d.ticker;
  const fx = ctx.hyp.usdbrl;
  const fxSrc = ctx.macro?.usdbrl?.source;
  addSources(ctx, [ruleSource(RULES.fgc)]);

  let minUsd: number | null = null;
  if (d.info?.orderMinBase) minUsd = Math.max(d.info.orderMinBase * t.ask, d.info.costMinQuote ?? 0);
  const minBrl = minUsd !== null && fx ? minUsd * fx : null;
  const viable = minBrl === null ? null : minBrl <= firstInvestable(ctx.input);
  const fee = d.info?.takerFeePctBaseTier ?? null;
  const vol = d.history?.annualizedVol ?? null;
  const mdd = d.history?.maxDrawdown ?? null;
  const ids = d.sources.map((s) => s.id);
  if (fxSrc) ids.push(fxSrc.id);

  const priceBrl = fx ? t.last * fx : null;
  const histNote = d.history
    ? `Histórico de ${d.history.days} dias (Kraken OHLC): volatilidade anualizada ${pctFmt(d.history.annualizedVol * 100, 1)}, maior queda pico→vale ${pctFmt(d.history.maxDrawdown * 100, 1)}, variação no período ${pctFmt(d.history.returnPeriodPct, 1)}. Passado não indica futuro.`
    : "Histórico indisponível nesta consulta.";

  return {
    id: `cripto-${meta.base.toLowerCase()}`,
    name: meta.asset,
    category: "cripto",
    classLabel: "Criptoativo (mercado à vista)",
    issuer: "Sem emissor (rede descentralizada); cotação na Kraken",
    currency: "USD",
    minimum: {
      display:
        minUsd !== null
          ? `Ordem mínima na Kraken: ${d.info!.orderMinBase} ${meta.base} ≈ ${usd(minUsd)}${minBrl !== null ? ` ≈ ${brl(minBrl)} (câmbio BCB, indicativo)` : ""}`
          : "não verificado",
      value: minBrl,
      sourceIds: ids,
      verified: minUsd !== null,
    },
    rateOrPrice: {
      display: `Último ${usd(t.last)} · compra (ask) ${usd(t.ask)} · venda (bid) ${usd(t.bid)} · spread ${pctFmt(t.spreadPct, 4)} · 24h ${pctFmt(t.change24hPct)}${priceBrl ? ` · ≈ ${brl(priceBrl, 0)} (conversão indicativa pelo dólar BCB, não é preço contratável em BRL)` : ""}`,
      value: t.last,
      sourceIds: ids,
      verified: true,
    },
    benchmark: "Sem benchmark de renda; preço de mercado",
    liquidity: "Mercado 24/7 na exchange; prazos de depósito/saque em BRL e conversão não verificados.",
    maturity: null,
    maturityIso: null,
    taxes: "Tributação NÃO calculada: depende de custódia (exchange nacional ou no exterior), valores e legislação vigente. Consulte a Receita Federal.",
    costs: `Taxa de negociação (nível base): ${fee !== null ? pctFmt(fee, 2) + " (API pública)" : "não verificada (API não retornou tabela)"}. Spread observado ${pctFmt(t.spreadPct, 4)}. Câmbio BRL→USD, depósito, saque e IOF: não verificados.`,
    protection: "Sem FGC e sem garantia soberana. Risco de custódia na exchange.",
    risks: [
      `Volatilidade muito alta${vol !== null ? ` (${pctFmt(vol * 100, 0)} a.a. no histórico)` : ""}`,
      mdd !== null ? `Queda histórica de até ${pctFmt(mdd * 100, 0)} no último ano` : "Quedas profundas são frequentes",
      "Exposição cambial ao dólar",
      "Risco regulatório e de custódia/exchange",
      "Não gera renda: qualquer 'renda' viria apenas de venda com lucro",
    ],
    pros: ["Mercado líquido e contínuo", "Ordem mínima baixa", "Diversificação não correlacionada de forma estável (não garantida)"],
    cons: ["Pode perder grande parte do valor em pouco tempo", "Custos totais não verificados", "Não é renda passiva"],
    invalidators: ["Necessidade de resgate no curto prazo", "Baixa tolerância a perdas", "Ausência de reserva de emergência"],
    missingInfo: [
      "Elegibilidade de residentes no Brasil na Kraken e forma de depósito em BRL (não verificadas)",
      "Custo total de câmbio e transferência",
      "Regras tributárias aplicáveis ao seu caso",
    ],
    viableWithCapital: viable,
    viabilityNote: viable === null ? "Mínimo não verificado." : viable ? `Ordem mínima (~${brl(minBrl)}) cabe no capital — mas custos de entrada não verificados podem ser relevantes para valores pequenos.` : "Ordem mínima excede o capital.",
    incomeNote: "Criptoativos não pagam rendimentos neste formato à vista. " + histNote,
    dataStatus: d.info && d.history ? "verificado" : "parcial",
    sourceIds: [...ids, RULES.fgc.id],
    observedAt: d.sources[0]?.referenceAt ?? null,
    officialUrl: "https://www.kraken.com/",
    model: vol !== null && mdd !== null ? { type: "volatil", annualVol: vol, maxDrawdown: mdd, historyDays: d.history!.days } : null,
    byHorizon: {},
    projections: [],
    whereToCheck: [...WHERE.kraken],
    identifier: `Kraken ${meta.request} (chave ${meta.resultKey})`,
  };
}

export function unavailableClasses(ctx: ResearchContext): UnavailableClass[] {
  const q = quotesStatus();
  const list: UnavailableClass[] = [
    {
      className: "Ações, ETFs e FIIs da B3",
      reason: q.error ?? "Provedor não configurado.",
      howToIntegrate: "1) contratar um provedor licenciado (ex.: B3 Market Data/UP2DATA, brapi.dev, Twelve Data); 2) definir QUOTES_PROVIDER e QUOTES_API_KEY em .env.local no servidor; 3) implementar o adaptador em src/lib/market-data/quotes.ts e liberar o host em http.ts. Ver docs/data-sources.md.",
    },
    {
      className: "Ações, ETFs e REITs internacionais",
      reason: q.error ?? "Provedor não configurado.",
      howToIntegrate: "Provedor licenciado com dados NYSE/Nasdaq (ex.: Polygon, Twelve Data, Alpha Vantage) — atenção a atraso de 15 min e termos de redistribuição.",
    },
    {
      className: "CDB, RDB, LCI, LCA e outros produtos bancários",
      reason: "Não há API pública oficial e confiável com ofertas contratáveis de todos os bancos; ofertas variam por cliente e plataforma.",
      howToIntegrate: "Inclua manualmente ofertas que você encontrou (marcadas como não verificadas) e use os pontos de equilíbrio do relatório; futuramente, Open Finance com consentimento.",
    },
    {
      className: "Fundos de investimento (CVM)",
      reason: "Fase 1 verifica apenas a disponibilidade do portal CVM Dados Abertos; informes diários ainda não são analisados.",
      howToIntegrate: "Fase 2: ingerir cad_fi.csv e inf_diario_fi (cota é passada, não preço negociável).",
    },
    {
      className: "Renda fixa internacional e commodities",
      reason: "Sem fonte licenciada configurada. Exposição a commodities seria via instrumento negociável (ETF/fundo), não compra física.",
      howToIntegrate: "Provedor licenciado de treasuries e ETFs de commodities, com custos cambiais e elegibilidade por jurisdição.",
    },
  ];
  if (!ctx.kraken) {
    list.push({ className: "Criptoativos", reason: "A API pública da Kraken não respondeu nesta pesquisa.", howToIntegrate: "Tente novamente; ver /configuracoes para o status do conector." });
  }
  if (!ctx.tesouro) {
    list.push({ className: "Tesouro Direto", reason: "O CSV oficial do Tesouro Transparente não respondeu nesta pesquisa.", howToIntegrate: "Consulte manualmente em https://www.tesourodireto.com.br/ e tente novamente." });
  }
  if (ctx.input.regionPreference === "internacional") {
    list.unshift({ className: "Observação", reason: "Você preferiu internacional, mas apenas cripto (cotada em USD) tem dados internacionais nesta versão.", howToIntegrate: "Configure um provedor licenciado." });
  }
  return list;
}

export function runGlobalMarkets(ctx: ResearchContext) {
  const opps: Opportunity[] = [];
  for (const p of Object.keys(KRAKEN_PAIRS) as KrakenPairId[]) {
    const o = cryptoOpportunity(ctx, p);
    if (o) opps.push(o);
  }
  return { opportunities: opps, unavailable: unavailableClasses(ctx) };
}
