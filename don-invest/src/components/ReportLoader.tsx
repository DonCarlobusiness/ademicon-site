"use client";

import Link from "next/link";
import type { ResearchReport } from "@/lib/analysis/types";
import { useLocalReport } from "@/lib/client-store";
import { ReportView } from "./ReportView";

/** Mostra o relatório vindo do servidor (cache) ou, se não houver, do histórico deste navegador. */
export function ReportLoader({ id, serverReport }: { id: string; serverReport: ResearchReport | null }) {
  const local = useLocalReport(serverReport ? null : id);
  const report = serverReport ?? local;
  if (report) return <ReportView report={report} />;
  if (local === undefined) return <p className="panel p-6 text-sm text-slate-400">Carregando relatório…</p>;
  return (
    <div className="panel p-6">
      <h1 className="text-xl font-bold">Relatório não encontrado neste navegador</h1>
      <p className="mt-2 text-sm text-slate-400">
        O histórico de pesquisas fica salvo no dispositivo em que a pesquisa foi feita (até 8 relatórios). Em outro aparelho ou após limpar os dados do navegador, faça uma nova pesquisa.
      </p>
      <Link href="/" className="mt-4 inline-block rounded-lg bg-gold-500 px-4 py-2 font-semibold text-navy-950">Fazer nova pesquisa</Link>
    </div>
  );
}
