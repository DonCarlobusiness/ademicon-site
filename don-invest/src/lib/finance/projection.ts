/**
 * Projeções de patrimônio com aportes mensais — funções puras, sem arredondamento no núcleo
 * (arredondamento somente na apresentação).
 *
 * i = (1 + r)^(1/12) − 1
 * FV = P·(1+i)^n + A·((1+i)^n − 1)/i   (aporte no FIM de cada mês); se i = 0: FV = P + A·n
 */
import { irRegressivoRate, iofRate } from "./tax";

export const STANDARD_HORIZON_MONTHS = [1, 3, 6, 12, 36, 60, 120, 240, 360] as const;
export const DAYS_PER_MONTH = 365.25 / 12;

export function monthlyRateFromAnnual(annual: number): number {
  if (!Number.isFinite(annual) || annual <= -1) throw new Error("Taxa anual inválida (deve ser maior que −100%)");
  return (1 + annual) ** (1 / 12) - 1;
}

export function futureValue(P: number, A: number, i: number, n: number): number {
  if (n === 0) return P;
  if (i === 0) return P + A * n;
  const g = (1 + i) ** n;
  return P * g + A * ((g - 1) / i);
}

export type TaxMode = "nao_calcular" | "renda_fixa_regressiva" | "isento";

export interface ProjectionInput {
  initial: number;
  monthly: number;
  annualRate: number; // fração
  months: number;
  inflationAnnual?: number | null; // fração (hipótese)
  annualCostRate?: number; // fração, ex. custódia 0.002 (opcional, informado)
  tax?: TaxMode;
}

export interface SchedulePoint {
  month: number;
  invested: number;
  balance: number;
  gains: number;
}

export interface TaxSummary {
  status: "calculado" | "nao_calculado" | "isento";
  ir: number | null;
  iof: number | null;
  note: string;
}

export interface ProjectionResult {
  months: number;
  annualRate: number;
  monthlyRate: number;
  totalInvested: number;
  finalBalance: number; // bruto, após custos informados
  grossGain: number;
  grossGainPct: number; // sobre o total investido
  costs: number; // custos informados (0 se não houver)
  tax: TaxSummary;
  netBalance: number | null; // somente quando o imposto foi calculado/isento
  realBalance: number | null; // poder de compra de hoje (hipótese de inflação)
  realNetBalance: number | null;
  schedule: SchedulePoint[];
}

export function validateProjectionInput(p: ProjectionInput): string[] {
  const errs: string[] = [];
  const num = (v: number) => Number.isFinite(v);
  if (!num(p.initial) || p.initial < 0) errs.push("Capital inicial deve ser zero ou positivo.");
  if (!num(p.monthly) || p.monthly < 0) errs.push("Aporte mensal deve ser zero ou positivo.");
  if (num(p.initial) && num(p.monthly) && p.initial === 0 && p.monthly === 0) errs.push("Informe capital inicial ou aporte mensal.");
  if (!Number.isInteger(p.months) || p.months < 1 || p.months > 600) errs.push("Prazo deve ser de 1 a 600 meses.");
  if (!num(p.annualRate) || p.annualRate <= -1 || p.annualRate > 5) errs.push("Taxa anual deve estar entre −99,9% e 500%.");
  if (p.inflationAnnual !== undefined && p.inflationAnnual !== null && (!num(p.inflationAnnual) || p.inflationAnnual <= -1)) errs.push("Inflação inválida.");
  if (p.initial > 1e10 || p.monthly > 1e9) errs.push("Valor acima do limite suportado.");
  return errs;
}

/**
 * IR regressivo POR LOTE: cada aporte tem seu próprio prazo e alíquota.
 * O capital inicial é o lote 0 (prazo n meses); o aporte do fim do mês k fica (n−k) meses.
 */
export function lotBasedTax(P: number, A: number, i: number, n: number): { ir: number; iof: number } {
  let ir = 0;
  let iof = 0;
  const lots: { amount: number; heldMonths: number }[] = [];
  if (P > 0) lots.push({ amount: P, heldMonths: n });
  if (A > 0) for (let k = 1; k <= n; k++) lots.push({ amount: A, heldMonths: n - k });
  for (const lot of lots) {
    const value = lot.amount * (1 + i) ** lot.heldMonths;
    const gain = value - lot.amount;
    if (gain <= 0) continue;
    const days = Math.round(lot.heldMonths * DAYS_PER_MONTH);
    const lotIof = gain * iofRate(Math.max(1, days));
    const lotIr = (gain - lotIof) * irRegressivoRate(days);
    iof += lotIof;
    ir += lotIr;
  }
  return { ir, iof };
}

