/** Conversões de taxa e juros compostos. Taxas em fração (0.1375 = 13,75%) salvo indicação. */

export const BUSINESS_DAYS_PER_YEAR = 252;

export const pct = (x: number) => x / 100;

export function compound(principal: number, ratePerPeriod: number, periods: number): number {
  if (principal < 0) throw new Error("principal negativo");
  return principal * (1 + ratePerPeriod) ** periods;
}

/** Converte taxa efetiva anual em taxa efetiva por período (n períodos no ano). */
export function annualToPeriodic(annual: number, periodsPerYear: number): number {
  return (1 + annual) ** (1 / periodsPerYear) - 1;
}

export function periodicToAnnual(periodic: number, periodsPerYear: number): number {
  return (1 + periodic) ** periodsPerYear - 1;
}

export const annualToMonthly = (a: number) => annualToPeriodic(a, 12);
export const monthlyToAnnual = (m: number) => periodicToAnnual(m, 12);
export const annualToDaily252 = (a: number) => annualToPeriodic(a, BUSINESS_DAYS_PER_YEAR);

/** Taxa composta "indexador + spread" (ex.: Selic + 0,05% a.a.; IPCA + 7,5% a.a.). */
export function addSpread(indexAnnual: number, spreadAnnual: number): number {
  return (1 + indexAnnual) * (1 + spreadAnnual) - 1;
}

/** Taxa real (Fisher): (1+nominal)/(1+inflação) − 1 */
export function realRate(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Valor futuro com aportes mensais no fim de cada mês. */
export function futureValueWithContributions(principal: number, monthlyContribution: number, monthlyRate: number, months: number): number {
  let v = principal;
  for (let i = 0; i < months; i++) v = v * (1 + monthlyRate) + monthlyContribution;
  return v;
}

/** Aproximação de dias úteis a partir de dias corridos (252/365). */
export function calendarToBusinessDays(days: number): number {
  return Math.round((days * BUSINESS_DAYS_PER_YEAR) / 365);
}
