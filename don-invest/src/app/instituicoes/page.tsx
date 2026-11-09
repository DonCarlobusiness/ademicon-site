import Link from "next/link";
import { latestReport } from "@/lib/store";
import { Badge, Section } from "@/components/ui";
import { formatDateTimeBR } from "@/lib/market-data/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instituições — DON INVEST" };

export default async function Instituicoes() {
  const r = await latestReport();
  if (!r) return <Section title="Instituições"><p className="text-sm text-slate-400">Faça uma <Link className="text-electric-400" href="/pesquisar">pesquisa</Link> para ver o comparador.</p></Section>;
  return (
    <Section title="Bancos, programas e exchanges" subtitle="Somente o que foi verificado é marcado como tal; o restante aparece como regra catalogada ou não verificado.">
      <div className="grid gap-4 md:grid-cols-2">
        {r.platforms.map((p) => (
          <div key={p.id} className="rounded-xl border border-navy-700 p-4">
            <p className="font-semibold">{p.officialUrl ? <a href={p.officialUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline">{p.name} ↗</a> : p.name}</p>
            <p className="mt-1 text-xs text-slate-400">{p.products}</p>
            <dl className="mt-3 space-y-2 text-sm">
              {([["Taxas/custos", p.fees], ["Câmbio", p.fx], ["Proteção", p.protection], ["Jurisdição", p.jurisdiction], ["Elegibilidade", p.eligibility]] as const).map(([k, f]) => (
                <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd>{f.value} <Badge tone={f.status === "verificado_api" ? "emerald" : f.status === "regra_catalogada" ? "amber" : "slate"}>{f.status === "verificado_api" ? "verificado (API)" : f.status === "regra_catalogada" ? "regra catalogada" : "não verificado"}</Badge></dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-500">Última conferência: {p.lastChecked ? formatDateTimeBR(p.lastChecked) : "não verificado"}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
