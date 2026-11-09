import { NextResponse } from "next/server";
import { providerHealth } from "@/lib/market-data/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const live = new URL(req.url).searchParams.get("live") === "1";
  return NextResponse.json(await providerHealth({ live }));
}
