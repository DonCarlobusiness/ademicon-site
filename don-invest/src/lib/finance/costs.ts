/** Custos: mínimo de aplicação, spread cambial, taxa de custódia, concentração, perda hipotética. */

/**
 * Mínimo de compra no Tesouro Direto: 1% do PU, respeitado o valor mínimo de R$ 30,00
 * (regra catalogada do programa — conferir em tesourodireto.com.br). Fração em múltiplos de 0,01.
 */
export const TESOURO_MIN_ORDER_BRL = 30;
export function tesouroMinimumInvestment(unitPrice: number): number {
  if (unitPrice <= 0) throw new Error("PU inválido");
  const onePct = unitPrice * 0.01;
  if (onePct >= TESOURO_MIN_ORDER_BRL) return round2(onePct);
  const fractions = Math.ceil(TESOURO_MIN_ORDER_BRL / onePct - 1e-9);
  return round2(fractions * onePct);
}

/** Valor efetivamente investido após spread cambial e IOF de câmbio (frações). */
export function effectiveAfterFx(amountBrl: number, fxSpread: number, fxIof: number): number {
  return amountBrl * (1 - fxSpread) * (1 - fxIof);
}

/** Custo total de ida (compra) em fração: taxa de negociação + spread de compra (metade do bid-ask). */
export function roundTripCostFraction(takerFee: number, bidAskSpreadFraction: number): number {
  // ida e volta: duas taxas + spread inteiro
  return 2 * takerFee + bidAskSpreadFraction;
}

/** Taxa de custódia anual aplicada sobre o saldo médio (aproximação). */
export function custodyCost(balance: number, annualRate: number, years: number): number {
  return balance * annualRate * years;
}

/** Índice Herfindahl-Hirschman (0–1) de concentração por pesos. */
export function hhi(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  return weights.reduce((acc, w) => acc + (w / total) ** 2, 0);
}

/** Perda hipotética se o pior recuo histórico observado se repetisse (não é limite real de perda). */
export function hypotheticalLoss(amount: number, drawdown: number): number {
  return amount * Math.min(1, Math.max(0, drawdown));
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Interpreta valores monetários digitados em pt-BR: "R$ 750,00", "5.000", "20.000", "1.234,56", "750".
 * Ponto seguido de exatamente 3 dígitos = separador de milhar; vírgula = decimal.
 */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$|\s|BRL/gi, "").trim();
  if (!s) return null;
  if (!/^[\d.,]+$/.test(s)) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
