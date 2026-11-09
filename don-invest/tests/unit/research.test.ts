import { beforeEach, describe, expect, it } from "vitest";
import { FIXED_NOW, fixtureConnectors } from "../helpers";
import { runResearch } from "@/lib/analysis/research";
import { cacheClear, resetCircuits } from "@/lib/market-data/http";
import { ResearchInputSchema } from "@/lib/analysis/input";
import { reportToCsv } from "@/lib/export";
import { complianceMode } from "@/lib/compliance";

beforeEach(() => {
  cacheClear();
  resetCircuits();
});

const base = { capital: "R$ 750,00", horizons: ["curto", "longo"] as ("curto" | "longo")[], objective: "renda_passiva" as const, hasEmergencyReserve: "sim" as const };

describe("pipeline de pesquisa (fixtures reais)", () => {
  it("caso principal: R$ 750, curto + longo", async () => {
    const r = await runResearch(base, { connectors: fixtureConnectors(), now: FIXED_NOW });
    expect(r.status).toBe("completo");
    expect(r.input.capital).toBe(750);
    expect(r.horizons.map((h) => h.horizon)).toEqual(["curto", "longo"]);
    // Toda oportunidade tem fonte primária na trilha
    for (const o of r.opportunities) {
      const primary = o.sourceIds.map((id) => r.evidence.find((e) => e.id === id)).filter((s) => s && s.method !== "regra_catalogada");
      expect(primary.length).toBeGreaterThan(0);
    }
    // Curto prazo: cripto vetado; Tesouro Selic elegível
    const curto = r.horizons.find((h) => h.horizon === "curto")!;
    expect(curto.vetoedIds).toContain("cripto-btc");
    expect(curto.rankedIds.some((id) => id.startsWith("td-selic"))).toBe(true);
    expect(curto.insufficientBasis).toBe(false);
    // Nenhuma oportunidade elegível com mínimo acima do capital
    for (const h of r.horizons) for (const id of h.rankedIds) expect(r.opportunities.find((o) => o.id === id)!.viableWithCapital).not.toBe(false);
    // Auditoria aprova consistências
    expect(r.audit.checks.every((c) => c.ok)).toBe(true);
    // Avisos de renda passiva e de compliance
    expect(r.globalWarnings.join(" ")).toMatch(/não é necessariamente renda mensal/);
    expect(r.mode.regulatedAdvice).toBe(false);
  });

  it("capital pequeno torna Tesouro Selic inviável e o veta", async () => {
    const r = await runResearch({ ...base, capital: 100 }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const selic = r.opportunities.find((o) => o.category === "tesouro_selic")!;
    expect(selic.viableWithCapital).toBe(false);
    expect(selic.byHorizon.curto!.vetoes.join(" ")).toMatch(/Mínimo de aplicação acima/);
  });

  it("todas as fontes fora do ar → indisponível e 'sem base suficiente', sem números", async () => {
    const r = await runResearch(base, { connectors: fixtureConnectors({ bcb: true, kraken: true, tesouro: true, cvm: true }), now: FIXED_NOW });
    expect(r.status).toBe("indisponivel");
    expect(r.opportunities).toHaveLength(0);
    expect(r.macro).toHaveLength(0);
    expect(r.horizons.every((h) => h.insufficientBasis)).toBe(true);
  });

  it("falha parcial (Tesouro) → relatório parcial com motivo", async () => {
    const r = await runResearch(base, { connectors: fixtureConnectors({ tesouro: true }), now: FIXED_NOW });
    expect(r.status).toBe("parcial");
    expect(r.providerRuns.find((p) => p.provider === "tesouro_transparente")!.status).toBe("falhou");
    expect(r.opportunities.some((o) => o.category.startsWith("tesouro"))).toBe(false);
    expect(r.unavailableClasses.some((u) => u.className === "Tesouro Direto")).toBe(true);
  });

  it("sem reserva de emergência: cripto vetado em todos os horizontes", async () => {
    const r = await runResearch({ ...base, hasEmergencyReserve: "nao", maxTolerableLossPct: 90 }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    for (const h of r.horizons) expect(h.vetoedIds).toContain("cripto-btc");
  });

  it("perfil tolerante e longo prazo: cripto pode ser elegível, sem retorno projetado", async () => {
    const r = await runResearch({ ...base, horizons: ["longo"], maxTolerableLossPct: 90, lossReaction: "aportaria_mais" }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const btc = r.opportunities.find((o) => o.id === "cripto-btc")!;
    expect(btc.byHorizon.longo!.eligible).toBe(true);
    expect(btc.byHorizon.longo!.scenario).toBeNull();
    expect(btc.byHorizon.longo!.scores.find((s) => s.dimension === "retorno")!.weight).toBe(0);
    expect(btc.taxes).toMatch(/NÃO calculada/);
  });

  it("oferta manual é marcada e não verificada", async () => {
    const r = await runResearch({ ...base, manualOffers: [{ name: "CDB Liquidez", institution: "Banco X", rateDescription: "102% do CDI", pctOfCdi: 102, minimum: 1, liquidity: "diária" }] }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const m = r.opportunities.find((o) => o.category === "oferta_manual")!;
    expect(m.dataStatus).toBe("manual");
    expect(m.rateOrPrice.verified).toBe(false);
    expect(r.evidence.find((e) => e.method === "entrada_manual")).toBeTruthy();
  });

  it("pós-fixado no longo prazo é penalizado por depender de taxa hipotética constante", async () => {
    const r = await runResearch(base, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const selic = r.opportunities.find((o) => o.category === "tesouro_selic")!;
    expect(selic.byHorizon.longo!.scores.find((s) => s.dimension === "retorno")!.justification).toMatch(/hipótese muito incerta/);
    expect(selic.byHorizon.curto!.scores.find((s) => s.dimension === "retorno")!.justification).not.toMatch(/hipótese muito incerta/);
  });

  it("pontos de equilíbrio usam IR de 365 dias (17,5%)", async () => {
    const r = await runResearch(base, { connectors: fixtureConnectors(), now: FIXED_NOW });
    expect(r.breakEven.some((b) => b.basis.includes("17.5%"))).toBe(true);
  });

  it("pesos editáveis são normalizados", async () => {
    const r = await runResearch({ ...base, weights: { curto: { risco: 1, liquidez: 1 } } }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const w = r.horizons.find((h) => h.horizon === "curto")!.weights;
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("exporta CSV protegido contra injeção de fórmula", async () => {
    const r = await runResearch({ ...base, manualOffers: [{ name: "=HYPERLINK(1)", institution: "Banco", rateDescription: "x" }] }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const csv = reportToCsv(r);
    expect(csv).toContain("\"'=HYPERLINK(1)\"");
    expect(csv.split("\r\n").length).toBe(r.opportunities.length + 1);
  });
});

describe("perfil, aportes e projeções por produto", () => {
  it("não imputa perfil nem tolerância a perdas", async () => {
    const r = await runResearch({ capital: 750, horizonMonths: [12] }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    expect(r.input.maxTolerableLossPct).toBeNull();
    expect(r.input.riskProfile).toBe("sem_perfil");
    expect(r.orchestrator.profile.label).toBe("Sem perfil definido");
    expect(r.orchestrator.profile.rationale.join(" ")).toMatch(/Tolerância a perdas não informada/);
    expect(r.orchestrator.profile.rationale.join(" ")).not.toMatch(/Tolera perder até 10%/);
    const btc = r.opportunities.find((o) => o.id === "cripto-btc")!;
    expect(btc.byHorizon.curto!.vetoes.join(" ")).toMatch(/Tolerância a perdas não informada/);
  });

  it("prazos em meses viram horizontes e geram projeções com aportes", async () => {
    const r = await runResearch({ capital: 750, monthlyContribution: 250, horizonMonths: [3, 12, 60, 120] }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    expect(r.horizonMonths).toEqual([3, 12, 60, 120]);
    expect(r.horizons.map((h) => h.horizon).sort()).toEqual(["curto", "longo", "medio"]);
    const selic = r.opportunities.find((o) => o.category === "tesouro_selic")!;
    const p12 = selic.projections.find((p) => p.months === 12)!;
    expect(p12.state).toBe("ESTIMATIVA_CENARIO");
    expect(p12.totalInvested).toBe(750 + 250 * 12);
    expect(p12.taxStatus).toBe("calculado");
    expect(p12.netBalance!).toBeLessThan(p12.finalBalance!);
    expect(selic.whereToCheck.length).toBeGreaterThan(0);
  });

  it("título prefixado antes do vencimento não recebe projeção inventada", async () => {
    const r = await runResearch({ capital: 750, horizonMonths: [3] }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const pre = r.opportunities.find((o) => o.id === "td-pre-2032")!;
    const p = pre.projections[0];
    expect(p.state).toBe("INDISPONIVEL");
    expect(p.finalBalance).toBeNull();
    expect(p.note).toMatch(/preço de mercado/);
  });

  it("capital zero com aporte é aceito; viabilidade usa o primeiro aporte", async () => {
    const r = await runResearch({ capital: 0, monthlyContribution: 100, horizonMonths: [12] }, { connectors: fixtureConnectors(), now: FIXED_NOW });
    const selic = r.opportunities.find((o) => o.category === "tesouro_selic")!;
    expect(selic.viableWithCapital).toBe(false); // mínimo ~R$ 202 > R$ 100
    const pre = r.opportunities.find((o) => o.category === "tesouro_prefixado")!;
    expect(pre.viableWithCapital).toBe(true);
  });

  it("rejeita capital e aporte zerados", () => {
    expect(ResearchInputSchema.safeParse({ capital: 0, horizons: ["curto"] }).success).toBe(false);
  });
});

describe("entrada e compliance", () => {
  it("valida entrada", () => {
    expect(ResearchInputSchema.safeParse({ capital: "abc", horizons: ["curto"] }).success).toBe(false);
    expect(ResearchInputSchema.safeParse({ capital: "R$ 750", horizons: [] }).success).toBe(false);
    expect(ResearchInputSchema.safeParse({ capital: -5, horizons: ["curto"] }).success).toBe(false);
    expect(ResearchInputSchema.parse({ capital: "R$ 20.000", horizons: ["medio"] }).capital).toBe(20000);
  });
  it("modo regulado permanece bloqueado mesmo se solicitado", () => {
    const c = complianceMode({ REGULATED_ADVICE_ENABLED: "true" });
    expect(c.regulatedAdviceEnabled).toBe(false);
    expect(c.requested).toBe(true);
    expect(c.notice).toMatch(/bloqueado/);
  });
});
