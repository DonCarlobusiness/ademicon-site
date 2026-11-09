/**
 * Evidência de consultas reais: executa o pipeline completo contra as fontes ao vivo
 * com o caso de uso principal (R$ 750, curto + longo prazo, renda passiva) e imprime
 * um resumo com URLs, horários de referência e status de cada provedor.
 * Uso: npm run evidence
 */
import { runResearch } from "../src/lib/analysis/research";
import { saveReport } from "../src/lib/store";

async function main() {
  const t0 = Date.now();
  const r = await runResearch({
    capital: "R$ 750,00",
    horizons: ["curto", "longo"],
    objective: "renda_passiva",
    hasEmergencyReserve: "sim",
    liquidityNeed: "nao_preve",
    lossReaction: "nao_sei",
    maxTolerableLossPct: 10,
  });
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
  console.log("\n-- Auditoria --");
  for (const c of r.audit.checks) console.log(`${c.ok ? "OK  " : "FAIL"} ${c.name}: ${c.detail}`);
  console.log("\n-- Fontes (trilha de evidências) --");
  for (const s of r.evidence.filter((e) => e.method !== "regra_catalogada")) console.log(`${s.freshness.padEnd(13)} ref=${s.referenceAt ?? "—"} coleta=${s.collectedAt} ${s.url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
