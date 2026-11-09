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
  imovel: "compra de imóvel",
  aposentadoria: "aposentadoria",
  liberdade_financeira: "liberdade financeira",
  misto: "objetivo misto",
};

const PROFILE_LABEL: Record<ResearchInput["riskProfile"], string> = {
  sem_perfil: "Sem perfil definido",
  conservador: "Conservador (declarado por você)",
  moderado: "Moderado (declarado por você)",
  arrojado: "Arrojado (declarado por você)",
};

/**
 * Perfil: somente o que o usuário DECLAROU. Nada é inferido ou imputado.
 * Não é suitability; orientação individualizada exige processo próprio (CVM).
 */
export function preliminaryProfile(i: ResearchInput): { label: string; preliminary: true; rationale: string[] } {
  const r: string[] = [];
  if (i.lossReaction !== "nao_sei") {
    r.push({ venderia_tudo: "Declarou que venderia tudo em uma queda forte", esperaria: "Declarou que esperaria a recuperação", aportaria_mais: "Declarou que aportaria mais em uma queda" }[i.lossReaction]);
  }
  if (i.maxTolerableLossPct !== null && i.maxTolerableLossPct !== undefined) r.push(`Declarou tolerar perda de até ${i.maxTolerableLossPct}%`);
  else r.push("Tolerância a perdas não informada");
  if (i.experience !== "nao_informado") r.push(`Experiência declarada: ${i.experience}`);
  if (i.hasEmergencyReserve === "sim") r.push("Reserva de emergência separada");
  else if (i.hasEmergencyReserve === "sem_resposta") r.push("Reserva de emergência: sem resposta");
  else r.push("Reserva de emergência incompleta ou inexistente");
  if (i.hasExpensiveDebt) r.push("Possui dívidas caras");
  return { label: PROFILE_LABEL[i.riskProfile], preliminary: true, rationale: r };
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
