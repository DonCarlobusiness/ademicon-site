/**
 * Testes de integração REAIS (rede). Executar: npm run test:integration
 * São pulados fora do modo "live" (npm test comum, CI sem rede). Funciona em Windows, macOS e Linux.
 */
import { describe, expect, it } from "vitest";
import { fetchBcbSeries } from "@/lib/market-data/bcb";
import { fetchKrakenAsset } from "@/lib/market-data/kraken";
import { fetchTesouro } from "@/lib/market-data/tesouro";
import { runResearch } from "@/lib/analysis/research";

const live = import.meta.env.MODE === "live" || process.env.RUN_LIVE ? describe : describe.skip;

live("integração real", () => {
  it("BCB/SGS: meta Selic e IPCA 12m", async () => {
    const selic = await fetchBcbSeries("selic_meta");
    const ipca = await fetchBcbSeries("ipca_12m");
    console.log(`[LIVE] Selic meta ${selic.latest.value}% ref ${selic.latest.date} ← ${selic.url}`);
    console.log(`[LIVE] IPCA 12m ${ipca.latest.value}% ref ${ipca.latest.date} ← ${ipca.url}`);
    expect(selic.latest.value).toBeGreaterThan(0);
    expect(new Date(selic.latest.date).getTime()).toBeLessThanOrEqual(Date.now());
    expect(selic.source.freshness).not.toBe("desatualizado");
  });
  it("Kraken: ticker público BTC/USD", async () => {
    const k = await fetchKrakenAsset("BTCUSD");
    console.log(`[LIVE] BTC/USD last ${k.ticker.last} bid ${k.ticker.bid} ask ${k.ticker.ask} ← ${k.sources[0].url} @ ${k.sources[0].collectedAt}`);
    expect(k.ticker.last).toBeGreaterThan(0);
    expect(k.consistencyIssues).toEqual([]);
  });
  it("Tesouro Transparente: CSV oficial", async () => {
    const t = await fetchTesouro();
    expect(t.status).toBe("ok");
    console.log(`[LIVE] Tesouro: ${t.data!.bonds.length} títulos, data-base ${t.data!.baseDate}`);
    expect(t.data!.bonds.some((b) => b.kind === "selic")).toBe(true);
  }, 60_000);
  it("Pipeline completo: R$ 750 curto + longo", async () => {
    const r = await runResearch({ capital: "R$ 750,00", horizons: ["curto", "longo"], objective: "renda_passiva", hasEmergencyReserve: "sim" });
    console.log(`[LIVE] Relatório ${r.status}: ${r.providerRuns.map((p) => `${p.provider}=${p.status}`).join(", ")}`);
    expect(["completo", "parcial"]).toContain(r.status);
    expect(r.opportunities.length).toBeGreaterThan(0);
  }, 60_000);
});
