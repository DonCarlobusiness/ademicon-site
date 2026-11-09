/**
 * Conector Tesouro Direto via dataset OFICIAL "Taxas dos Títulos Ofertados pelo Tesouro Direto"
 * publicado no portal Tesouro Transparente (CKAN, licença ODbL).
 * Página do dataset: https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto
 *
 * Não fazemos scraping do site tesourodireto.com.br. O CSV é publicado com
 * defasagem (normalmente D-1 útil); por isso a interface mostra a data-base do
 * dado e nunca o chama de "tempo real".
 */
import { safeFetch, cached, type SafeFetchOptions } from "./http";
import { brDateToIso } from "./time";
import { makeSource, DAILY_OFFICIAL } from "./source";
import type { ProviderResult, SourceRecord } from "./types";

export const TESOURO_CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv";
export const TESOURO_DATASET_PAGE =
  "https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto";
export const TESOURO_OFFICIAL_SITE = "https://www.tesourodireto.com.br/";

export type TesouroKind =
  | "selic"
  | "prefixado"
  | "prefixado_juros"
  | "ipca"
  | "ipca_juros"
  | "igpm_juros"
  | "renda_mais"
  | "educa_mais"
  | "outro";

export interface TesouroBond {
  name: string; // "Tesouro IPCA+ 2035"
  type: string; // como publicado: "Tesouro IPCA+"
  kind: TesouroKind;
  maturity: string; // ISO
  baseDate: string; // ISO — data de referência do preço/taxa
  buyRatePct: number | null; // taxa para quem compra (% a.a.; no Selic = ágio/deságio sobre a Selic)
  sellRatePct: number | null;
  buyPrice: number | null; // PU de compra (R$)
  sellPrice: number | null;
  availableForPurchase: boolean;
  pays: "no_vencimento" | "cupom_semestral" | "renda_mensal_futura";
  indexer: "Selic" | "Prefixado" | "IPCA" | "IGP-M";
}

