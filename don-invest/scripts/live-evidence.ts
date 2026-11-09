/**
 * Evidência de consultas reais: executa o pipeline completo contra as fontes ao vivo
 * com o caso de uso principal (R$ 750, curto + longo prazo, renda passiva) e imprime
 * um resumo com URLs, horários de referência e status de cada provedor.
 * Uso: npm run evidence
 */
import { runResearch } from "../src/lib/analysis/research";
import { saveReport } from "../src/lib/store";
import { mkdirSync, writeFileSync } from "node:fs";

async function main() {
  const t0 = Date.now();
  const request = {
    capital: "R$ 750,00",
    monthlyContribution: 250,
    horizonMonths: [3, 12, 60, 120],
    objective: "renda_passiva" as const,
    hasEmergencyReserve: "sim" as const,
    liquidityNeed: "nao_preve" as const,
  };
  const r = await runResearch(request);
  // Amostra sanitizada: sem credenciais, sem cabeçalhos, sem dados pessoais (não há nenhum no MVP)
  mkdirSync("docs/evidence", { recursive: true });
  const sample = {
    nota: "Amostra gerada por `npm run evidence` contra as fontes reais. Sem credenciais: as fontes usadas são públicas.",
    request_POST_api_research: request,
    response: {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      providerRuns: r.providerRuns,
      macro: r.macro,
      horizonMonths: r.horizonMonths,
      porPrazo: r.horizons.map((h) => ({
        prazo: h.title,
        ranqueadas: h.rankedIds.slice(0, 5).map((id) => {
          const o = r.opportunities.find((x) => x.id === id)!;
          return { nome: o.name, taxa: o.rateOrPrice.display, ref: o.observedAt, minimo: o.minimum.value, projecoes: o.projections };
        }),
        vetadas: h.vetoedIds,
      })),
      fontes: r.evidence.filter((e) => e.method !== "regra_catalogada").map((e) => ({ url: e.url, coleta: e.collectedAt, referencia: e.referenceAt, frescor: e.freshness })),
      auditoria: r.audit.checks,
    },
  };
  writeFileSync("docs/evidence/research-sample.json", JSON.stringify(sample, null, 2));
  await saveReport(r);
  console.log(`\n=== DON INVEST — evidência de pesquisa real (${((Date.now() - t0) / 1000).toFixed(1)} s) ===`);
  console.log(`Relatório: ${r.id}  status=${r.status}  criado=${r.createdAt}`);
  console.log("\n-- Provedores --");
  for (const p of r.providerRuns) console.log(`${p.status.padEnd(15)} ${p.label.padEnd(42)} ${String(p.durationMs).padStart(6)} ms${p.fromCache ? " (cache)" : ""}${p.error ? "  ERRO: " + p.error : ""}`);
  console.log("\n-- Macro (BCB) --");
  for (const m of r.macro) console.log(`${m.label.padEnd(58)} ${String(m.value).padStart(10)} ${m.unit.padEnd(20)} ref ${m.referenceDate.slice(0, 10)}`);
  console.log("\n-- Oportunidades --");
  for (const o of r.opportunities) {
    const h = Object.values(o.byHorizon).map((a) => `${a!.horizon}:${a!.total ?? "veto"}`).join(" ");
    console.log(`${o.name.padEnd(48)} ${o.dataStatus.padEnd(11)} min=${String(o.minimum.value?.toFixed?.(2) ?? "—").padEnd(9)} viável=${String(o.viableWithCapital).padEnd(5)} ${h}`);
    console.log(`    ${o.rateOrPrice.display}`);
  }
  console.log("\n-- Conclusões --");
  for (const h of r.horizons) console.log(`[${h.title}] ${h.conclusion}`);
  console.log("\n-- Projeções com R$ 750 + R$ 250/mês --");
  for (const o of r.opportunities) {
    console.log(`${o.name.padEnd(48)} ${o.projections.map((p) => `${p.months}m=${p.finalBalance !== null ? p.finalBalance.toFixed(2) + (p.netBalance !== null ? "/liq " + p.netBalance.toFixed(2) : "") : p.range ? `faixa ${p.range.pessimista.toFixed(0)}-${p.range.otimista.toFixed(0)}` : "indisp."}`).join("  ")}`);
  }
  console.log("\nAmostra sanitizada salva em docs/evidence/research-sample.json");
  console.log("\n-- Auditoria --");
  for (const c of r.audit.checks) console.log(`${c.ok ? "OK  " : "FAIL"} ${c.name}: ${c.detail}`);
  console.log("\n-- Fontes (trilha de evidências) --");
  for (const s of r.evidence.filter((e) => e.method !== "regra_catalogada")) console.log(`${s.freshness.padEnd(13)} ref=${s.referenceAt ?? "—"} coleta=${s.collectedAt} ${s.url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
