/**
 * CVM Dados Abertos — Fase 1: apenas verificação de disponibilidade do catálogo
 * de cadastro de fundos. A integração de informes diários (cota/PL) é Fase 2.
 * Importante: a cota publicada pela CVM é PASSADA (D-1 ou mais) e não é preço negociável.
 */
import { safeFetch, cached, type SafeFetchOptions } from "./http";
import { makeSource, DAILY_OFFICIAL } from "./source";
import type { ProviderResult, SourceRecord } from "./types";

export const CVM_CAD_DIR = "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/";

export interface CvmCatalog {
  files: string[];
}

export function parseCvmIndex(html: string): string[] {
  return [...html.matchAll(/href="([^"/][^"]*\.(?:csv|zip))"/g)].map((m) => m[1]);
}

export async function fetchCvmCatalog(opts: SafeFetchOptions & { now?: Date } = {}): Promise<ProviderResult<CvmCatalog>> {
  const t0 = Date.now();
  try {
    const { value: files, fromCache } = await cached("cvm:caddir", 6 * 3600_000, async () => {
      const res = await safeFetch(CVM_CAD_DIR, opts);
      return parseCvmIndex(await res.text());
    });
    const now = opts.now ?? new Date();
    const source: SourceRecord = makeSource({
      id: "cvm-cad",
      provider: "cvm_dados_abertos",
      label: "CVM Dados Abertos — diretório de cadastro de fundos (FI/CAD)",
      url: CVM_CAD_DIR,
      method: "publicacao_oficial",
      collectedAt: now,
      referenceAt: now.toISOString(),
      policy: DAILY_OFFICIAL,
      confidence: 0.9,
      note: "Fase 1: somente disponibilidade verificada; nenhum fundo é analisado ainda.",
    });
    return { provider: "cvm_dados_abertos", status: files.length ? "parcial" : "falhou", data: { files }, sources: [source], durationMs: Date.now() - t0, fromCache };
  } catch (e) {
    return { provider: "cvm_dados_abertos", status: "falhou", data: null, sources: [], error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - t0, fromCache: false };
  }
}
