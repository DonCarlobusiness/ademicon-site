import { z } from "zod";
import { parseBRL } from "../finance/costs";

const money = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = typeof v === "number" ? v : parseBRL(v);
  if (n === null || !Number.isFinite(n)) {
    ctx.addIssue({ code: "custom", message: "Valor monetário inválido" });
    return z.NEVER;
  }
  return n;
});

export const HorizonEnum = z.enum(["curto", "medio", "longo", "indefinido"]);
export type Horizon = z.infer<typeof HorizonEnum>;

export const ObjectiveEnum = z.enum(["renda_passiva", "crescimento", "preservacao", "compra_planejada", "imovel", "aposentadoria", "liberdade_financeira", "misto"]);

export const ManualOfferSchema = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().min(2).max(80),
  rateDescription: z.string().trim().min(1).max(60), // ex.: "102% do CDI"
  pctOfCdi: z.number().min(1).max(300).nullable().optional(),
  minimum: z.number().min(0).max(10_000_000).nullable().optional(),
  liquidity: z.string().trim().max(60).optional(),
  maturity: z.string().trim().max(20).optional(),
  taxExempt: z.boolean().optional(),
  url: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine((u) => !u || /^https:\/\/[^\s]+$/.test(u), "URL deve começar com https://"),
});
export type ManualOffer = z.infer<typeof ManualOfferSchema>;

export const WeightsSchema = z
  .object({
    risco: z.number().min(0).max(1),
    liquidez: z.number().min(0).max(1),
    custo: z.number().min(0).max(1),
    prazo: z.number().min(0).max(1),
    retorno: z.number().min(0).max(1),
    cambio: z.number().min(0).max(1),
    dados: z.number().min(0).max(1),
  })
  .partial();
export type WeightsOverride = z.infer<typeof WeightsSchema>;

export const RiskProfileEnum = z.enum(["sem_perfil", "conservador", "moderado", "arrojado"]);

export const ResearchInputSchema = z
  .object({
    capital: money.pipe(z.number().min(0, "Capital não pode ser negativo").max(100_000_000)),
    monthlyContribution: money.pipe(z.number().min(0).max(10_000_000)).optional().default(0),
    hasEmergencyReserve: z.enum(["sim", "nao", "parcial", "sem_resposta"]).default("sem_resposta"),
    objective: ObjectiveEnum.default("misto"),
    horizons: z.array(HorizonEnum).max(4).optional().default([]),
    /** Prazos específicos em meses (1–600). Convertidos em horizontes curto/médio/longo para a pontuação. */
    horizonMonths: z.array(z.number().int().min(1).max(600)).max(12).optional().default([]),
    liquidityNeed: z.enum(["imediata", "ate_30d", "em_ate_12m", "nao_preve"]).default("nao_preve"),
    taxResidence: z.enum(["brasil", "exterior"]).default("brasil"),
    experience: z.enum(["nao_informado", "nenhuma", "basica", "intermediaria", "avancada"]).default("nao_informado"),
    hasExpensiveDebt: z.boolean().default(false),
    /** Perfil DECLARADO pelo usuário; nunca inferido. */
    riskProfile: RiskProfileEnum.default("sem_perfil"),
    lossReaction: z.enum(["venderia_tudo", "esperaria", "aportaria_mais", "nao_sei"]).default("nao_sei"),
    /** Perda máxima tolerável declarada (%). Ausente = não respondido. */
    maxTolerableLossPct: z.number().min(0).max(100).nullable().optional().default(null),
    regionPreference: z.enum(["brasil", "internacional", "ambos"]).default("ambos"),
    currency: z.enum(["BRL", "USD"]).default("BRL"),
    institutions: z.array(z.string().trim().max(60)).max(10).optional().default([]),
    manualOffers: z.array(ManualOfferSchema).max(5).optional().default([]),
    weights: z.partialRecord(HorizonEnum, WeightsSchema).optional(),
    assumptions: z
      .object({
        ipcaAnnualPct: z.number().min(-5).max(50).optional(),
        selicAnnualPct: z.number().min(0).max(60).optional(),
      })
      .optional()
      .default({}),
    question: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.capital > 0 || v.monthlyContribution > 0, { message: "Informe capital inicial ou aporte mensal maior que zero", path: ["capital"] })
  .refine((v) => v.horizons.length > 0 || v.horizonMonths.length > 0, { message: "Escolha ao menos um prazo", path: ["horizons"] })
  .transform((v) => {
    const fromMonths = v.horizonMonths.map(monthsToHorizon);
    const horizons = [...new Set([...v.horizons, ...fromMonths])];
    return { ...v, horizons };
  });

export function monthsToHorizon(m: number): Horizon {
  return m <= 12 ? "curto" : m <= 60 ? "medio" : "longo";
}

/** Valor disponível para a primeira aplicação (capital ou, se zero, o primeiro aporte). */
export function firstInvestable(i: { capital: number; monthlyContribution: number }): number {
  return i.capital > 0 ? i.capital : i.monthlyContribution;
}

export type ResearchInput = z.infer<typeof ResearchInputSchema>;
export type ResearchInputRaw = z.input<typeof ResearchInputSchema>;

export const DEFAULT_HORIZON_MONTHS: Record<Horizon, number> = { curto: 12, medio: 36, longo: 120, indefinido: 24 };

export const HORIZON_LABEL: Record<Horizon, string> = {
  curto: "Curto prazo (até 12 meses)",
  medio: "Médio prazo (1–5 anos)",
  longo: "Longo prazo (mais de 5 anos)",
  indefinido: "Horizonte indefinido",
};

export const HORIZON_DAYS: Record<Horizon, number> = {
  curto: 365,
  medio: 3 * 365,
  longo: 10 * 365,
  indefinido: 2 * 365,
};
