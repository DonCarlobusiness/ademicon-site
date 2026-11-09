import type { Freshness } from "@/lib/market-data/types";

export function Badge({ children, tone = "slate", title }: { children: React.ReactNode; tone?: "slate" | "gold" | "emerald" | "red" | "blue" | "amber"; title?: string }) {
  const tones: Record<string, string> = {
    slate: "border-slate-600 text-slate-300 bg-slate-800/40",
    gold: "border-gold-600 text-gold-400 bg-gold-500/10",
    emerald: "border-emerald-500/60 text-emerald-400 bg-emerald-500/10",
    red: "border-red-500/60 text-red-300 bg-red-500/10",
    blue: "border-electric-500/60 text-electric-400 bg-electric-500/10",
    amber: "border-amber-500/60 text-amber-300 bg-amber-500/10",
  };
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function FreshnessBadge({ f }: { f: Freshness }) {
  const map: Record<Freshness, [string, "emerald" | "amber" | "red" | "slate"]> = {
    atual: ["atual", "emerald"],
    defasado: ["defasado", "amber"],
    desatualizado: ["desatualizado", "red"],
    indisponivel: ["sem data", "slate"],
  };
  const [label, tone] = map[f];
  return <Badge tone={tone}>{label}</Badge>;
}

export function StatusBadge({ s }: { s: string }) {
  const tone = s === "ok" || s === "completo" || s === "verificado" ? "emerald" : s === "parcial" ? "amber" : s === "manual" ? "blue" : s === "nao_configurado" ? "slate" : "red";
  const label: Record<string, string> = { nao_configurado: "não configurado", indisponivel: "DADOS INDISPONÍVEIS", manual: "entrada manual" };
  return <Badge tone={tone}>{label[s] ?? s}</Badge>;
}

export function ScoreBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-red-300">vetado</span>;
  const color = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-gold-500" : "bg-amber-600";
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Aderência ${value} de 100`}>
      <span className="h-2 w-20 overflow-hidden rounded-full bg-navy-700">
        <span className={`block h-full ${color}`} style={{ width: `${value}%` }} />
      </span>
      <span className="tabular-nums text-sm font-semibold">{value}</span>
    </span>
  );
}

export function Section({ title, subtitle, children, id }: { title: string; subtitle?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="panel p-4 sm:p-6">
      <h2 className="text-lg font-bold text-gold-400">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
