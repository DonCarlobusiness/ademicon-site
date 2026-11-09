import { NextResponse } from "next/server";
import { z } from "zod";
import { ResearchInputSchema } from "@/lib/analysis/input";
import { runResearch } from "@/lib/analysis/research";
import { saveReport } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`research:${ip}`);
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas pesquisas em sequência. Aguarde e tente novamente." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 20_000) return NextResponse.json({ error: "Requisição muito grande." }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = ResearchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }
  try {
    const report = await runResearch(parsed.data);
    // Cache opcional no servidor; o histórico oficial fica no navegador do usuário.
    await saveReport(report).catch(() => undefined);
    return NextResponse.json({ id: report.id, status: report.status, providerRuns: report.providerRuns, report });
  } catch (e) {
    console.error("[research] falha inesperada:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Falha inesperada ao executar a pesquisa. Nenhum dado foi inventado." }, { status: 500 });
  }
}
