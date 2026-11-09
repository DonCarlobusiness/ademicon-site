/**
 * Adaptador para cotações de ações, FIIs, ETFs e REITs (B3 e exterior).
 * Não existe API pública oficial e gratuita da B3 para cotações; é preciso um
 * provedor licenciado. Enquanto QUOTES_PROVIDER não estiver configurado E
 * implementado, o status é "nao_configurado" e a UI mostra DADOS INDISPONÍVEIS.
 * Ver docs/data-sources.md para opções e custos.
 */
import type { ProviderResult } from "./types";

export interface QuoteProvider {
  id: string;
  getQuote(symbol: string): Promise<{ symbol: string; price: number; currency: string; asOf: string; delayedMinutes: number }>;
}

const IMPLEMENTED: Record<string, () => QuoteProvider> = {
  // Nenhum provedor licenciado foi integrado ainda (Fase 2).
};

export function getQuoteProvider(): QuoteProvider | null {
  const id = (process.env.QUOTES_PROVIDER || "").trim();
  if (!id || !process.env.QUOTES_API_KEY) return null;
  const factory = IMPLEMENTED[id];
  return factory ? factory() : null;
}

export function quotesStatus(): ProviderResult<null> {
  const configured = (process.env.QUOTES_PROVIDER || "").trim();
  const provider = getQuoteProvider();
  return {
    provider: "quotes_licensed",
    status: "nao_configurado",
    data: null,
    sources: [],
    error: provider
      ? undefined
      : configured
        ? `Provedor "${configured}" configurado, mas ainda não implementado nesta versão.`
        : "Nenhum provedor licenciado de cotações configurado (QUOTES_PROVIDER/QUOTES_API_KEY). Ações, FIIs, ETFs e REITs não foram pesquisados.",
    durationMs: 0,
    fromCache: false,
  };
}
