import { describe, expect, it } from "vitest";
import { addSpread, annualToMonthly, compound, futureValueWithContributions, monthlyToAnnual, realRate } from "@/lib/finance/rates";
import { applyTax, iofRate, irRegressivoRate } from "@/lib/finance/tax";
import { hhi, parseBRL, tesouroMinimumInvestment, hypotheticalLoss, effectiveAfterFx } from "@/lib/finance/costs";
import { fixedIncomeScenario, volatileRange } from "@/lib/finance/scenarios";
import { annualizedVolatility, maxDrawdown } from "@/lib/finance/stats";

describe("juros e taxas", () => {
  it("juros compostos", () => {
    expect(compound(1000, 0.01, 12)).toBeCloseTo(1126.825, 2);
  });
  it("conversão anual ↔ mensal é inversa", () => {
    expect(monthlyToAnnual(annualToMonthly(0.1365))).toBeCloseTo(0.1365, 10);
    expect(annualToMonthly(0.1268)).toBeCloseTo(0.01, 4);
  });
  it("indexador + spread composto", () => {
    expect(addSpread(0.045, 0.075)).toBeCloseTo(0.123375, 6);
  });
  it("taxa real de Fisher", () => {
    expect(realRate(0.1375, 0.0458)).toBeCloseTo(0.08768, 4);
  });
  it("aportes mensais", () => {
    expect(futureValueWithContributions(0, 100, 0, 12)).toBe(1200);
  });
});

describe("tributação de renda fixa", () => {
  it("IR regressivo nos limites", () => {
    expect(irRegressivoRate(180)).toBe(0.225);
    expect(irRegressivoRate(181)).toBe(0.2);
    expect(irRegressivoRate(360)).toBe(0.2);
    expect(irRegressivoRate(361)).toBe(0.175);
    expect(irRegressivoRate(720)).toBe(0.175);
    expect(irRegressivoRate(721)).toBe(0.15);
  });
  it("IOF regressivo", () => {
    expect(iofRate(1)).toBe(0.96);
    expect(iofRate(15)).toBe(0.5);
    expect(iofRate(29)).toBe(0.03);
    expect(iofRate(30)).toBe(0);
  });
  it("IR incide sobre rendimento após IOF", () => {
    const t = applyTax(100, 10, "renda_fixa_regressiva");
    expect(t.iof).toBeCloseTo(66, 6);
    expect(t.ir).toBeCloseTo(34 * 0.225, 6);
    expect(t.netIncome).toBeCloseTo(100 - 66 - 7.65, 6);
  });
  it("isento e não calculado não aplicam alíquotas", () => {
    expect(applyTax(100, 10, "isento_pf").netIncome).toBe(100);
    const nc = applyTax(100, 10, "nao_calculado");
    expect(nc.irRate).toBeNull();
    expect(nc.note).toMatch(/NÃO calculada/);
  });
  it("sem rendimento positivo não há imposto", () => {
    expect(applyTax(-5, 400, "renda_fixa_regressiva").ir).toBe(0);
  });
});

describe("custos e mínimos", () => {
  it("mínimo do Tesouro: 1% do PU respeitando R$ 30", () => {
    expect(tesouroMinimumInvestment(20251.05)).toBe(202.51);
    expect(tesouroMinimumInvestment(981.46)).toBe(39.26); // 4 frações de 1% (R$ 9,81)
    expect(tesouroMinimumInvestment(3000)).toBe(30);
    expect(tesouroMinimumInvestment(169.59)).toBeCloseTo(30.53, 2);
  });
  it("parseBRL aceita formatos brasileiros", () => {
    expect(parseBRL("R$ 750,00")).toBe(750);
    expect(parseBRL("R$ 5.000")).toBe(5000);
    expect(parseBRL("20.000")).toBe(20000);
    expect(parseBRL("1.234,56")).toBe(1234.56);
    expect(parseBRL("750")).toBe(750);
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("")).toBeNull();
  });
  it("HHI, perda hipotética e câmbio", () => {
    expect(hhi([1])).toBe(1);
    expect(hhi([1, 1, 1, 1])).toBeCloseTo(0.25);
    expect(hypotheticalLoss(750, 0.5)).toBe(375);
    expect(effectiveAfterFx(1000, 0.01, 0.011)).toBeCloseTo(979.11, 2);
  });
});

describe("cenários e estatística", () => {
  it("cenário de renda fixa é consistente", () => {
    const s = fixedIncomeScenario({ amount: 750, days: 365, grossAnnualRate: 0.1367, taxRegime: "renda_fixa_regressiva", inflationAnnual: 0.0458 });
    expect(s.grossFinal).toBeCloseTo(750 * 1.1367, 1);
    expect(s.tax.irRate).toBe(0.175); // 365 dias cai na faixa 361–720
    expect(s.netFinal).toBeCloseTo(750 + s.grossIncome * 0.825, 6);
    expect(s.realNetAnnualized).toBeLessThan(s.netAnnualized);
  });
  it("faixa volátil: pessimista < central < otimista", () => {
    const r = volatileRange(750, 0.5, 1);
    expect(r.pessimista).toBeLessThan(r.central);
    expect(r.central).toBeLessThan(r.otimista);
  });
  it("drawdown e volatilidade", () => {
    expect(maxDrawdown([100, 120, 60, 130])).toBeCloseTo(0.5);
    expect(annualizedVolatility([100, 100, 100])).toBe(0);
  });
});
