import { describe, expect, it } from "vitest";
import { checkAnswer, collectNumbers, extractNumbers } from "@/lib/mentor/guardrails";
import { askMentor, mentorConfigured, type MentorClient } from "@/lib/mentor/mentor";
import { runProjectTool } from "@/lib/mentor/tools";

describe("guardrails do mentor", () => {
  it("extrai valores em R$ e percentuais", () => {
    expect(extractNumbers("Você teria R$ 1.234,56 e 10,5% ao ano")).toEqual([1234.56, 10.5]);
  });
  it("aceita números rastreados e marca os inventados", () => {
    const allowed = collectNumbers({ total: 3685.1341, taxa: 13.65 });
    expect(checkAnswer("Seriam R$ 3.685,13 com CDI de 13,65%", allowed).ok).toBe(true);
    const bad = checkAnswer("Seriam R$ 9.999,00 com 20%", allowed);
    expect(bad.ok).toBe(false);
    expect(bad.untrackedNumbers).toEqual([9999, 20]);
  });
  it("bloqueia promessas e recomendação individualizada", () => {
    const r = checkAnswer("Este é o melhor investimento, com lucro garantido. Recomendo comprar.", new Set());
    expect(r.violations).toEqual(expect.arrayContaining(["promessa de lucro", "recomendação individualizada de compra", "ranking absoluto"]));
  });
});

describe("mentor com cliente simulado (sem rede)", () => {
  it("chama a função testada de projeção e passa na auditoria", async () => {
    const calls: unknown[] = [];
    const client: MentorClient = {
      beta: {
        messages: {
          create: async (params) => {
            calls.push(params);
            if (calls.length === 1) {
              return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "projetar_investimento", input: { capital_inicial: 500, aporte_mensal: 250, taxa_anual_pct: 10, meses: 12, inflacao_anual_pct: null, regra_tributaria: "nao_calcular" } }] } as never;
            }
            return { stop_reason: "end_turn", content: [{ type: "text", text: "Na hipótese de 10% a.a., o patrimônio bruto seria R$ 3.685,13 para R$ 3.500,00 investidos." }] } as never;
          },
        },
      },
    };
    const r = await askMentor("Tenho R$ 500 e aporto R$ 250 por 12 meses a 10%", null, client);
    expect(r.toolCalls).toEqual([{ name: "projetar_investimento", ok: true }]);
    expect(r.guardrail.ok).toBe(true);
    const first = calls[0] as { model: string; fallbacks: string; tools: { name: string }[] };
    expect(first.model).toBe("claude-opus-5-5");
    expect(first.fallbacks).toBe("default");
    expect(first.tools.map((t) => t.name)).toContain("consultar_pesquisa");
  });

  it("anexa aviso quando o modelo cita número sem fonte", async () => {
    const client: MentorClient = { beta: { messages: { create: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "Rende uns R$ 5.000,00 por ano." }] }) as never } } };
    const r = await askMentor("quanto rende?", null, client);
    expect(r.guardrail.ok).toBe(false);
    expect(r.answer).toMatch(/Auditoria automática/);
  });

  it("sem chave o mentor fica desativado", () => {
    expect(mentorConfigured({})).toBe(false);
    expect(mentorConfigured({ ANTHROPIC_API_KEY: "x" })).toBe(true);
  });

  it("ferramenta de projeção valida entrada", () => {
    expect(() => runProjectTool({ capital_inicial: -1, aporte_mensal: 0, taxa_anual_pct: 10, meses: 12, inflacao_anual_pct: null, regra_tributaria: "isento" })).toThrow();
    expect(runProjectTool({ capital_inicial: 100, aporte_mensal: 0, taxa_anual_pct: 0, meses: 12, inflacao_anual_pct: null, regra_tributaria: "nao_calcular" }).patrimonio_final_bruto).toBe(100);
  });
});
