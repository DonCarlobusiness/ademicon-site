import { beforeEach, describe, expect, it } from "vitest";
import { FIX, FIXED_NOW, fixtureFetch } from "../helpers";
import { parseBcbSeries, fetchBcbSeries, bcbUrl, fetchMacroSnapshot } from "@/lib/market-data/bcb";
import { parseTicker, parseAssetPair, parseOhlc, tickerConsistency, fetchKraken } from "@/lib/market-data/kraken";
import { parseTesouroCsvText, classifyTesouro, fetchTesouro } from "@/lib/market-data/tesouro";
import { parseCvmIndex } from "@/lib/market-data/cvm";
import { assertAllowedUrl, cacheClear, resetCircuits, safeFetch, circuitStatus, CircuitOpenError } from "@/lib/market-data/http";
import { brDateToIso } from "@/lib/market-data/time";

beforeEach(() => {
  cacheClear();
  resetCircuits();
});

describe("BCB/SGS", () => {
  it("descarta datas futuras e ordena (série 432 real)", () => {
    const { points, discardedFuture } = parseBcbSeries(JSON.parse(FIX("bcb-432-with-future.json")), FIXED_NOW);
    expect(discardedFuture).toBeGreaterThan(0);
    expect(points.at(-1)!.date <= FIXED_NOW.toISOString()).toBe(true);
    expect(points.at(-1)!.value).toBe(13.75);
    for (let i = 1; i < points.length; i++) expect(points[i].date >= points[i - 1].date).toBe(true);
  });
  it("preserva data oficial (dd/mm/aaaa → UTC 03:00)", () => {
    expect(brDateToIso("06/11/2026")).toBe("2026-11-06T03:00:00.000Z");
    expect(() => brDateToIso("2026-11-06")).toThrow();
  });
  it("rejeita schema inválido", () => {
    expect(() => parseBcbSeries([{ data: "01/01/2026" }])).toThrow();
    expect(() => parseBcbSeries([{ data: "01/01/2026", valor: "abc" }])).toThrow();
  });
  it("URL usa intervalo de datas", () => {
    expect(bcbUrl(432, FIXED_NOW, 30)).toContain("dataInicial=10%2F10%2F2026&dataFinal=09%2F11%2F2026");
  });
  it("fetch com fixture gera fonte com proveniência", async () => {
    const s = await fetchBcbSeries("selic_meta", { fetchImpl: fixtureFetch(), now: FIXED_NOW });
    expect(s.source.method).toBe("api_oficial_publica");
    expect(s.source.url).toMatch(/^https:\/\/api\.bcb\.gov\.br/);
    expect(s.source.freshness).toBe("atual");
  });
  it("falha do BCB vira resultado 'falhou' sem dados inventados", async () => {
    const r = await fetchMacroSnapshot({ fetchImpl: fixtureFetch({ bcb: true }), retries: 0, now: FIXED_NOW });
    expect(r.status).toBe("falhou");
    expect(r.data).toBeNull();
    expect(r.error).toMatch(/503/);
  });
});

describe("Kraken (dados públicos)", () => {
  it("normaliza ticker real", () => {
    const t = parseTicker(JSON.parse(FIX("kraken-ticker-xbtusd.json")), "BTCUSD");
    expect(t.ask).toBeGreaterThanOrEqual(t.bid);
    expect(t.last).toBeGreaterThan(1000);
    expect(tickerConsistency(t)).toEqual([]);
  });
  it("lê mínimo de ordem do AssetPairs", () => {
    const p = parseAssetPair(JSON.parse(FIX("kraken-assetpairs-xbtusd.json")), "BTCUSD");
    expect(p.orderMinBase).toBeGreaterThan(0);
  });
  it("calcula histórico OHLC", () => {
    const h = parseOhlc(JSON.parse(FIX("kraken-ohlc-xbtusd.json")), "BTCUSD");
    expect(h.days).toBeGreaterThan(300);
    expect(h.annualizedVol).toBeGreaterThan(0.1);
    expect(h.maxDrawdown).toBeGreaterThan(0);
  });
  it("erro da Kraken é propagado", () => {
    expect(() => parseTicker({ error: ["EQuery:Unknown asset pair"] }, "BTCUSD")).toThrow(/Unknown asset pair/);
  });
  it("detecta livro invertido", () => {
    const t = parseTicker(JSON.parse(FIX("kraken-ticker-xbtusd.json")), "BTCUSD");
    expect(tickerConsistency({ ...t, bid: t.ask * 1.1 })).toContain("bid maior que ask (livro invertido)");
  });
  it("falha de rede vira 'falhou'", async () => {
    const r = await fetchKraken({ fetchImpl: fixtureFetch({ kraken: true }), retries: 0 });
    expect(r.status).toBe("falhou");
    expect(r.data).toBeNull();
  });
});

describe("Tesouro Transparente", () => {
  it("mantém somente a data-base mais recente", () => {
    const { bonds } = parseTesouroCsvText(FIX("tesouro-sample.csv"));
    expect(bonds.length).toBeGreaterThan(20);
    expect(new Set(bonds.map((b) => b.baseDate)).size).toBe(1);
    expect(bonds[0].baseDate).toBe("2026-11-06T03:00:00.000Z");
    const selic = bonds.find((b) => b.kind === "selic")!;
    expect(selic.buyPrice).toBeGreaterThan(10000);
  });
  it("classifica tipos", () => {
    expect(classifyTesouro("Tesouro IPCA+ com Juros Semestrais").kind).toBe("ipca_juros");
    expect(classifyTesouro("Tesouro Renda+ Aposentadoria Extra").kind).toBe("renda_mais");
    expect(classifyTesouro("Tesouro Prefixado").kind).toBe("prefixado");
  });
  it("detecta mudança de formato", () => {
    expect(() => parseTesouroCsvText("A;B;C\n1;2;3")).toThrow(/Formato do CSV/);
  });
  it("lê via stream com fixture", async () => {
    const r = await fetchTesouro({ fetchImpl: fixtureFetch(), now: FIXED_NOW });
    expect(r.status).toBe("ok");
    expect(r.data!.source.method).toBe("publicacao_oficial");
  });
});

describe("CVM e fetch seguro", () => {
  it("lista arquivos do índice", () => {
    expect(parseCvmIndex('<a href="../">..</a><a href="cad_fi.csv">x</a>')).toEqual(["cad_fi.csv"]);
  });
  it("bloqueia hosts não permitidos e HTTP", () => {
    expect(() => assertAllowedUrl("https://evil.example.com/x")).toThrow(/não permitido/);
    expect(() => assertAllowedUrl("http://api.bcb.gov.br/x")).toThrow(/HTTPS/);
  });
  it("abre o circuito após falhas repetidas", async () => {
    const f = fixtureFetch({ tesouro: true });
    for (let i = 0; i < 3; i++) await expect(safeFetch("https://www.tesourotransparente.gov.br/x", { fetchImpl: f, retries: 0 })).rejects.toThrow();
    expect(circuitStatus("www.tesourotransparente.gov.br").state).toBe("aberto");
    await expect(safeFetch("https://www.tesourotransparente.gov.br/x", { fetchImpl: f })).rejects.toBeInstanceOf(CircuitOpenError);
  });
  it("respeita timeout", async () => {
    const slow = ((_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as unknown as typeof fetch;
    await expect(safeFetch("https://api.kraken.com/0/public/Time", { fetchImpl: slow, timeoutMs: 50, retries: 0 })).rejects.toThrow(/Tempo esgotado/);
  });
});
