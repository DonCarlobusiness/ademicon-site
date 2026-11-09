/**
 * Regras documentadas (não consultadas ao vivo). Cada uma tem URL oficial e
 * data de catalogação; a UI as identifica como "regra catalogada — conferir".
 */
import type { SourceRecord } from "../market-data/types";

export const CATALOG_DATE = "2026-11-09T12:00:00.000Z";

export interface CatalogRule {
  id: string;
  label: string;
  url: string;
  text: string;
}

export const RULES = {
  tesouroMinimo: {
    id: "regra-td-minimo",
    label: "Tesouro Direto — aplicação mínima (1% do título, mínimo R$ 30)",
    url: "https://www.tesourodireto.com.br/",
    text: "Compra mínima de 1% do valor do título, respeitado o mínimo de R$ 30,00.",
  },
  tesouroCustodia: {
    id: "regra-td-custodia",
    label: "Tesouro Direto — taxa de custódia B3 (0,20% a.a.; Tesouro Selic isento até R$ 10 mil)",
    url: "https://www.tesourodireto.com.br/",
    text: "Taxa de custódia da B3 de 0,20% a.a. sobre o valor dos títulos; isenção para Tesouro Selic até R$ 10.000 por investidor.",
  },
  tesouroLiquidez: {
    id: "regra-td-liquidez",
    label: "Tesouro Direto — recompra diária pelo Tesouro a preço de mercado",
    url: "https://www.tesourodireto.com.br/",
    text: "O Tesouro recompra os títulos diariamente; antes do vencimento, o valor recebido é o preço de mercado do dia (marcação a mercado).",
  },
  irRegressivo: {
    id: "regra-ir-regressivo",
    label: "IR regressivo de renda fixa (Lei 11.033/2004)",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11.033.htm",
    text: "22,5% até 180 dias; 20% de 181 a 360; 17,5% de 361 a 720; 15% acima de 720 dias.",
  },
  iof: {
    id: "regra-iof",
    label: "IOF regressivo sobre rendimentos com resgate < 30 dias (Decreto 6.306/2007)",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm",
    text: "Alíquota de 96% no 1º dia decrescendo até 0% a partir do 30º dia, sobre o rendimento.",
  },
  fgc: {
    id: "regra-fgc",
    label: "FGC — garantia de até R$ 250 mil por CPF por instituição (teto global R$ 1 milhão a cada 4 anos)",
    url: "https://www.fgc.org.br/",
    text: "Cobre depósitos de poupança, CDB, RDB, LCI, LCA, entre outros, nos limites vigentes. Não cobre Tesouro Direto (risco soberano) nem criptoativos.",
  },
  poupancaIsencao: {
    id: "regra-poupanca-isencao",
    label: "Poupança — isenção de IR para pessoa física",
    url: "https://www.bcb.gov.br/estabilidadefinanceira/poupanca",
    text: "Rendimentos da poupança de pessoa física são isentos de IR. Remuneração creditada na data de aniversário mensal.",
  },
} satisfies Record<string, CatalogRule>;

export function ruleSource(rule: CatalogRule): SourceRecord {
  return {
    id: rule.id,
    provider: "catalogo",
    label: rule.label,
    url: rule.url,
    method: "regra_catalogada",
    collectedAt: CATALOG_DATE,
    referenceAt: CATALOG_DATE,
    ageMinutes: null,
    freshness: "defasado",
    confidence: 0.7,
    note: "Regra catalogada a partir de documentação oficial; não foi conferida ao vivo nesta pesquisa. Confirme a vigência na fonte.",
  };
}
