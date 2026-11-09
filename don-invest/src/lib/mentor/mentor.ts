/**
 * Mentor IA (opcional, server-side). Ativo somente com ANTHROPIC_API_KEY no servidor.
 * Orquestração econômica: UMA conversa com ferramentas determinísticas (não sete chamadas).
 * O modelo não calcula nem inventa números: usa as ferramentas; a resposta passa por guardrails.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ResearchReport } from "../analysis/types";
import { TOOL_DEFS, runProjectTool, compactReport, FiltersInput } from "./tools";
import { checkAnswer, collectNumbers, type GuardrailReport } from "./guardrails";

export const MENTOR_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 4;

export const SYSTEM_PROMPT = `Você é o Mentor do DON INVEST, uma ferramenta brasileira de pesquisa, educação e simulação de investimentos. Responda em português do Brasil, de forma clara e direta.

Papel e limites:
- Você não é consultor de valores mobiliários registrado na CVM e não faz recomendação individualizada. Compare alternativas, explique trade-offs (risco, liquidez, prazo, custos, impostos) e diga o que o usuário deve verificar.
- Nunca prometa rentabilidade, nunca diga "recomendo comprar" nem aponte um "melhor investimento". Rentabilidade passada não garante futura.
- Nenhuma ordem é executada; não peça senhas, CPF ou dados bancários.

Números:
- Todo número da sua resposta deve vir de uma ferramenta: "consultar_pesquisa" para taxas, preços, datas e fontes; "projetar_investimento" para qualquer valor futuro. Não faça contas de cabeça.
- Se um dado não existe nas ferramentas (por exemplo, cotação de ações ou ofertas de CDB), diga que não está disponível e como obtê-lo; não estime.
- Diferencie sempre: dado observado (com data e fonte), estimativa de cenário (hipótese) e informação que falta.
- Renda passiva não é necessariamente mensal; ganho acumulado não é renda paga.

Quando o usuário descrever a própria situação, use "sugerir_filtros" para propor parâmetros que ele possa confirmar no simulador.`;

export interface MentorResult {
  answer: string;
  filters: unknown | null;
  toolCalls: { name: string; ok: boolean }[];
  guardrail: GuardrailReport;
  model: string;
}

/** Interface mínima do cliente (permite testar sem rede). */
export interface MentorClient {
  beta: { messages: { create: (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => Promise<Anthropic.Beta.BetaMessage> } };
}

export function mentorConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export async function askMentor(question: string, report: ResearchReport | null, client?: MentorClient): Promise<MentorResult> {
  const c: MentorClient = client ?? (new Anthropic() as unknown as MentorClient);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: question }];
  const allowed = new Set<number>();
  const toolCalls: MentorResult["toolCalls"] = [];
  let filters: unknown | null = null;
  let answer = "";

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await c.beta.messages.create({
      model: MENTOR_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFS as unknown as Anthropic.Beta.BetaTool[],
      messages,
    });

    if (response.stop_reason === "refusal") {
      answer = "Não posso responder a essa pergunta. Reformule em termos de comparação, educação ou simulação.";
      break;
    }
    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0 || round === MAX_TOOL_ROUNDS) {
      answer = text || "Sem resposta.";
      break;
    }

    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const t of toolUses) {
      try {
        let out: unknown;
        if (t.name === "projetar_investimento") out = runProjectTool(t.input);
        else if (t.name === "consultar_pesquisa") out = compactReport(report);
        else if (t.name === "sugerir_filtros") out = filters = FiltersInput.parse(t.input);
        else throw new Error(`Ferramenta desconhecida: ${t.name}`);
        collectNumbers(out, allowed);
        toolCalls.push({ name: t.name, ok: true });
        results.push({ type: "tool_result", tool_use_id: t.id, content: JSON.stringify(out) });
      } catch (e) {
        toolCalls.push({ name: t.name, ok: false });
        results.push({ type: "tool_result", tool_use_id: t.id, content: `Erro: ${e instanceof Error ? e.message : String(e)}`, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }

  collectNumbers(question, allowed); // números que o próprio usuário escreveu
  const guardrail = checkAnswer(answer, allowed);
  if (!guardrail.ok) {
    const parts: string[] = [];
    if (guardrail.untrackedNumbers.length) parts.push(`contém número(s) não rastreados pelas ferramentas (${guardrail.untrackedNumbers.join(", ")}) — trate-os como não verificados`);
    if (guardrail.violations.length) parts.push(`contém linguagem bloqueada (${guardrail.violations.join(", ")})`);
    answer += `\n\n⚠ Auditoria automática: esta resposta ${parts.join("; ")}.`;
  }
  return { answer, filters, toolCalls, guardrail, model: MENTOR_MODEL };
}
