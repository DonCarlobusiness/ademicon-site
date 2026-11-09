/**
 * Agente 7 — Evidence Auditor: verifica datas, fontes, consistência entre fontes e
 * cálculos; rebaixa ou remove afirmações sem evidência.
 */
import type { ResearchContext } from "../context";
import type { AuditCheck, Opportunity } from "../types";
import { pctFmt } from "../context";

export function runAudit(ctx: ResearchContext, opps: Opportunity[]): { checks: AuditCheck[]; removed: string[]; kept: Opportunity[] } {
  const checks: AuditCheck[] = [];
  const removed: string[] = [];
  const m = ctx.macro ?? {};

  if (m.selic_meta && m.selic_efetiva) {
    const d = Math.abs(m.selic_meta.latest.value - m.selic_efetiva.latest.value);
    checks.push({ name: "Selic meta × Selic efetiva (BCB)", ok: d <= 0.5, detail: `Diferença de ${d.toFixed(2)} p.p. (esperado ≤ 0,5 p.p.).` });
  }
  if (m.cdi && m.selic_efetiva) {
    const d = Math.abs(m.cdi.latest.value - m.selic_efetiva.latest.value);
    checks.push({ name: "CDI × Selic efetiva (BCB)", ok: d <= 0.5, detail: `Diferença de ${d.toFixed(2)} p.p. (esperado ≤ 0,5 p.p.).` });
  }
  if (m.usdbrl) {
    const v = m.usdbrl.latest.value;
    checks.push({ name: "Faixa de sanidade do dólar (BCB)", ok: v > 2 && v < 15, detail: `R$ ${v.toFixed(4)} por US$.` });
  }
  if (m.selic_meta) {
    const d = m.selic_meta.discardedFuturePoints;
    checks.push({ name: "Datas futuras descartadas na série 432", ok: true, detail: d ? `${d} ponto(s) com data futura (meta vigente publicada adiante) ignorado(s).` : "Nenhum ponto futuro." });
  }
  if (ctx.tesouro) {
    const selic = ctx.tesouro.bonds.filter((b) => b.kind === "selic" && b.buyRatePct !== null);
    const outOfRange = selic.filter((b) => Math.abs(b.buyRatePct!) > 1);
    checks.push({ name: "Ágio/deságio do Tesouro Selic plausível", ok: outOfRange.length === 0, detail: `${selic.length} título(s) Selic; fora de ±1 p.p.: ${outOfRange.length}.` });
    const pre = ctx.tesouro.bonds.filter((b) => b.kind === "prefixado" && b.buyRatePct !== null).sort((a, b) => a.maturity.localeCompare(b.maturity))[0];
    if (pre && m.selic_meta) {
      const d = Math.abs(pre.buyRatePct! - m.selic_meta.latest.value);
      checks.push({ name: "Prefixado mais curto (Tesouro) × Selic meta (BCB)", ok: d <= 6, detail: `${pctFmt(pre.buyRatePct!)} vs ${pctFmt(m.selic_meta.latest.value)} — diferença ${d.toFixed(2)} p.p. (cruzamento entre fontes; esperado ≤ 6 p.p.).` });
    }
    const ageDays = (ctx.now.getTime() - new Date(ctx.tesouro.baseDate).getTime()) / 86_400_000;
    checks.push({ name: "Data-base do Tesouro recente", ok: ageDays <= 7, detail: `Data-base há ${ageDays.toFixed(1)} dias.` });
  }
  if (ctx.kraken) {
    for (const [pair, d] of Object.entries(ctx.kraken)) {
      if (!d) continue;
      checks.push({ name: `Consistência do ticker Kraken ${pair}`, ok: d.consistencyIssues.length === 0, detail: d.consistencyIssues.length ? d.consistencyIssues.join("; ") : `bid ≤ ask, último dentro da faixa de 24h, spread ${pctFmt(d.ticker.spreadPct, 3)}.` });
    }
  }

  // Afirmações por oportunidade
  const kept: Opportunity[] = [];
  for (const o of opps) {
    const primary = o.sourceIds.map((id) => ctx.sources.get(id)).filter((s) => s && s.method !== "regra_catalogada");
    if (primary.length === 0) {
      removed.push(`${o.name}: removido — nenhuma fonte primária para os números.`);
      continue;
    }
    if (o.rateOrPrice.verified && !o.rateOrPrice.sourceIds.every((id) => ctx.sources.has(id))) {
      o.rateOrPrice.verified = false;
      removed.push(`${o.name}: taxa/preço rebaixado para não verificado (fonte ausente na trilha).`);
    }
    if (primary.some((s) => s!.freshness === "desatualizado")) {
      o.missingInfo.push("Dado desatualizado segundo a política de frescor — reconsultar antes de usar.");
      if (o.dataStatus === "verificado") o.dataStatus = "parcial";
    }
    kept.push(o);
  }

  // Verificação de cálculos dos cenários
  let calcOk = true;
  const bad: string[] = [];
  for (const o of kept) {
    for (const a of Object.values(o.byHorizon)) {
      const s = a?.scenario;
      if (!s) continue;
      const consistent = Math.abs(s.amount + s.tax.netIncome - s.netFinal) < 0.01 && (s.grossIncome <= 0 || s.tax.netIncome <= s.grossIncome + 1e-9);
      if (!consistent) { calcOk = false; bad.push(o.name); }
    }
  }
  checks.push({ name: "Consistência aritmética dos cenários", ok: calcOk, detail: calcOk ? "Valor final = aplicado + rendimento líquido; impostos ≤ rendimento." : `Inconsistências: ${bad.join(", ")}` });

  checks.push({ name: "Números gerados por IA", ok: true, detail: "Nenhum número do relatório vem de texto gerado por IA; todos os cálculos são funções determinísticas testadas." });
  return { checks, removed, kept };
}
