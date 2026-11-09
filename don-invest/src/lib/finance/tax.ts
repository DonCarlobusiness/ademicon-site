/**
 * Regras tributárias de renda fixa para pessoa física residente no Brasil.
 * Catalogadas a partir da legislação (Lei 11.033/2004 — IR regressivo; Decreto 6.306/2007 — IOF).
 * NÃO aplicar a ações, FIIs, cripto, fundos com come-cotas ou ativos no exterior.
 * Vigência deve ser reconferida: ver docs/methodology.md.
 */

export const TAX_RULES_CHECKED_AT = "2026-11-09";

/** Alíquota de IR regressiva por prazo em dias corridos (renda fixa tributável). */
export function irRegressivoRate(days: number): number {
  if (days < 0) throw new Error("prazo negativo");
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

/** Tabela regressiva de IOF sobre rendimento para resgates com menos de 30 dias. */
const IOF_TABLE = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];

export function iofRate(days: number): number {
  if (days < 1) return 0.96;
  if (days >= 30) return 0;
  return IOF_TABLE[days - 1] / 100;
}

export type TaxRegime = "renda_fixa_regressiva" | "isento_pf" | "nao_calculado";

export interface TaxBreakdown {
  regime: TaxRegime;
  grossIncome: number;
  iof: number;
  ir: number;
  netIncome: number;
  irRate: number | null;
  iofRate: number | null;
  note: string;
}

export function applyTax(grossIncome: number, days: number, regime: TaxRegime): TaxBreakdown {
  if (regime === "isento_pf") {
    return { regime, grossIncome, iof: 0, ir: 0, netIncome: grossIncome, irRate: 0, iofRate: 0, note: "Isento de IR para pessoa física (regra catalogada; conferir vigência)." };
  }
  if (regime === "nao_calculado") {
    return { regime, grossIncome, iof: 0, ir: 0, netIncome: grossIncome, irRate: null, iofRate: null, note: "Tributação NÃO calculada: a regra depende do tipo de ativo, custódia e legislação vigente." };
  }
  if (grossIncome <= 0) {
    return { regime, grossIncome, iof: 0, ir: 0, netIncome: grossIncome, irRate: irRegressivoRate(days), iofRate: iofRate(days), note: "Sem rendimento positivo: não há IR/IOF sobre rendimento." };
  }
  const iofR = iofRate(days);
  const iof = grossIncome * iofR;
  const irR = irRegressivoRate(days);
  const ir = (grossIncome - iof) * irR;
  return {
    regime,
    grossIncome,
    iof,
    ir,
    netIncome: grossIncome - iof - ir,
    irRate: irR,
    iofRate: iofR,
    note: `IR regressivo ${(irR * 100).toFixed(1)}% sobre rendimento${iofR > 0 ? ` e IOF ${(iofR * 100).toFixed(0)}% (resgate < 30 dias)` : ""}.`,
  };
}
