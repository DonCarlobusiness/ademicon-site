import { NextResponse } from "next/server";
import { fetchMacroSnapshot } from "@/lib/market-data/bcb";
import { monthlyToAnnual } from "@/lib/finance/rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Indicadores oficiais do BCB (dados observados) para preencher hipóteses do simulador. */
export async function GET() {
  const r = await fetchMacroSnapshot();
  const d = r.data ?? {};
  const item = (k: keyof typeof d) => {
    const s = d[k];
    return s ? { value: s.latest.value, unit: s.def.unit, referenceDate: s.latest.date, url: s.url, label: s.def.label, collectedAt: s.source.collectedAt } : null;
  };
  const poup = d.poupanca ? monthlyToAnnual(d.poupanca.latest.value / 100) * 100 : null;
  return NextResponse.json({
    status: r.status,
    error: r.error,
    selicMeta: item("selic_meta"),
    selic: item("selic_efetiva"),
    cdi: item("cdi"),
    ipca12m: item("ipca_12m"),
    usdbrl: item("usdbrl"),
    poupanca: item("poupanca"),
    poupancaAnnualPct: poup,
  });
}
