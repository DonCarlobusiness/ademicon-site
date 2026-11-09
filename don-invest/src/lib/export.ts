import type { ResearchReport } from "./analysis/types";

const esc = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  // Proteção contra injeção de fórmula em planilhas
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function reportToCsv(r: ResearchReport): string {
  const horizons = r.horizons.map((h) => h.horizon);
  const header = ["id", "nome", "classe", "emissor", "moeda", "minimo", "minimo_verificado", "taxa_ou_preco", "taxa_verificada", "benchmark", "liquidez", "vencimento", "impostos", "custos", "protecao", "viavel_com_capital", "status_dados", "data_referencia_utc", ...horizons.map((h) => `pontuacao_${h}`), ...horizons.map((h) => `vetos_${h}`), "fontes"];
  const src = new Map(r.evidence.map((s) => [s.id, s]));
  const rows = r.opportunities.map((o) => [
    o.id, o.name, o.classLabel, o.issuer, o.currency, o.minimum.value ?? "", o.minimum.verified, o.rateOrPrice.display, o.rateOrPrice.verified, o.benchmark, o.liquidity, o.maturity ?? "", o.taxes, o.costs, o.protection, o.viableWithCapital ?? "", o.dataStatus, o.observedAt ?? "",
    ...horizons.map((h) => o.byHorizon[h]?.total ?? "veto"),
    ...horizons.map((h) => (o.byHorizon[h]?.vetoes ?? []).join(" | ")),
    o.sourceIds.map((id) => src.get(id)?.url).filter(Boolean).join(" "),
  ]);
  return "﻿" + [header, ...rows].map((row) => row.map(esc).join(";")).join("\r\n");
}
