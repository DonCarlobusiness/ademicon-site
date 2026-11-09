import Link from "next/link";
import { latestReport, listReports } from "@/lib/store";
import { Section, StatusBadge, ScoreBar } from "@/components/ui";
import { brl } from "@/lib/analysis/context";
import { formatDateBR, formatDateTimeBR } from "@/lib/market-data/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel — DON INVEST" };

export default async function Dashboard() {
  const [last, list] = await Promise.all([latestReport(), listReports(8)]);
  return (
    <div className="space-y-6">
      <div className="panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Pesquisa de investimentos com <span className="gold-text">dados verificáveis</span></h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Fontes oficiais consultadas ao vivo (Banco Central, Tesouro Transparente, Kraken), custos, riscos, acessibilidade para o seu capital e trilha de evidências. Sem ordens, sem promessas.</p>
        </div>
        <Link href="/pesquisar" className="rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 px-5 py-3 font-extrabold text-navy-950">PESQUISAR OPORTUNIDADES AGORA</Link>
      </div>

      {!last ? (
        <Section title="Nenhuma pesquisa ainda">
          <p className="text-sm text-slate-400">Faça sua primeira pesquisa para ver aqui o contexto macro confirmado, o resumo e as fontes.</p>
        </Section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Section title="Pesquisa mais recente" subtitle={`${formatDateTimeBR(last.createdAt)} · capital declarado ${brl(last.input.capital)}`}>
            <StatusBadge s={last.status} />
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{last.executiveSummary.slice(2).map((s) => <li key={s}>{s}</li>)}</ul>
            <Link href={`/relatorios/${last.id}`} className="mt-4 inline-block text-sm text-electric-400 hover:underline">Abrir relatório completo →</Link>
          </Section>
          <Section title="Macro confirmado (BCB)" subtitle="Valores e datas de referência oficiais.">
            <ul className="space-y-2 text-sm">
              {last.macro.map((m) => (
                <li key={m.key} className="flex justify-between gap-2"><span className="text-slate-400">{m.label}</span><span className="text-right tabular-nums font-semibold">{m.value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} <span className="text-xs text-slate-500">{m.unit} · {formatDateBR(m.referenceDate)}</span></span></li>
              ))}
            </ul>
          </Section>
          <Section title="Destaques por horizonte" subtitle="Aderência ao perfil informado — não é ranking universal.">
            {last.horizons.map((h) => (
              <div key={h.horizon} className="mb-3">
                <p className="text-xs font-semibold uppercase text-slate-400">{h.title}</p>
                {h.insufficientBasis ? <p className="text-sm text-amber-300">Sem base suficiente.</p> : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {h.rankedIds.slice(0, 3).map((id) => { const o = last.opportunities.find((x) => x.id === id)!; return <li key={id} className="flex items-center justify-between gap-2"><span>{o.name}</span><ScoreBar value={o.byHorizon[h.horizon]?.total ?? null} /></li>; })}
                  </ul>
                )}
              </div>
            ))}
            <p className="mt-2 text-xs text-slate-500">Fontes: {last.evidence.filter((e) => e.method !== "regra_catalogada").length} registros primários · {last.providerRuns.filter((p) => p.status === "ok").length} conectores ok.</p>
          </Section>
        </div>
      )}

      {list.length > 0 && (
        <Section title="Pesquisas anteriores (armazenamento local, 30 dias)">
          <ul className="divide-y divide-navy-700 text-sm">
            {list.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/relatorios/${r.id}`} className="hover:text-gold-400">{brl(r.input.capital)} · {r.input.horizons.join(" + ")} · {formatDateTimeBR(r.createdAt)}</Link>
                <StatusBadge s={r.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
