/**
 * Agente 6 — Risk Guardian: vetos e alertas por horizonte, compatibilidade com
 * prazo, liquidez, capacidade de perda e qualidade das fontes.
 */
import type { Horizon, ResearchInput } from "../input";
import { HORIZON_DAYS } from "../input";
import type { Opportunity } from "../types";
import { brl, pctFmt } from "../context";
import { hypotheticalLoss } from "../../finance/costs";

export function globalWarnings(i: ResearchInput): string[] {
  const w: string[] = [];
  if (i.hasExpensiveDebt) {
    w.push("Você informou dívidas caras (ex.: cartão rotativo, cheque especial). Juros dessas dívidas costumam superar com folga qualquer rendimento listado aqui; quitá-las tende a ser o 'retorno' mais alto e garantido.");
  }
  if (i.hasEmergencyReserve !== "sim") {
    w.push("Sem reserva de emergência completa: a parcela de curto prazo deve priorizar segurança e liquidez. Ativos voláteis foram vetados em todos os horizontes até haver reserva separada.");
  }
  if (i.liquidityNeed === "imediata") w.push("Necessidade de resgate imediato: produtos com marcação a mercado relevante ou prazo longo foram vetados.");
  if (i.horizons.includes("indefinido")) w.push("Horizonte indefinido: as conclusões abaixo são condicionadas à sua necessidade de liquidez e à tolerância a perdas.");
  if (i.objective === "renda_passiva") {
    w.push("Renda passiva não é necessariamente renda mensal: cupons do Tesouro são semestrais, dividendos/proventos não têm frequência ou valor garantidos, e a variação de preço pode superar os rendimentos recebidos.");
  }
  if (i.taxResidence === "exterior") w.push("Residência fiscal fora do Brasil: as regras tributárias brasileiras usadas nos cenários podem não se aplicar.");
  return w;
}

export function assessRisk(o: Opportunity, h: Horizon, i: ResearchInput, now: Date): { vetoes: string[]; warnings: string[] } {
  const vetoes: string[] = [];
  const warnings: string[] = [];
  const H = HORIZON_DAYS[h];
  const m = o.maturityIso ? (new Date(o.maturityIso).getTime() - now.getTime()) / 86_400_000 : null;

  if (o.dataStatus === "indisponivel") vetoes.push("Dados indisponíveis: sem base para avaliar.");
  if (o.viableWithCapital === false) vetoes.push(`Mínimo de aplicação acima do capital informado (${brl(i.capital)}).`);
  if (o.viableWithCapital === null) warnings.push("Mínimo de aplicação não verificado.");

  if (o.category === "cripto") {
    if (h === "curto") vetoes.push("Ativo de altíssima volatilidade não é adequado a necessidade de curto prazo.");
    if (i.hasEmergencyReserve !== "sim") vetoes.push("Sem reserva de emergência separada.");
    if (i.liquidityNeed === "imediata") vetoes.push("Necessidade de resgate imediato.");
    if (i.lossReaction === "venderia_tudo") vetoes.push("Você indicou que venderia tudo em uma queda forte — padrão incompatível com a volatilidade do ativo.");
    if (o.model?.type === "volatil") {
      const ddPct = o.model.maxDrawdown * 100;
      if (i.maxTolerableLossPct < ddPct) {
        vetoes.push(`Queda histórica máxima observada (${pctFmt(ddPct, 0)}) excede sua tolerância informada (${i.maxTolerableLossPct}%).`);
      }
      warnings.push(`Perda hipotética se a pior queda do último ano se repetisse sobre todo o capital: ${brl(hypotheticalLoss(i.capital, o.model.maxDrawdown))} (não é limite de perda).`);
    }
    warnings.push("Concentrar todo o capital em um único ativo volátil maximiza o risco (concentração HHI = 1).");
  }

  if (o.category === "tesouro_renda_mais" && h !== "longo") vetoes.push("Produto de prazo muito longo, incompatível com o horizonte.");
  if (o.category === "tesouro_renda_mais" && i.liquidityNeed !== "nao_preve") vetoes.push("Há previsão de resgate; o produto é para décadas.");

  if (["tesouro_prefixado", "tesouro_ipca", "tesouro_ipca_juros"].includes(o.category) && m !== null) {
    if (h === "curto" && m > 2 * H) vetoes.push(`Vencimento em ~${(m / 365).toFixed(1)} anos: para curto prazo, o resgate antecipado a preço de mercado pode gerar perda.`);
    else if (m > H * 1.15) warnings.push("Vencimento após o horizonte: o valor no resgate dependerá do preço de mercado.");
    if (i.liquidityNeed === "imediata" && m > 400) vetoes.push("Necessidade de resgate imediato com título sujeito a marcação a mercado relevante.");
  }

  if (o.category === "poupanca" && (h === "longo" || h === "medio")) warnings.push("Em prazos longos, comparar com alternativas que protejam contra a inflação.");
  if (o.dataStatus === "manual") warnings.push("Oferta informada por você: taxa, liquidez e emissor não verificados pelo sistema.");
  if (i.hasExpensiveDebt) warnings.push("Avalie antes quitar dívidas caras.");
  return { vetoes, warnings };
}
