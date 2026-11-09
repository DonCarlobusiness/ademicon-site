import Link from "next/link";
import { latestReport } from "@/lib/store";
import { Section, StatusBadge } from "@/components/ui";
import { formatDateTimeBR } from "@/lib/market-data/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ativos pesquisados — DON INVEST" };

export default async function Ativos({ searchParams }: { searchParams: Promise<{ classe?: string; moeda?: string }> }) {
  const sp = await searchParams;
  const r = await latestReport();
  if (!r) return <Section title="Ativos"><p className="text-sm text-slate-400">Nenhuma pesquisa ainda. <Link className="text-electric-400" href="/pesquisar">Pesquisar agora</Link>.</p></Section>;
  const classes = [...new Set(r.opportunities.map((o) => o.classLabel))];
  const items = r.opportunities.filter((o) => (!sp.classe || o.classLabel === sp.classe) && (!sp.moeda || o.currency === sp.moeda));
  const src = new Map(r.evidence.map((s) => [s.id, s]));
  return (
    <Section title="Ativos da pesquisa mais recente" subtitle={`Pesquisa de ${formatDateTimeBR(r.createdAt)}. Filtros por classe e moeda.`}>
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <select name="classe" defaultValue={sp.classe ?? ""} className="rounded-lg border border-navy-600 bg-navy-900 px-3 py-2" aria-label="Classe">
          <option value="">Todas as classes</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="moeda" defaultValue={sp.moeda ?? ""} className="rounded-lg border border-navy-600 bg-navy-900 px-3 py-2" aria-label="Moeda">
          <option value="">Todas as moedas</option><option>BRL</option><option>USD</option>
        </select>
        <button className="rounded-lg bg-navy-700 px-3 py-2 text-gold-400">Filtrar</button>
      </form>
      <div className="overflow-x-auto">
        <table className="data w-full min-w-[800px]">
          <thead><tr><th>Ativo</th><th>Classe</th><th>Taxa/cotação</th><th>Fonte principal</th><th>Atualização</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((o) => {
              const s = src.get(o.rateOrPrice.sourceIds[0]);
              return (
                <tr key={o.id}>
                  <td><Link href={`/relatorios/${r.id}#op-${o.id}`} className="font-semibold hover:text-gold-400">{o.name}</Link></td>
                  <td className="text-xs">{o.classLabel}</td>
                  <td className="text-xs">{o.rateOrPrice.display}</td>
                  <td className="text-xs">{s ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline">{s.label}</a> : "—"}</td>
                  <td className="text-xs">{formatDateTimeBR(o.observedAt)}</td>
                  <td><StatusBadge s={o.dataStatus} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">Ações, FIIs, ETFs e REITs não aparecem porque não há provedor licenciado configurado (ver Fontes & Config.).</p>
    </Section>
  );
}
