import { readFileSync } from "node:fs";
import path from "node:path";
import { fetchMacroSnapshot } from "@/lib/market-data/bcb";
import { fetchKraken } from "@/lib/market-data/kraken";
import { fetchTesouro } from "@/lib/market-data/tesouro";
import { fetchCvmCatalog } from "@/lib/market-data/cvm";
import type { Connectors } from "@/lib/analysis/research";

export const FIX = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");
export const FIXED_NOW = new Date("2026-11-09T15:00:00.000Z");

const bcbSynthetic: Record<string, unknown> = {
  "1178": [{ data: "05/11/2026", valor: "13.65" }, { data: "06/11/2026", valor: "13.65" }],
  "4389": [{ data: "06/11/2026", valor: "13.65" }, { data: "05/11/2026", valor: "13.65" }],
  "433": [{ data: "01/08/2026", valor: "-0.32" }, { data: "01/09/2026", valor: "0.82" }],
  "1": [{ data: "05/11/2026", valor: "5.4621" }, { data: "06/11/2026", valor: "5.5013" }],
};

function ethTicker() {
  const btc = JSON.parse(FIX("kraken-ticker-xbtusd.json"));
  const t = Object.values(btc.result)[0] as Record<string, unknown>;
  const scale = (arr: string[]) => arr.map((x, i) => (i === 0 ? String(Number(x) / 35) : x));
  return {
    error: [],
    result: {
      XETHZUSD: { ...t, a: scale(t.a as string[]), b: scale(t.b as string[]), c: scale(t.c as string[]), l: (t.l as string[]).map((x) => String(Number(x) / 35)), h: (t.h as string[]).map((x) => String(Number(x) / 35)), o: String(Number(t.o) / 35) },
    },
  };
}

export type FailMode = Partial<Record<"bcb" | "kraken" | "tesouro" | "cvm", boolean>>;

/** fetch falso que roteia URLs reais para fixtures capturadas das APIs reais. */
export function fixtureFetch(fail: FailMode = {}): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.hostname === "api.bcb.gov.br") {
      if (fail.bcb) return new Response("erro", { status: 503 });
      const code = /bcdata\.sgs\.(\d+)/.exec(url.pathname)![1];
      if (code === "432") return new Response(FIX("bcb-432-with-future.json"));
      if (code === "13522") return new Response(FIX("bcb-13522.json"));
      if (code === "195") return new Response(FIX("bcb-195.json"));
      return json(bcbSynthetic[code] ?? []);
    }
    if (url.hostname === "api.kraken.com") {
      if (fail.kraken) throw new TypeError("fetch failed");
      const pair = url.searchParams.get("pair");
      if (url.pathname.endsWith("/Ticker")) return pair === "XBTUSD" ? new Response(FIX("kraken-ticker-xbtusd.json")) : json(ethTicker());
      if (url.pathname.endsWith("/AssetPairs")) {
        if (pair === "XBTUSD") return new Response(FIX("kraken-assetpairs-xbtusd.json"));
        return json({ error: [], result: { XETHZUSD: { altname: "ETHUSD", ordermin: "0.001", costmin: "0.5", status: "online", fees: [[0, 0.4]] } } });
      }
      if (url.pathname.endsWith("/OHLC")) {
        const raw = JSON.parse(FIX("kraken-ohlc-xbtusd.json"));
        if (pair === "XBTUSD") return json(raw);
        const rows = (Object.values(raw.result)[0] as unknown[][]).map((r) => [r[0], ...r.slice(1, 6).map((x) => String(Number(x) / 35)), r[6], r[7]]);
        return json({ error: [], result: { XETHZUSD: rows, last: 0 } });
      }
    }
    if (url.hostname === "www.tesourotransparente.gov.br") {
      if (fail.tesouro) return new Response("", { status: 500 });
      return new Response(FIX("tesouro-sample.csv"));
    }
    if (url.hostname === "dados.cvm.gov.br") {
      if (fail.cvm) return new Response("", { status: 404 });
      return new Response('<a href="../">../</a><a href="cad_fi.csv">cad_fi.csv</a><a href="cad_fi_hist.zip">x</a>');
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

export function fixtureConnectors(fail: FailMode = {}): Connectors {
  const fetchImpl = fixtureFetch(fail);
  const o = { fetchImpl, retries: 0, backoffMs: 1 };
  return {
    macro: (x = {}) => fetchMacroSnapshot({ ...x, ...o }),
    kraken: (x = {}) => fetchKraken({ ...x, ...o }),
    tesouro: (x = {}) => fetchTesouro({ ...x, ...o }),
    cvm: (x = {}) => fetchCvmCatalog({ ...x, ...o }),
  };
}
