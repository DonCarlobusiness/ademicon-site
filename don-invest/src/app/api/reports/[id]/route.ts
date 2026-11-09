import { NextResponse } from "next/server";
import { getReport } from "@/lib/store";
import { reportToCsv } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const report = await getReport(id);
  if (!report) return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
  const format = new URL(req.url).searchParams.get("format");
  if (format === "csv") {
    return new NextResponse(reportToCsv(report), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="don-invest-${id.slice(0, 8)}.csv"` },
    });
  }
  return NextResponse.json(report);
}
