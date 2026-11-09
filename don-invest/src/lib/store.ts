/**
 * Persistência em modo local limitado: relatórios em JSON no diretório .data/ (UTC).
 * Não armazena dados bancários, CPF ou credenciais. Supabase é Fase 2.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ResearchReport } from "./analysis/types";

const DIR = path.join(process.cwd(), ".data", "reports");
const ID_RE = /^[0-9a-f-]{36}$/i;
/** Retenção: relatórios locais mais antigos que isto são apagados na listagem. */
export const RETENTION_DAYS = 30;

export async function saveReport(r: ResearchReport): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${r.id}.json`), JSON.stringify(r), "utf8");
}

export async function getReport(id: string): Promise<ResearchReport | null> {
  if (!ID_RE.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${id}.json`), "utf8")) as ResearchReport;
  } catch {
    return null;
  }
}

export async function listReports(limit = 20): Promise<Pick<ResearchReport, "id" | "createdAt" | "status" | "input">[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: Pick<ResearchReport, "id" | "createdAt" | "status" | "input">[] = [];
  const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;
  for (const f of files) {
    const p = path.join(DIR, f);
    try {
      const stat = await fs.stat(p);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(p);
        continue;
      }
      const r = JSON.parse(await fs.readFile(p, "utf8")) as ResearchReport;
      out.push({ id: r.id, createdAt: r.createdAt, status: r.status, input: r.input });
    } catch {
      /* ignora arquivo corrompido */
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function latestReport(): Promise<ResearchReport | null> {
  const [first] = await listReports(1);
  return first ? getReport(first.id) : null;
}
