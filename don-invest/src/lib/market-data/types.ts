/**
 * Tipos de proveniência e resultado dos conectores de dados.
 * Toda informação numérica exibida deve carregar uma SourceRecord.
 */

export type ProviderId =
  | "bcb_sgs"
  | "kraken_public"
  | "tesouro_transparente"
  | "cvm_dados_abertos"
  | "quotes_licensed";

export type ObtainMethod =
  | "api_oficial_publica" // API pública oficial (BCB, Kraken public)
  | "publicacao_oficial" // arquivo/dataset oficial publicado (Tesouro Transparente, CVM)
  | "api_licenciada" // provedor pago/licenciado
  | "regra_catalogada" // regra documentada em catálogo interno (não consultada ao vivo)
  | "entrada_manual"; // fornecido pelo usuário

export type Freshness = "atual" | "defasado" | "desatualizado" | "indisponivel";

export interface SourceRecord {
  id: string;
  provider: ProviderId | "catalogo" | "usuario";
  label: string;
  url: string;
  method: ObtainMethod;
  /** Momento em que o sistema buscou o dado (ISO UTC). */
  collectedAt: string;
  /** Data/hora de referência do próprio dado (ISO UTC) — p.ex. data da série no BCB. */
  referenceAt: string | null;
  /** Idade do dado em minutos no momento da coleta. */
  ageMinutes: number | null;
  freshness: Freshness;
  /** 0–1: confiança na qualidade do dado. */
  confidence: number;
  note?: string;
}

export type ProviderStatus = "ok" | "parcial" | "falhou" | "nao_configurado";

export interface ProviderResult<T> {
  provider: ProviderId;
  status: ProviderStatus;
  data: T | null;
  sources: SourceRecord[];
  error?: string;
  durationMs: number;
  fromCache: boolean;
}

export interface ProviderHealth {
  provider: ProviderId;
  label: string;
  status: ProviderStatus;
  circuit: "fechado" | "aberto" | "meio-aberto";
  lastError?: string;
  lastSuccessAt?: string;
}
