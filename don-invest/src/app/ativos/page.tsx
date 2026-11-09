"use client";

import Link from "next/link";
import { useState } from "react";
import { Section, StatusBadge } from "@/components/ui";
import { Loading, NoResearchYet } from "@/components/EmptyState";
import { useLatestReport } from "@/lib/client-store";
import { formatDateTimeBR, formatReferenceBR } from "@/lib/market-data/time";

export default function Ativos() {
  const r = useLatestReport();
  const [classe, setClasse] = useState("");
  const [moeda, setMoeda] = useState("");
  if (r === undefined) return <Loading />;
  if (!r) return <NoResearchYet what="A lista de ativos pesquisados" />;
  const classes = [...new Set(r.opportunities.map((o) => o.classLabel))];
  const items = r.opportunities.filter((o) => (!classe || o.classLabel === classe) && (!moeda || o.currency === moeda));
  const src = new Map(r.evidence.map((s) => [s.id, s]));
  const sel = "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 sm:w-auto";
  return (
    <Section title="Ativos da pesquisa mais recente" subtitle={`Pesquisa de ${formatDateTimeBR(r.createdAt)}. Filtre por classe e moeda.`}>
      <div className="mb-4 grid gap-2 text-base sm:flex sm:flex-wrap sm:text-sm">
        <select value={classe} onChange={(e) => setClasse(e.target.value)} className={sel} aria-label="Classe">
          <option value="">Todas as classes</option>
          {classes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={moeda} onChange={(e) => setMoeda(e.target.value)} className={sel} aria-label="Moeda">
          <option value="">Todas as moedas</option><option>BRL</option><option>USD</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="data w-full min-w-[800px]">
          <thead><tr><th>Ativo</th><th>Classe</th><th>Taxa/cotação</th><th>Fonte principal</th><th>Referência</th><th>Status</th></tr></thead>
          <tbody>
            {items.map((o) => {
              const s = src.get(o.rateOrPrice.sourceIds[0]);
              return (
                <tr key={o.id}>
                  <td><Link href={`/relatorios/${r.id}#op-${o.id}`} className="font-semibold hover:text-gold-400">{o.name}</Link></td>
                  <td className="text-xs">{o.classLabel}</td>
                  <td className="text-xs">{o.rateOrPrice.display}</td>
                  <td className="text-xs">{s ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline">{s.label}</a> : "—"}</td>
                  <td className="text-xs">{formatReferenceBR(o.observedAt)}</td>
                  <td><StatusBadge s={o.dataStatus} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-slate-500">Ações, FIIs, ETFs e REITs não aparecem porque não há provedor licenciado de cotações configurado.</p>
    </Section>
  );
}