export function project(p: ProjectionInput): ProjectionResult {
  const errs = validateProjectionInput(p);
  if (errs.length) throw new Error(errs.join(" "));
  const iGross = monthlyRateFromAnnual(p.annualRate);
  const cost = p.annualCostRate ?? 0;
  const i = cost > 0 ? (1 + iGross) * (1 - cost) ** (1 / 12) - 1 : iGross;
  const n = p.months;

  const schedule: SchedulePoint[] = [{ month: 0, invested: p.initial, balance: p.initial, gains: 0 }];
  let bal = p.initial;
  for (let m = 1; m <= n; m++) {
    bal = bal * (1 + i) + p.monthly;
    const invested = p.initial + p.monthly * m;
    schedule.push({ month: m, invested, balance: bal, gains: bal - invested });
  }
  const finalBalance = futureValue(p.initial, p.monthly, i, n);
  const totalInvested = p.initial + p.monthly * n;
  const grossGain = finalBalance - totalInvested;
  const costs = cost > 0 ? futureValue(p.initial, p.monthly, iGross, n) - finalBalance : 0;

  let tax: TaxSummary;
  const mode = p.tax ?? "nao_calcular";
  if (mode === "isento") {
    tax = { status: "isento", ir: 0, iof: 0, note: "Isento de IR para pessoa física (regra informada para este produto)." };
  } else if (mode === "renda_fixa_regressiva") {
    const t = lotBasedTax(p.initial, p.monthly, i, n);
    tax = {
      status: "calculado",
      ir: t.ir,
      iof: t.iof,
      note: "IR regressivo de renda fixa calculado por lote (cada aporte com seu próprio prazo) e IOF para lotes com menos de 30 dias. Meses convertidos em dias pela média de 30,44 dias.",
    };
  } else {
    tax = { status: "nao_calculado", ir: null, iof: null, note: "Impostos não calculados: escolha a regra tributária do produto para estimar o valor líquido." };
  }
  const netBalance = tax.status === "nao_calculado" ? null : finalBalance - (tax.ir ?? 0) - (tax.iof ?? 0);
  const inf = p.inflationAnnual;
  const deflator = inf === undefined || inf === null ? null : (1 + inf) ** (n / 12);
  return {
    months: n,
    annualRate: p.annualRate,
    monthlyRate: i,
    totalInvested,
    finalBalance,
    grossGain,
    grossGainPct: totalInvested > 0 ? grossGain / totalInvested : 0,
    costs,
    tax,
    netBalance,
    realBalance: deflator ? finalBalance / deflator : null,
    realNetBalance: deflator && netBalance !== null ? netBalance / deflator : null,
    schedule,
  };
}

/**
 * Saque mensal hipotético que preserva o poder de compra do patrimônio
 * (retira apenas o rendimento REAL). É SAQUE de um plano de retiradas, não distribuição
 * paga pelo produto, e depende das mesmas hipóteses de taxa e inflação.
 */
export function sustainableMonthlyWithdrawal(balance: number, annualRate: number, inflationAnnual: number): number | null {
  const real = (1 + annualRate) / (1 + inflationAnnual) - 1;
  if (real <= 0 || balance <= 0) return null;
  return balance * ((1 + real) ** (1 / 12) - 1);
}

export interface NamedScenario {
  key: "estressado" | "conservador" | "intermediario" | "otimista";
  label: string;
  annualRate: number;
}

export const DEFAULT_SCENARIOS: NamedScenario[] = [
  { key: "estressado", label: "Estressado (perda)", annualRate: -0.1 },
  { key: "conservador", label: "Conservador", annualRate: 0.06 },
  { key: "intermediario", label: "Intermediário", annualRate: 0.1 },
  { key: "otimista", label: "Otimista", annualRate: 0.14 },
];

export function formatMonths(m: number): string {
  if (m < 12) return `${m} ${m === 1 ? "mês" : "meses"}`;
  if (m % 12 === 0) return `${m / 12} ${m === 12 ? "ano" : "anos"}`;
  return `${(m / 12).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} anos`;
}
