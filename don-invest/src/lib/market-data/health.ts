import { circuitStatus } from "./http";
import { fetchBcbSeries } from "./bcb";
import { fetchKrakenAsset } from "./kraken";
import { fetchTesouro } from "./tesouro";
import { fetchCvmCatalog } from "./cvm";
import { quotesStatus } from "./quotes";
import type { ProviderHealth } from "./types";
import { complianceMode } from "../compliance";

const PROVIDERS: { id: ProviderHealth["provider"]; label: string; host: string | null }[] = [
  { id: "bcb_sgs", label: "Banco Central — SGS", host: "api.bcb.gov.br" },
  { id: "kraken_public", label: "Kraken — dados públicos", host: "api.kraken.com" },
  { id: "tesouro_transparente", label: "Tesouro Transparente — CSV oficial", host: "www.tesourotransparente.gov.br" },
  { id: "cvm_dados_abertos", label: "CVM Dados Abertos", host: "dados.cvm.gov.br" },
  { id: "quotes_licensed", label: "Cotações licenciadas (ações/FIIs/ETFs/REITs)", host: null },
];

export async function providerHealth({ live = false } = {}) {
  const checks: Record<string, () => Promise<unknown>> = {
    bcb_sgs: () => fetchBcbSeries("selic_meta"),
    kraken_public: () => fetchKrakenAsset("BTCUSD"),
    tesouro_transparente: async () => {
      const r = await fetchTesouro();
      if (r.status !== "ok") throw new Error(r.error);
    },
    cvm_dados_abertos: async () => {
      const r = await fetchCvmCatalog();
      if (r.status === "falhou") throw new Error(r.error);
    },
  };
  const out: (ProviderHealth & { checkedLive: boolean })[] = [];
  for (const p of PROVIDERS) {
    if (!p.host) {
      const q = quotesStatus();
      out.push({ provider: p.id, label: p.label, status: q.status, circuit: "fechado", lastError: q.error, checkedLive: false });
      continue;
    }
    let status: ProviderHealth["status"] = "ok";
    let err: string | undefined;
    if (live) {
      try {
        await checks[p.id]();
      } catch (e) {
        status = "falhou";
        err = e instanceof Error ? e.message : String(e);
      }
    }
    const c = circuitStatus(p.host);
    if (!live) status = c.state === "aberto" ? "falhou" : c.lastSuccessAt ? "ok" : "parcial";
    out.push({ provider: p.id, label: p.label, status, circuit: c.state, lastError: err ?? c.lastError, lastSuccessAt: c.lastSuccessAt, checkedLive: live });
  }
  return { checkedAt: new Date().toISOString(), providers: out, compliance: complianceMode(), anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY), supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) };
}
