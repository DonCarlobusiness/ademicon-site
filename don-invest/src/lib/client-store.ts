"use client";

/**
 * Histórico de pesquisas no navegador do próprio usuário (localStorage).
 * Em hospedagem serverless não há disco persistente no servidor; além disso, manter
 * os relatórios no dispositivo do usuário evita guardar dados dele no servidor.
 */
import { useMemo, useSyncExternalStore } from "react";
import type { ResearchReport } from "./analysis/types";

const INDEX_KEY = "don-invest:reports";
const REPORT_KEY = (id: string) => `don-invest:report:${id}`;
const MAX_REPORTS = 8;
const EVENT = "don-invest:reports-changed";

export interface ReportIndexEntry {
  id: string;
  createdAt: string;
  status: ResearchReport["status"];
  capital: number;
  monthly: number;
  horizonMonths: number[];
}

function readIndex(): ReportIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const list = raw ? (JSON.parse(raw) as ReportIndexEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveReportLocal(r: ResearchReport): void {
  try {
    let index = readIndex().filter((e) => e.id !== r.id);
    index.unshift({ id: r.id, createdAt: r.createdAt, status: r.status, capital: r.input.capital, monthly: r.input.monthlyContribution, horizonMonths: r.horizonMonths ?? [] });
    for (const old of index.slice(MAX_REPORTS)) localStorage.removeItem(REPORT_KEY(old.id));
    index = index.slice(0, MAX_REPORTS);
    const payload = JSON.stringify(r);
    try {
      localStorage.setItem(REPORT_KEY(r.id), payload);
    } catch {
      // Sem espaço: descarta os mais antigos e tenta de novo
      for (const old of index.slice(1)) localStorage.removeItem(REPORT_KEY(old.id));
      index = index.slice(0, 1);
      localStorage.setItem(REPORT_KEY(r.id), payload);
    }
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* armazenamento indisponível (modo privado etc.): segue sem histórico */
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** undefined = ainda carregando (servidor/hidratação); null = não existe. */
function useStored<T>(key: string | null): T | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => (key ? safeGet(key) : null), () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}

export function useReportIndex(): ReportIndexEntry[] | undefined {
  const v = useStored<ReportIndexEntry[]>(INDEX_KEY);
  return v === undefined ? undefined : (v ?? []);
}

export function useLocalReport(id: string | null): ResearchReport | null | undefined {
  return useStored<ResearchReport>(id ? REPORT_KEY(id) : null);
}

export function useLatestReport(): ResearchReport | null | undefined {
  const index = useReportIndex();
  const latest = useLocalReport(index && index.length ? index[0].id : null);
  if (index === undefined) return undefined;
  if (index.length === 0) return null;
  return latest;
}

/** Baixa um arquivo gerado no navegador (CSV/JSON) sem depender do servidor. */
export function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
