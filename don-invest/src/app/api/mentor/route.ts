import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { askMentor, mentorConfigured } from "@/lib/mentor/mentor";
import { getReport, latestReport } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({ question: z.string().trim().min(3).max(800), reportId: z.string().uuid().optional() });

export async function GET() {
  return NextResponse.json({ configured: mentorConfigured() });
}

export async function POST(req: Request) {
  if (!mentorConfigured()) {
    return NextResponse.json({ configured: false, error: "Mentor IA não configurado: defina ANTHROPIC_API_KEY no servidor (.env.local). O simulador e a pesquisa funcionam sem ele." }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`mentor:${ip}`, Number(process.env.MENTOR_RATE_LIMIT_PER_MIN || 4));
  if (!rl.ok) return NextResponse.json({ error: "Muitas perguntas seguidas. Aguarde um pouco." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pergunta inválida (3 a 800 caracteres)." }, { status: 400 });
  const report = parsed.data.reportId ? await getReport(parsed.data.reportId) : await latestReport();
  try {
    return NextResponse.json({ configured: true, ...(await askMentor(parsed.data.question, report)) });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Chave da Anthropic inválida no servidor." }, { status: 502 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Limite da API de IA atingido. Tente novamente em instantes." }, { status: 503 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `Erro da API de IA (${e.status}).` }, { status: 502 });
    console.error("[mentor] falha:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Falha inesperada no mentor." }, { status: 500 });
  }
}
