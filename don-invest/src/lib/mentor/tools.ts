/**
 * Ferramentas do mentor: o LLM não calcula — chama estas funções determinísticas e testadas.
 */
import { z } from "zod";
import { project, formatMonths } from "../finance/projection";
import type { ResearchReport } from "../analysis/types";

export const ProjectInput = z.object({
  capital_inicial: z.number().min(0).max(1e10),
  aporte_mensal: z.number().min(0).max(1e9),
  taxa_anual_pct: z.number().gt(-100).max(500),
  meses: z.number().int().min(1).max(600),
  inflacao_anual_pct: z.number().gt(-100).max(100).nullable(),
  regra_tributaria: z.enum(["nao_calcular", "renda_fixa_regressiva", "isento"]),
});

export const FiltersInput = z.object({
  capital_inicial: z.number().min(0).max(1e10).nullable(),
  aporte_mensal: z.number().min(0).max(1e9).nullable(),
  prazos_meses: z.array(z.number().int().min(1).max(600)).max(9),
  objetivo: z.enum(["renda_passiva", "crescimento", "preservacao", "imovel", "aposentadoria", "liberdade_financeira", "nao_informado"]),
  liquidez: z.enum(["imediata", "ate_30d", "nao_preve", "nao_informado"]),
});

export const TOOL_DEFS = [
  {
    name: "projetar_investimento",
    description:
      "Calcula, com a função testada do DON INVEST, o patrimônio projetado com capital inicial, aporte mensal no fim de cada mês, taxa anual HIPOTÉTICA e prazo em meses. Use sempre que precisar de qualquer valor futuro; nunca calcule de cabeça.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        capital_inicial: { type: "number", description: "Capital inicial em reais (>= 0)" },
        aporte_mensal: { type: "number", description: "Aporte mensal em reais (>= 0)" },
        taxa_anual_pct: { type: "number", description: "Taxa anual hipotética em %, ex.: 10 para 10% a.a." },
        meses: { type: "integer", description: "Prazo em meses (1 a 600)" },
        inflacao_anual_pct: { type: ["number", "null"], description: "Inflação anual hipotética em %, ou null" },
        regra_tributaria: { type: "string", enum: ["nao_calcular", "renda_fixa_regressiva", "isento"] },
      },
      required: ["capital_inicial", "aporte_mensal", "taxa_anual_pct", "meses", "inflacao_anual_pct", "regra_tributaria"],
    },
  },
  {
    name: "consultar_pesquisa",
    description:
      "Retorna os dados estruturados e auditados da pesquisa de mercado mais recente (indicadores do Banco Central, títulos do Tesouro, cripto, projeções por produto, fontes com URL e data, classes indisponíveis). Use para qualquer pergunta sobre taxas, preços, produtos ou fontes.",
    strict: true,
    input_schema: { type: "object" as const, additionalProperties: false, properties: {}, required: [] },
  },
  {
    name: "sugerir_filtros",
    description:
      "Traduz a pergunta do usuário em parâmetros do simulador/pesquisa (capital, aporte, prazos, objetivo, liquidez). Use quando o usuário descrever uma situação; os parâmetros são exibidos para ele confirmar.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        capital_inicial: { type: ["number", "null"] },
        aporte_mensal: { type: ["number", "null"] },
        prazos_meses: { type: "array", items: { type: "integer" } },
        objetivo: { type: "string", enum: ["renda_passiva", "crescimento", "preservacao", "imovel", "aposentadoria", "liberdade_financeira", "nao_informado"] },
        liquidez: { type: "string", enum: ["imediata", "ate_30d", "nao_preve", "nao_informado"] },
      },
      required: ["capital_inicial", "aporte_mensal", "prazos_meses", "objetivo", "liquidez"],
    },
  },
];

const r2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);

export function runProjectTool(raw: unknown) {
  const i = ProjectInput.parse(raw);
  const p = project({
    initial: i.capital_inicial,
    monthly: i.aporte_mensal,
    annualRate: i.taxa_anual_pct / 100,
    months: i.meses,
    inflationAnnual: i.inflacao_anual_pct === null ? null : i.inflacao_anual_pct / 100,
    tax: i.regra_tributaria,
  });
  return {
    tipo: "ESTIMATIVA_CENARIO",
    prazo: formatMonths(p.months),
    total_investido: r2(p.totalInvested),
    patrimonio_final_bruto: r2(p.finalBalance),
    lucro_bruto: r2(p.grossGain),
    lucro_bruto_pct: r2(p.grossGainPct * 100),
    impostos: p.tax.status === "nao_calculado" ? "não calculados" : r2((p.tax.ir ?? 0) + (p.tax.iof ?? 0)),
    patrimonio_liquido: r2(p.netBalance),
    poder_de_compra_hoje: r2(p.realNetBalance ?? p.realBalance),
    observacao: "Taxa hipotética informada; não é promessa de retorno.",
  };
}

/** Versão compacta do relatório para o contexto do LLM (somente dados auditados). */
export function compactReport(r: ResearchReport | null) {
  if (!r) return { disponivel: false, motivo: "Nenhuma pesquisa foi feita ainda. Peça ao usuário para clicar em 'Pesquisar oportunidades agora'." };
  const src = new Map(r.evidence.map((s) => [s.id, s]));
  return {
    disponivel: true,
    gerado_em_utc: r.createdAt,
    status: r.status,
    entrada: { capital: r.input.capital, aporte_mensal: r.input.monthlyContribution, prazos_meses: r.horizonMonths, perfil_declarado: r.input.riskProfile },
    indicadores_bcb: r.macro.map((m) => ({ indicador: m.label, valor: m.value, unidade: m.unit, referencia: m.referenceDate, fonte: src.get(m.sourceId)?.url })),
    hipoteses: r.assumptions.map((a) => ({ hipotese: a.label, valor: a.value, unidade: a.unit })),
    por_prazo: r.horizons.map((h) => ({
      prazo: h.title,
      sem_base_suficiente: h.insufficientBasis,
      opcoes: h.rankedIds.slice(0, 5).map((id) => {
        const o = r.opportunities.find((x) => x.id === id)!;
        return {
          nome: o.name,
          taxa_ou_preco_observado: o.rateOrPrice.display,
          referencia: o.observedAt,
          minimo: o.minimum.display,
          cabe_no_valor: o.viableWithCapital,
          liquidez: o.liquidity,
          impostos: o.taxes,
          protecao: o.protection,
          riscos: o.risks.slice(0, 3),
          fonte: o.rateOrPrice.sourceIds.map((sid) => src.get(sid)?.url).filter(Boolean),
          onde_verificar: (o.whereToCheck ?? []).map((w) => w.url),
          projecoes: (o.projections ?? []).map((p) => ({ meses: p.months, estado: p.state, patrimonio_bruto: r2(p.finalBalance), liquido: r2(p.netBalance), faixa: p.range, nota: p.note })),
        };
      }),
      vetadas: h.vetoedIds.map((id) => ({ nome: r.opportunities.find((x) => x.id === id)?.name, motivos: r.opportunities.find((x) => x.id === id)?.byHorizon[h.horizon]?.vetoes })),
    })),
    classes_indisponiveis: r.unavailableClasses.map((u) => ({ classe: u.className, motivo: u.reason })),
    conectores: r.providerRuns.map((p) => ({ fonte: p.label, status: p.status, erro: p.error })),
  };
}
