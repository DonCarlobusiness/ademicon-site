"use client";

import Link from "next/link";
import { Section, StatusBadge, ScoreBar } from "@/components/ui";
import { Loading, NoResearchYet } from "@/components/EmptyState";
import { useLatestReport, useReportIndex } from "@/lib/client-store";
import { fmtBRL } from "@/lib/format";
import { formatMonths } from "@/lib/finance/projection";
import { formatDateBR, formatDateTimeBR } from "@/lib/market-data/time";

export default function Dashboard() {
  const last = useLatestReport();
  const list = useReportIndex();
  if (last === undefined || list === undefined) return <Loading />;
  if (!last) return <NoResearchYet what="O histórico de pesquisas" />;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Pesquisa mais recente" subtitle={`${formatDateTimeBR(last.createdAt)} · capital declarado ${fmtBRL(last.input.capital)}${last.input.monthlyContribution ? ` + ${fmtBRL(last.input.monthlyContribution)}/mês` : ""}`}>
          <StatusBadge s={last.status} />
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{last.executiveSummary.slice(2).map((s) => <li key={s}>{s}</li>)}</ul>
          <Link href={`/relatorios/${last.id}`} className="mt-3 inline-block py-2 text-sm text-electric-400 hover:underline">Abrir relatório completo →</Link>
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
        </Section>
      </div>
      <Section title="Pesquisas anteriores" subtitle="Salvas somente neste navegador (até 8).">
        <ul className="divide-y divide-navy-700 text-sm">
          {list.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link href={`/relatorios/${r.id}`} className="min-w-0 flex-1 py-3 hover:text-gold-400">
                {fmtBRL(r.capital)}{r.monthly ? ` + ${fmtBRL(r.monthly)}/mês` : ""} · {r.horizonMonths.map(formatMonths).join(", ")} · {formatDateTimeBR(r.createdAt)}
              </Link>
              <StatusBadge s={r.status} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
