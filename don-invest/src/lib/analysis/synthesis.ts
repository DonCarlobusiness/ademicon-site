/**
 * Síntese determinística (sem LLM): resumo executivo e conclusões por horizonte,
 * escritas a partir dos resultados estruturados já auditados.
 */
import type { Horizon } from "./input";
import { HORIZON_LABEL } from "./input";
import type { HorizonSection, Opportunity, ProviderRun, ResearchReport } from "./types";
import { brl, dateFmt, pctFmt } from "./context";

export const HORIZON_FOCUS: Record<Horizon, string> = {
  curto: "Prioridade: segurança, liquidez e preservação do principal. Mercado volátil não equivale a reserva de emergência.",
  medio: "Equilíbrio entre previsibilidade e retorno real; atenção ao casamento entre vencimento e prazo.",
  longo: "Diversificação e geração futura de renda, reconhecendo volatilidade de preço, câmbio e incerteza de distribuições.",
  indefinido: "Conclusões condicionadas: sem prazo definido, a liquidez e a tolerância a perdas determinam o que é adequado.",
};

export function horizonConclusion(sec: Omit<HorizonSection, "conclusion">, opps: Map<string, Opportunity>): string {
  if (sec.insufficientBasis) {
    return "Não há base suficiente para destacar uma opção neste horizonte com os dados obtidos. Isso é um resultado válido: veja as classes indisponíveis e como integrá-las.";
  }
  const top = sec.rankedIds.slice(0, 3).map((id) => opps.get(id)!).filter(Boolean);
  const parts = top.map((o) => `${o.name} (${o.byHorizon[sec.horizon]?.total ?? "—"}/100)`);
  const lead = top[0];
  const scen = lead?.byHorizon[sec.horizon]?.scenario;
  let s = `Maior aderência aos critérios e pesos informados: ${parts.join(", ")}.`;
  if (scen) {
    s += ` No cenário ilustrativo de ${lead.name} (${scen.label}), ${brl(scen.amount)} chegariam a ${brl(scen.netFinal)} líquidos (${pctFmt(scen.realNetAnnualized * 100)} a.a. real) — hipótese, não promessa.`;
  }
  if (sec.vetoedIds.length) s += ` ${sec.vetoedIds.length} opção(ões) vetada(s) pelo Risk Guardian neste horizonte (motivos na tabela).`;
  s += " Pontuação é de aderência ao perfil informado, não um ranking universal.";
  return s;
}

export function executiveSummary(r: Pick<ResearchReport, "createdAt" | "input" | "macro" | "horizons" | "opportunities" | "unavailableClasses" | "status">, runs: ProviderRun[], opps: Map<string, Opportunity>): { summary: string[]; uncertainties: string[] } {
  const summary: string[] = [];
  const ok = runs.filter((x) => x.status === "ok" || x.status === "parcial");
  summary.push(
    `Pesquisa executada em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }).format(new Date(r.createdAt))} (horário da Bahia). Fontes consultadas: ${ok.map((x) => `${x.label} (${x.status}${x.fromCache ? ", cache recente dentro do TTL" : ", ao vivo"})`).join("; ") || "nenhuma fonte respondeu"}.`,
  );
  const sel = r.macro.find((m) => m.key === "selic_meta");
  const ipca = r.macro.find((m) => m.key === "ipca_12m");
  if (sel && ipca) summary.push(`Contexto oficial: Selic meta ${pctFmt(sel.value)} a.a. (ref. ${dateFmt(sel.referenceDate)}), IPCA 12 meses ${pctFmt(ipca.value)} (ref. ${dateFmt(ipca.referenceDate)}).`);
  const verified = r.opportunities.filter((o) => o.dataStatus !== "manual");
  const viable = verified.filter((o) => o.viableWithCapital === true);
  summary.push(`Com ${brl(r.input.capital)}: ${viable.length} de ${verified.length} opções com dados obtidos têm mínimo de aplicação compatível com o capital.`);
  for (const h of r.horizons) {
    if (h.insufficientBasis) summary.push(`${HORIZON_LABEL[h.horizon]}: não há base suficiente para destacar uma opção.`);
    else {
      const names = h.rankedIds.slice(0, 2).map((id) => opps.get(id)?.name).filter(Boolean);
      summary.push(`${HORIZON_LABEL[h.horizon]}: merecem aprofundamento ${names.join(" e ")}.`);
    }
  }
  if (r.status !== "completo") summary.push("Pesquisa PARCIAL: uma ou mais fontes falharam — veja a trilha de evidências.");

  const uncertainties = [
    "Taxas do Tesouro são da data-base publicada, não do momento da compra.",
    "Taxas de agentes custodiantes, custos de câmbio e de exchanges não foram verificados.",
    "Cenários usam Selic/IPCA atuais mantidos constantes — hipóteses editáveis, não previsões.",
    ...r.unavailableClasses.filter((u) => u.className !== "Observação").map((u) => `${u.className}: não pesquisado(s) — ${u.reason}`),
  ];
  return { summary, uncertainties };
}
