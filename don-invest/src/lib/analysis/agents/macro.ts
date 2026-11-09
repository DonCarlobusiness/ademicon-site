/**
 * Agente 2 — Macro Intelligence.
 * Lê séries validadas do BCB e define as premissas (hipóteses editáveis) dos cenários.
 */
import type { ResearchContext } from "../context";
import type { MacroItem } from "../types";
import type { ScenarioAssumption } from "../../finance/scenarios";
import { monthlyToAnnual, realRate } from "../../finance/rates";
import { pctFmt } from "../context";

export function runMacro(ctx: ResearchContext): { items: MacroItem[]; notes: string[] } {
  const m = ctx.macro ?? {};
  const items: MacroItem[] = [];
  const notes: string[] = [];
  const push = (key: string, s: (typeof m)[keyof typeof m], label?: string) => {
    if (!s) return;
    items.push({ key, label: label ?? s.def.label, value: s.latest.value, unit: s.def.unit, referenceDate: s.latest.date, sourceId: s.source.id });
  };
  push("selic_meta", m.selic_meta);
  push("selic_efetiva", m.selic_efetiva);
  push("cdi", m.cdi);
  push("ipca_12m", m.ipca_12m);
  push("ipca_mensal", m.ipca_mensal);
  push("usdbrl", m.usdbrl);
  push("poupanca", m.poupanca, "Poupança — rentabilidade do último período mensal");

  const assumptions: ScenarioAssumption[] = [];
  const ov = ctx.input.assumptions ?? {};

  // Selic usada em cenários pós-fixados
  if (ov.selicAnnualPct !== undefined) {
    ctx.hyp.selic = ov.selicAnnualPct / 100;
    assumptions.push({ key: "selic", label: "Selic média no período (definida pelo usuário)", value: ov.selicAnnualPct, unit: "% a.a.", origin: "hipotese_editavel" });
  } else if (m.selic_efetiva) {
    ctx.hyp.selic = m.selic_efetiva.latest.value / 100;
    assumptions.push({ key: "selic", label: "Selic média no período = Selic efetiva atual mantida constante (hipótese)", value: m.selic_efetiva.latest.value, unit: "% a.a.", origin: "hipotese_editavel", sourceId: m.selic_efetiva.source.id });
  }
  if (m.cdi) {
    ctx.hyp.cdi = (ov.selicAnnualPct !== undefined ? ov.selicAnnualPct - ((m.selic_efetiva?.latest.value ?? m.cdi.latest.value) - m.cdi.latest.value) : m.cdi.latest.value) / 100;
    assumptions.push({ key: "cdi", label: "CDI médio no período (acompanha a hipótese da Selic)", value: ctx.hyp.cdi * 100, unit: "% a.a.", origin: "hipotese_editavel", sourceId: m.cdi.source.id });
  }
  if (ov.ipcaAnnualPct !== undefined) {
    ctx.hyp.ipca = ov.ipcaAnnualPct / 100;
    assumptions.push({ key: "ipca", label: "IPCA médio anual (definido pelo usuário)", value: ov.ipcaAnnualPct, unit: "% a.a.", origin: "hipotese_editavel" });
  } else if (m.ipca_12m) {
    ctx.hyp.ipca = m.ipca_12m.latest.value / 100;
    assumptions.push({ key: "ipca", label: "IPCA médio anual = IPCA acumulado em 12 meses mantido constante (hipótese)", value: m.ipca_12m.latest.value, unit: "% a.a.", origin: "hipotese_editavel", sourceId: m.ipca_12m.source.id });
  }
  if (m.usdbrl) ctx.hyp.usdbrl = m.usdbrl.latest.value;
  if (m.poupanca) {
    ctx.hyp.poupancaMonthly = m.poupanca.latest.value / 100;
    assumptions.push({ key: "poupanca", label: "Rendimento mensal da poupança mantido no último valor observado (hipótese)", value: m.poupanca.latest.value, unit: "% a.m.", origin: "hipotese_editavel", sourceId: m.poupanca.source.id });
  }
  ctx.assumptions.push(...assumptions);

  if (m.selic_meta && m.ipca_12m) {
    const real = realRate(m.selic_meta.latest.value / 100, m.ipca_12m.latest.value / 100) * 100;
    notes.push(
      `Juro real ex-post aproximado (Selic meta ÷ IPCA 12m): ${pctFmt(real)} a.a. — indicador descritivo, calculado a partir de dados oficiais; não é projeção.`,
    );
  }
  if (m.poupanca) {
    notes.push(`Poupança no último período: ${pctFmt(m.poupanca.latest.value, 4)} no mês (≈ ${pctFmt(monthlyToAnnual(m.poupanca.latest.value / 100) * 100)} a.a. se mantido).`);
  }
  if (!ctx.macro) notes.push("DADOS INDISPONÍVEIS: o Banco Central não respondeu; nenhum indicador macro foi exibido e cenários de renda fixa ficam sem base.");
  return { items, notes };
}
