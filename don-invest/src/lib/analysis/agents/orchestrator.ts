/**
 * Agente 1 — DON Orchestrator: interpreta pedido e define escopo e perfil preliminar.
 * Determinístico (sem LLM).
 */
import type { ResearchInput } from "../input";
import { HORIZON_LABEL } from "../input";
import { brl } from "../context";

const OBJ: Record<ResearchInput["objective"], string> = {
  renda_passiva: "renda passiva",
  crescimento: "crescimento patrimonial",
  preservacao: "preservação de capital",
  compra_planejada: "compra planejada",
  misto: "objetivo misto",
};

export function preliminaryProfile(i: ResearchInput): { label: string; preliminary: true; rationale: string[] } {
  const r: string[] = [];
  let pts = 0;
  if (i.lossReaction === "venderia_tudo") { pts -= 2; r.push("Venderia tudo em uma queda forte"); }
  if (i.lossReaction === "esperaria") { pts += 1; r.push("Esperaria a recuperação em uma queda"); }
  if (i.lossReaction === "aportaria_mais") { pts += 2; r.push("Aportaria mais em uma queda"); }
  if (i.lossReaction === "nao_sei") r.push("Reação a quedas ainda desconhecida");
  if (i.maxTolerableLossPct <= 5) { pts -= 2; r.push(`Tolera perder no máximo ${i.maxTolerableLossPct}%`); }
  else if (i.maxTolerableLossPct <= 15) { r.push(`Tolera perder até ${i.maxTolerableLossPct}%`); }
  else { pts += 1; r.push(`Tolera perder até ${i.maxTolerableLossPct}%`); }
  if (i.experience === "nenhuma") { pts -= 1; r.push("Sem experiência prévia"); }
  if (i.experience === "avancada") pts += 1;
  if (i.hasEmergencyReserve !== "sim") { pts -= 1; r.push("Reserva de emergência não está completa"); }
  if (i.hasExpensiveDebt) { pts -= 2; r.push("Possui dívidas caras"); }
  const label = i.lossReaction === "nao_sei" && i.experience === "nenhuma" ? "Indefinido (dados insuficientes)" : pts <= -2 ? "Conservador" : pts <= 1 ? "Moderado" : "Arrojado";
  return { label, preliminary: true, rationale: r };
}

export function runOrchestrator(i: ResearchInput) {
  const scope = [
    "Indicadores macro oficiais (BCB/SGS)",
    "Títulos do Tesouro Direto (CSV oficial do Tesouro Transparente)",
    "Poupança (BCB/SGS)",
    "Criptoativos (Kraken — dados públicos de mercado)",
    "Ações, FIIs, ETFs e REITs: fora do escopo até haver provedor licenciado",
    i.manualOffers.length ? `${i.manualOffers.length} oferta(s) informada(s) manualmente` : "",
  ].filter(Boolean);
  const horizons = i.horizons.map((h) => HORIZON_LABEL[h]).join(" e ");
  const interpretedQuestion =
    i.question?.trim() ||
    `Tenho ${brl(i.capital)}${i.monthlyContribution ? ` e aportes de ${brl(i.monthlyContribution)}/mês` : ""}, objetivo de ${OBJ[i.objective]}; compare opções para ${horizons}.`;
  return { scope, interpretedQuestion, profile: preliminaryProfile(i) };
}