export function classifyTesouro(type: string): Pick<TesouroBond, "kind" | "pays" | "indexer"> {
  const t = type.toLowerCase();
  if (t.includes("selic")) return { kind: "selic", pays: "no_vencimento", indexer: "Selic" };
  if (t.includes("renda+")) return { kind: "renda_mais", pays: "renda_mensal_futura", indexer: "IPCA" };
  if (t.includes("educa+")) return { kind: "educa_mais", pays: "renda_mensal_futura", indexer: "IPCA" };
  if (t.includes("igpm")) return { kind: "igpm_juros", pays: "cupom_semestral", indexer: "IGP-M" };
  if (t.includes("ipca") && t.includes("juros")) return { kind: "ipca_juros", pays: "cupom_semestral", indexer: "IPCA" };
  if (t.includes("ipca")) return { kind: "ipca", pays: "no_vencimento", indexer: "IPCA" };
  if (t.includes("prefixado") && t.includes("juros")) return { kind: "prefixado_juros", pays: "cupom_semestral", indexer: "Prefixado" };
  if (t.includes("prefixado")) return { kind: "prefixado", pays: "no_vencimento", indexer: "Prefixado" };
  return { kind: "outro", pays: "no_vencimento", indexer: "Prefixado" };
}

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const v = s.trim();
  if (v === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const EXPECTED_HEADER = ["Tipo Titulo", "Data Vencimento", "Data Base", "Taxa Compra Manha", "Taxa Venda Manha", "PU Compra Manha", "PU Venda Manha", "PU Base Manha"];

export function parseTesouroRow(cols: string[]): TesouroBond | null {
  if (cols.length < 7) return null;
  const [type, venc, base, tc, tv, puc, puv] = cols;
  let maturity: string, baseDate: string;
  try {
    maturity = brDateToIso(venc);
    baseDate = brDateToIso(base);
  } catch {
    return null;
  }
  const cls = classifyTesouro(type);
  const buyPrice = num(puc);
  const buyRate = num(tc);
  return {
    name: `${type.trim()} ${maturity.slice(0, 4)}`,
    type: type.trim(),
    ...cls,
    maturity,
    baseDate,
    buyRatePct: buyRate,
    sellRatePct: num(tv),
    buyPrice,
    sellPrice: num(puv),
    // PU de compra zerado/vazio indica título não ofertado para compra naquele dia.
    availableForPurchase: buyPrice !== null && buyPrice > 0,
  };
}

/**
 * Lê CSV (separador ';') e retorna os títulos da data-base mais recente.
 * O arquivo oficial é ordenado da data mais recente para a mais antiga; por isso
 * a leitura em stream para assim que surge uma data-base anterior à máxima,
 * evitando baixar ~15 MB a cada consulta. Se a ordem mudar, `latestOnly` ainda
 * filtra corretamente as linhas lidas.
 */
export function parseTesouroCsvText(text: string): { header: string[]; bonds: TesouroBond[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) throw new Error("CSV do Tesouro vazio");
  const header = lines[0].split(";").map((h) => h.trim());
  validateHeader(header);
  const bonds = lines.slice(1).map((l) => parseTesouroRow(l.split(";"))).filter((b): b is TesouroBond => b !== null);
  return { header, bonds: latestOnly(bonds) };
}

function validateHeader(header: string[]) {
  const ok = EXPECTED_HEADER.every((h, i) => header[i]?.replace(/^﻿/, "") === h);
  if (!ok) throw new Error(`Formato do CSV do Tesouro mudou. Cabeçalho recebido: ${header.join(";")}`);
}

export function latestOnly(bonds: TesouroBond[]): TesouroBond[] {
  if (bonds.length === 0) return [];
  const max = bonds.reduce((m, b) => (b.baseDate > m ? b.baseDate : m), bonds[0].baseDate);
  return bonds.filter((b) => b.baseDate === max);
}

async function streamLatest(opts: SafeFetchOptions): Promise<TesouroBond[]> {
  const res = await safeFetch(TESOURO_CSV_URL, { timeoutMs: 45_000, retries: 1, ...opts });
  if (!res.body) {
    return parseTesouroCsvText(await res.text()).bonds;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  let header: string[] | null = null;
  const rows: TesouroBond[] = [];
  let maxDate: string | null = null;
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) {
      buf += decoder.decode();
      done = true;
    } else {
      buf += decoder.decode(chunk.value, { stream: true });
    }
    const lines = buf.split(/\r?\n/);
    buf = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (!line.trim()) continue;
      if (!header) {
        header = line.split(";").map((h) => h.trim());
        validateHeader(header);
        continue;
      }
      const b = parseTesouroRow(line.split(";"));
      if (!b) continue;
      if (maxDate === null || b.baseDate > maxDate) maxDate = b.baseDate;
      if (b.baseDate < maxDate) {
        done = true;
        break;
      }
      rows.push(b);
    }
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  if (!header) throw new Error("CSV do Tesouro sem cabeçalho");
  return latestOnly(rows);
}

export interface TesouroData {
  bonds: TesouroBond[];
  baseDate: string;
  source: SourceRecord;
}

export async function fetchTesouro(opts: SafeFetchOptions & { now?: Date } = {}): Promise<ProviderResult<TesouroData>> {
  const t0 = Date.now();
  try {
    const { value: bonds, fromCache, storedAt } = await cached("tesouro:latest", 2 * 3600_000, () => streamLatest(opts));
    if (bonds.length === 0) throw new Error("Nenhum título encontrado no CSV oficial");
    const baseDate = bonds[0].baseDate;
    const source = makeSource({
      id: "tesouro-precotaxa",
      provider: "tesouro_transparente",
      label: "Tesouro Transparente — Taxas dos Títulos Ofertados pelo Tesouro Direto (CSV oficial)",
      url: TESOURO_CSV_URL,
      method: "publicacao_oficial",
      collectedAt: fromCache ? new Date(storedAt) : (opts.now ?? new Date()),
      referenceAt: baseDate,
      policy: DAILY_OFFICIAL,
      confidence: 0.95,
      note: "Dados de fechamento/manhã da data-base publicada (não é cotação em tempo real). Confirme preço e taxa no site oficial antes de qualquer decisão.",
    });
    return { provider: "tesouro_transparente", status: "ok", data: { bonds, baseDate, source }, sources: [source], durationMs: Date.now() - t0, fromCache };
  } catch (e) {
    return {
      provider: "tesouro_transparente",
      status: "falhou",
      data: null,
      sources: [],
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - t0,
      fromCache: false,
    };
  }
}
