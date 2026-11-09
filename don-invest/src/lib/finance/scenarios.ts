/**
 * Cenários ilustrativos — premissas SEMPRE explícitas. Não são previsão nem promessa.
 */
import { addSpread, annualToPeriodic, compound, realRate } from "./rates";
import { applyTax, type TaxBreakdown, type TaxRegime } from "./tax";

export interface ScenarioAssumption {
  key: string;
  label: string;
  value: number; // em % quando unit = "% a.a."
  unit: string;
  origin: "observado" | "hipotese_editavel";
  sourceId?: string;
}

export interface FixedIncomeScenarioInput {
  amount: number;
  days: number; // dias corridos de permanência
  grossAnnualRate: number; // fração
  taxRegime: TaxRegime;
  inflationAnnual: number; // fração (hipótese)
  annualCustodyRate?: number; // fração
}

export interface ScenarioResult {
  days: number;
  amount: number;
  grossFinal: number;
  grossIncome: number;
  custody: number;
  tax: TaxBreakdown;
  netFinal: number;
  netAnnualized: number;
  realNetAnnualized: number;
  realNetFinal: number;
}

export function fixedIncomeScenario(i: FixedIncomeScenarioInput): ScenarioResult {
  const years = i.days / 365;
  const grossFinal = compound(i.amount, annualToPeriodic(i.grossAnnualRate, 365), i.days);
  const custody = i.amount * (i.annualCustodyRate ?? 0) * years;
  const grossIncome = grossFinal - i.amount - custody;
  const tax = applyTax(grossIncome, i.days, i.taxRegime);
  const netFinal = i.amount + tax.netIncome;
  const netAnnualized = years > 0 ? (netFinal / i.amount) ** (1 / years) - 1 : 0;
  const realNetAnnualized = realRate(netAnnualized, i.inflationAnnual);
  const realNetFinal = netFinal / (1 + i.inflationAnnual) ** years;
  return { days: i.days, amount: i.amount, grossFinal, grossIncome, custody, tax, netFinal, netAnnualized, realNetAnnualized, realNetFinal };
}

export { addSpread };

/**
 * Faixa ilustrativa para ativo volátil usando volatilidade histórica (log-normal simples, deriva zero).
 * Mostra o quanto o valor PODE variar — não é distribuição verdadeira nem previsão.
 */
export function volatileRange(amount: number, annualVol: number, years: number, z = 1.645) {
  const s = annualVol * Math.sqrt(years);
  const drift = -0.5 * s * s; // deriva zero na média
  return {
    pessimista: amount * Math.exp(drift - z * s),
    central: amount * Math.exp(drift),
    otimista: amount * Math.exp(drift + z * s),
    confidenceLabel: "intervalo ilustrativo de ~90% sob hipótese log-normal com volatilidade histórica e retorno esperado zero",
  };
}
