/**
 * Agente 5 — Broker & Cost Analyst.
 * Somente campos verificados via API são marcados como "verificado_api"; regras
 * catalogadas e campos não verificados são identificados explicitamente.
 */
import type { ResearchContext } from "../context";
import type { Platform } from "../types";
import { RULES } from "../../catalog/rules";
import { pctFmt } from "../context";

export function runBrokerCost(ctx: ResearchContext): Platform[] {
  const out: Platform[] = [];
  out.push({
    id: "tesouro-direto",
    name: "Tesouro Direto (Tesouro Nacional + B3)",
    products: "Títulos públicos federais (Selic, Prefixado, IPCA+, Renda+, Educa+)",
    fees: { value: "Custódia B3 0,20% a.a. (Tesouro Selic isento até R$ 10 mil); taxa do agente varia por instituição", status: "regra_catalogada", sourceId: RULES.tesouroCustodia.id },
    fx: { value: "Não se aplica (BRL)", status: "regra_catalogada" },
    protection: { value: "Risco soberano; sem FGC", status: "regra_catalogada", sourceId: RULES.fgc.id },
    jurisdiction: { value: "Brasil", status: "regra_catalogada" },
    eligibility: { value: "CPF e conta em instituição habilitada como agente de custódia", status: "regra_catalogada" },
    officialUrl: "https://www.tesourodireto.com.br/",
    lastChecked: ctx.tesouro ? ctx.tesouro.source.collectedAt : null,
  });
  const anyKraken = ctx.kraken ? Object.values(ctx.kraken).find(Boolean) : undefined;
  const fee = anyKraken?.info?.takerFeePctBaseTier ?? null;
  out.push({
    id: "kraken",
    name: "Kraken (Payward)",
    products: "Criptoativos à vista (dados públicos de mercado consultados; nenhuma conta conectada)",
    fees: fee !== null
      ? { value: `Taxa taker nível base ${pctFmt(fee)} (API AssetPairs)`, status: "verificado_api", sourceId: anyKraken?.sources.find((s) => s.id.startsWith("kraken-pairs"))?.id }
      : { value: "não verificado (API pública não retornou tabela de taxas para o par)", status: "nao_verificado" },
    fx: { value: "Pares consultados são cotados em USD; custo de conversão BRL→USD não verificado", status: "nao_verificado" },
    protection: { value: "Sem FGC; risco de custódia na exchange", status: "regra_catalogada", sourceId: RULES.fgc.id },
    jurisdiction: { value: "não verificado", status: "nao_verificado" },
    eligibility: { value: "Elegibilidade de residentes no Brasil não verificada", status: "nao_verificado" },
    officialUrl: "https://www.kraken.com/",
    lastChecked: anyKraken ? anyKraken.sources[0].collectedAt : null,
  });
  out.push({
    id: "bancos",
    name: "Bancos e financeiras (poupança, CDB, RDB, LCI, LCA)",
    products: "Depósitos e títulos bancários",
    fees: { value: "não verificado (varia por instituição)", status: "nao_verificado" },
    fx: { value: "Não se aplica (BRL)", status: "regra_catalogada" },
    protection: { value: "FGC até R$ 250 mil por CPF por instituição (teto global R$ 1 milhão a cada 4 anos) para produtos cobertos", status: "regra_catalogada", sourceId: RULES.fgc.id },
    jurisdiction: { value: "Brasil (autorizadas pelo BCB)", status: "regra_catalogada" },
    eligibility: { value: "Ofertas variam por cliente e plataforma — não verificadas", status: "nao_verificado" },
    officialUrl: "https://www.fgc.org.br/",
    lastChecked: null,
  });
  for (const inst of ctx.input.institutions) {
    out.push({
      id: `usuario-${inst}`,
      name: `${inst} (informada por você)`,
      products: "não verificado",
      fees: { value: "não verificado", status: "nao_verificado" },
      fx: { value: "não verificado", status: "nao_verificado" },
      protection: { value: "não verificado", status: "nao_verificado" },
      jurisdiction: { value: "não verificado", status: "nao_verificado" },
      eligibility: { value: "Você informou ter conta", status: "nao_verificado" },
      officialUrl: "",
      lastChecked: null,
    });
  }
  return out;
}
