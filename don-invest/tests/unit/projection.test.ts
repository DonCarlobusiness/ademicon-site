import { describe, expect, it } from "vitest";
import { futureValue, lotBasedTax, monthlyRateFromAnnual, project, sustainableMonthlyWithdrawal, validateProjectionInput, formatMonths, STANDARD_HORIZON_MONTHS } from "@/lib/finance/projection";
import { parseBRL } from "@/lib/finance/costs";
import { fmtBRL, parsePctInput, toInputBRL } from "@/lib/format";

describe("projeção com aportes", () => {
  it("taxa mensal equivalente", () => {
    expect(monthlyRateFromAnnual(0.1)).toBeCloseTo(0.00797414, 8);
    expect(() => monthlyRateFromAnnual(-1)).toThrow();
  });

  it("caso de aceite: R$ 500 + R$ 250/mês, 12 meses, 10% a.a.", () => {
    const r = project({ initial: 500, monthly: 250, annualRate: 0.1, months: 12 });
    const i = (1.1) ** (1 / 12) - 1;
    const expected = 500 * (1 + i) ** 12 + 250 * (((1 + i) ** 12 - 1) / i);
    expect(r.finalBalance).toBeCloseTo(expected, 9);
    expect(r.finalBalance).toBeCloseTo(3685.13, 2);
    expect(r.totalInvested).toBe(3500);
    expect(r.grossGain).toBeCloseTo(expected - 3500, 9);
    expect(r.schedule).toHaveLength(13);
    expect(r.schedule[12].balance).toBeCloseTo(r.finalBalance, 8);
  });

  it("caso de aceite: R$ 10.000, 10 anos", () => {
    const r = project({ initial: 10000, monthly: 0, annualRate: 0.1, months: 120 });
    expect(r.finalBalance).toBeCloseTo(10000 * 1.1 ** 10, 6);
  });

  it("taxa 0%: FV = P + A·n, sem NaN", () => {
    const r = project({ initial: 500, monthly: 250, annualRate: 0, months: 12 });
    expect(r.finalBalance).toBe(3500);
    expect(r.grossGain).toBe(0);
    expect(Number.isNaN(r.grossGainPct)).toBe(false);
    expect(futureValue(100, 10, 0, 5)).toBe(150);
  });

  it("capital zero com aportes é permitido; ambos zero é inválido", () => {
    expect(project({ initial: 0, monthly: 100, annualRate: 0.1, months: 12 }).totalInvested).toBe(1200);
    expect(validateProjectionInput({ initial: 0, monthly: 0, annualRate: 0.1, months: 12 })).toContain("Informe capital inicial ou aporte mensal.");
  });

  it("rejeita negativos, NaN e prazos inválidos", () => {
    expect(validateProjectionInput({ initial: -1, monthly: 0, annualRate: 0.1, months: 12 }).length).toBeGreaterThan(0);
    expect(validateProjectionInput({ initial: NaN, monthly: 0, annualRate: 0.1, months: 12 }).length).toBeGreaterThan(0);
    expect(validateProjectionInput({ initial: 1, monthly: 0, annualRate: 0.1, months: 0 }).length).toBeGreaterThan(0);
    expect(validateProjectionInput({ initial: 1, monthly: 0, annualRate: 0.1, months: 601 }).length).toBeGreaterThan(0);
    expect(() => project({ initial: 1, monthly: 0, annualRate: NaN, months: 12 })).toThrow();
  });

  it("sem regra tributária: impostos não calculados e líquido ausente", () => {
    const r = project({ initial: 750, monthly: 0, annualRate: 0.1, months: 12 });
    expect(r.tax.status).toBe("nao_calculado");
    expect(r.netBalance).toBeNull();
  });

  it("IR por lote: capital 12 meses (17,5%) e aportes com prazos menores", () => {
    const i = monthlyRateFromAnnual(0.12);
    const onlyInitial = lotBasedTax(1000, 0, i, 12);
    expect(onlyInitial.ir).toBeCloseTo(120 * 0.175, 6);
    const withLots = lotBasedTax(0, 100, i, 12);
    // aporte do mês 12 não rende; do mês 11 fica 1 mês (IR 22,5%, sem IOF pois ≥30 dias)
    expect(withLots.ir).toBeGreaterThan(0);
    const aggregated = (futureValue(0, 100, i, 12) - 1200) * 0.175;
    expect(withLots.ir).toBeGreaterThan(aggregated); // lotes curtos pagam alíquota maior
  });

  it("líquido = bruto − impostos quando calculado; isento mantém bruto", () => {
    const r = project({ initial: 750, monthly: 250, annualRate: 0.13, months: 24, tax: "renda_fixa_regressiva" });
    expect(r.netBalance).toBeCloseTo(r.finalBalance - r.tax.ir! - r.tax.iof!, 9);
    const e = project({ initial: 750, monthly: 0, annualRate: 0.08, months: 24, tax: "isento" });
    expect(e.netBalance).toBe(e.finalBalance);
  });

  it("custos informados reduzem o saldo e são reportados", () => {
    const a = project({ initial: 10000, monthly: 0, annualRate: 0.1, months: 12 });
    const b = project({ initial: 10000, monthly: 0, annualRate: 0.1, months: 12, annualCostRate: 0.002 });
    expect(b.finalBalance).toBeLessThan(a.finalBalance);
    expect(b.costs).toBeCloseTo(a.finalBalance - b.finalBalance, 9);
  });

  it("poder de compra com inflação hipotética", () => {
    const r = project({ initial: 1000, monthly: 0, annualRate: 0.1, months: 24, inflationAnnual: 0.05 });
    expect(r.realBalance).toBeCloseTo(r.finalBalance / 1.05 ** 2, 9);
  });

  it("saque sustentável só existe com juro real positivo", () => {
    expect(sustainableMonthlyWithdrawal(100000, 0.1, 0.05)).toBeCloseTo(100000 * ((1.1 / 1.05) ** (1 / 12) - 1), 6);
    expect(sustainableMonthlyWithdrawal(100000, 0.04, 0.05)).toBeNull();
  });

  it("horizontes padrão e rótulos", () => {
    expect([...STANDARD_HORIZON_MONTHS]).toEqual([1, 3, 6, 12, 36, 60, 120, 240, 360]);
    expect(formatMonths(1)).toBe("1 mês");
    expect(formatMonths(6)).toBe("6 meses");
    expect(formatMonths(12)).toBe("1 ano");
    expect(formatMonths(120)).toBe("10 anos");
  });
});

describe("formatação BRL", () => {
  it("parse e formatação", () => {
    expect(parseBRL("R$ 10.000")).toBe(10000);
    expect(parseBRL("10.000,50")).toBe(10000.5);
    expect(parseBRL("500")).toBe(500);
    expect(parseBRL("-5")).toBeNull();
    expect(toInputBRL(750)).toBe("750,00");
    expect(fmtBRL(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
    expect(fmtBRL(NaN)).toBe("—");
    expect(parsePctInput("10,5")).toBeCloseTo(0.105);
    expect(parsePctInput("-10")).toBeCloseTo(-0.1);
    expect(parsePctInput("abc")).toBeNull();
  });
});
