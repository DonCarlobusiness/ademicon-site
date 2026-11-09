"use client";

import Link from "next/link";
import { useState } from "react";
import type { Opportunity, ResearchReport, ProductProjection } from "@/lib/analysis/types";
import { HORIZON_LABEL, type Horizon } from "@/lib/analysis/input";
import { formatMonths } from "@/lib/finance/projection";
import { fmtBRL } from "@/lib/format";
import { StateBadge } from "./StateBadge";
import { formatReferenceBR } from "@/lib/market-data/time";

const dt = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }).format(new Date(iso)) : "—");
const dOnly = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short" }).format(new Date(iso));
const bucketOf = (m: number): Horizon => (m <= 12 ? "curto" : m <= 60 ? "medio" : "longo");

function ProjectionCell({ p }: { p: ProductProjection | undefined }) {
  if (!p) return <span className="text-slate-500">—</span>;
  if (p.state === "INDISPONIVEL") return <span className="block max-w-[14rem] text-[11px] text-slate-400"><StateBadge s="INDISPONIVEL" /> {p.note}</span>;
  if (p.range) {
    return (
      <span className="block text-xs">
        <StateBadge s="ESTIMATIVA_CENARIO" />
        <span className="mt-1 block tabular-nums">{fmtBRL(p.range.pessimista, 0)} a {fmtBRL(p.range.otimista, 0)}</span>
        <span className="block text-[11px] text-slate-500">faixa ilustrativa, só capital inicial</span>
      </span>
    );
  }
  return (
    <span className="block text-xs">
      <StateBadge s={p.state} />
      <span className="mt-1 block font-semibold tabular-nums text-slate-100">{fmtBRL(p.finalBalance)}</span>
      <span className="block tabular-nums text-emerald-400">+{fmtBRL(p.grossGain)} bruto</span>
      <span className="block text-[11px] text-slate-400">
        {p.taxStatus === "calculado" ? <>impostos {fmtBRL(p.taxes)} · líquido <strong className="text-slate-200">{fmtBRL(p.netBalance)}</strong></> : p.taxStatus === "isento" ? <>isento de IR · líquido {fmtBRL(p.netBalance)}</> : "impostos não calculados"}
      </span>
    </span>
  );
}

function OppRow({ o, report, months }: { o: Opportunity; report: ResearchReport; months: number[] }) {
  const [open, setOpen] = useState(false);
  const src = new Map(report.evidence.map((s) => [s.id, s]));
  const primary = o.rateOrPrice.sourceIds.map((id) => src.get(id)).find(Boolean);
  const projections = o.projections ?? [];
  return (
    <>
      <tr>
        <td className="min-w-[11rem] max-w-[15rem]">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-left font-semibold text-slate-100 hover:text-gold-400">
            {open ? "▾" : "▸"} {o.name}
          </button>
          <span className="block text-[11px] text-slate-500">{o.classLabel} · {o.issuer}</span>
        </td>
        <td className="text-xs">
          {o.minimum.value !== null && o.minimum.value !== undefined ? fmtBRL(o.minimum.value) : "—"}
          <span className={`block text-[11px] ${o.viableWithCapital === false ? "text-red-300" : "text-emerald-400"}`}>
            {o.viableWithCapital === false ? "acima do seu valor" : o.viableWithCapital ? "cabe no seu valor" : "não verificado"}
          </span>
        </td>
        <td className="min-w-[10rem] text-xs">
          <StateBadge s={o.dataStatus === "manual" ? "INFORMADO_USUARIO" : o.rateOrPrice.verified ? "DADO_OBSERVADO" : "INDISPONIVEL"} />
          <span className="mt-1 block">{o.rateOrPrice.display.split(" · ")[0]}</span>
          <span className="block text-[11px] text-slate-500">ref. {formatReferenceBR(o.observedAt)}{primary?.url && <> · <a href={primary.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline">fonte</a></>}</span>
        </td>
        <td className="min-w-[11rem] text-xs text-slate-400">{o.liquidity}</td>
        <td className="min-w-[13rem] text-xs text-slate-400">{o.risks[0]}<span className="block text-slate-500">{o.protection.split(".")[0]}.</span></td>
        {months.map((m) => <td key={m}><ProjectionCell p={projections.find((p) => p.months === m)} /></td>)}
      </tr>
      {open && (
        <tr>
          <td colSpan={5 + months.length} className="bg-navy-900/60">
            <OppDetails o={o} />
          </td>
        </tr>
      )}
    </>
  );
}

function OppDetails({ o }: { o: Opportunity }) {
  const projections = o.projections ?? [];
  return (
            <div className="grid gap-4 py-2 text-xs md:grid-cols-3">
      <div>
        <p className="font-semibold text-slate-200">Identificação e regras</p>
        <p className="mt-1 text-slate-400">{o.identifier}</p>
        <p className="mt-1"><span className="text-slate-500">Vencimento:</span> {o.maturity ?? "—"}</p>
        <p className="mt-1"><span className="text-slate-500">Impostos:</span> {o.taxes}</p>
        <p className="mt-1"><span className="text-slate-500">Custos:</span> {o.costs}</p>
        <p className="mt-1"><span className="text-slate-500">Proteção:</span> {o.protection}</p>
        {o.incomeNote && <p className="mt-1 text-gold-400">{o.incomeNote}</p>}
      </div>
      <div>
        <p className="font-semibold text-slate-200">Riscos e o que falta saber</p>
        <ul className="mt-1 list-disc pl-4 text-slate-400">{o.risks.map((r) => <li key={r}>{r}</li>)}</ul>
        <ul className="mt-1 list-disc pl-4 text-slate-500">{o.missingInfo.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
      <div>
        <p className="font-semibold text-slate-200">Onde verificar ou contratar</p>
        <ul className="mt-1 space-y-1">
          {(o.whereToCheck ?? []).map((w) => (
            <li key={w.url}><a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline">{w.label} ↗</a>{w.kind === "usuario" && <span className="text-slate-500"> (informado por você)</span>}</li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-slate-500">Links oficiais catalogados; o sistema não acessou essas páginas nesta pesquisa. Confirme taxa, mínimo e condições lá antes de decidir.</p>
        <p className="mt-2 font-semibold text-slate-200">Notas das projeções</p>
        <ul className="mt-1 list-disc pl-4 text-slate-500">{projections.map((p) => <li key={p.months}>{formatMonths(p.months)}: {p.note}</li>)}</ul>
      </div>
    </div>
  );
}

/** Versão em cartão para telas pequenas: mesmo conteúdo da linha da tabela, sem rolagem lateral. */
function OppCard({ o, report, months }: { o: Opportunity; report: ResearchReport; months: number[] }) {
  const [open, setOpen] = useState(false);
  const src = new Map(report.evidence.map((s) => [s.id, s]));
  const primary = o.rateOrPrice.sourceIds.map((id) => src.get(id)).find(Boolean);
  const projections = o.projections ?? [];
  return (
    <li className="rounded-xl border border-navy-700 bg-navy-900/60 p-3">
      <p className="font-semibold text-slate-100">{o.name}</p>
      <p className="text-xs text-slate-500">{o.classLabel} · {o.issuer}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="col-span-2">
          <dt className="text-slate-500">Taxa / preço observado</dt>
          <dd className="mt-0.5">
            <StateBadge s={o.dataStatus === "manual" ? "INFORMADO_USUARIO" : o.rateOrPrice.verified ? "DADO_OBSERVADO" : "INDISPONIVEL"} />{" "}
            {o.rateOrPrice.display.split(" · ")[0]}
            <span className="block text-slate-500">ref. {formatReferenceBR(o.observedAt)}{primary?.url && <> · <a href={primary.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 underline">fonte</a></>}</span>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Mínimo</dt>
          <dd>{o.minimum.value !== null && o.minimum.value !== undefined ? fmtBRL(o.minimum.value) : "—"}
            <span className={`block ${o.viableWithCapital === false ? "text-red-300" : "text-emerald-400"}`}>{o.viableWithCapital === false ? "acima do seu valor" : o.viableWithCapital ? "cabe no seu valor" : "não verificado"}</span>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Proteção</dt>
          <dd className="text-slate-300">{o.protection.split(".")[0]}.</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Liquidez</dt>
          <dd className="text-slate-300">{o.liquidity}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Principal risco</dt>
          <dd className="text-slate-300">{o.risks[0]}</dd>
        </div>
      </dl>
      <ul className="mt-3 divide-y divide-navy-700 rounded-lg border border-navy-700">
        {months.map((m) => (
          <li key={m} className="flex items-start justify-between gap-3 px-3 py-2">
            <span className="shrink-0 text-xs font-semibold text-slate-300">Em {formatMonths(m)}</span>
            <span className="min-w-0 text-right"><ProjectionCell p={projections.find((p) => p.months === m)} /></span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 min-h-11 w-full rounded-lg border border-navy-600 text-sm text-electric-400">
        {open ? "Ocultar detalhes" : "Detalhes, riscos e onde verificar"}
      </button>
      {open && <div className="mt-2"><OppDetails o={o} /></div>}
    </li>
  );
}

export function ResearchResults({ report: r, onChangeValue, onChangeTerm }: { report: ResearchReport; onChangeValue: () => void; onChangeTerm: () => void }) {
  const byId = new Map(r.opportunities.map((o) => [o.id, o]));
  const months = r.horizonMonths ?? [];
  const failed = r.providerRuns.filter((p) => p.status === "falhou");
  const okRuns = r.providerRuns.filter((p) => p.status === "ok" || p.status === "parcial");
  const buckets = r.horizons.filter((h) => h.horizon !== "indefinido");

  return (
    <section aria-labelledby="titulo-resultado" className="panel space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-resultado" className="text-xl font-extrabold">
            Com {fmtBRL(r.input.capital)} iniciais{r.input.monthlyContribution ? ` e ${fmtBRL(r.input.monthlyContribution)}/mês` : ""}, estes são os cenários em {months.map(formatMonths).join(", ")}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Atualizado em {dt(r.createdAt)} (horário da Bahia) · {r.status === "completo" ? "pesquisa completa" : r.status === "parcial" ? "pesquisa PARCIAL" : "DADOS INDISPONÍVEIS"} ·
            fontes ok: {okRuns.map((p) => p.label).join(", ") || "nenhuma"}
          </p>
          {failed.length > 0 && <p role="alert" className="mt-1 text-xs text-amber-300">Conectores que falharam: {failed.map((p) => `${p.label} (${p.error})`).join("; ")}. Nada foi preenchido no lugar.</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/relatorios/${r.id}`} className="rounded-lg bg-gold-500 px-3 py-2 font-semibold text-navy-950">Ver análise completa</Link>
          <button type="button" onClick={onChangeValue} className="rounded-lg border border-navy-600 px-3 py-2 hover:border-gold-500">Alterar valor</button>
          <button type="button" onClick={onChangeTerm} className="rounded-lg border border-navy-600 px-3 py-2 hover:border-gold-500">Alterar prazo</button>
          <Link href="/pesquisar" className="rounded-lg border border-navy-600 px-3 py-2 hover:border-gold-500">Comparar com outra opção</Link>
          <a href={`/api/reports/${r.id}?format=csv`} className="rounded-lg border border-navy-600 px-3 py-2 hover:border-gold-500">Exportar CSV</a>
          <button type="button" disabled title="Exportação em PDF ainda não implementada" className="rounded-lg border border-navy-700 px-3 py-2 text-slate-500">PDF (em breve)</button>
        </div>
      </div>

      {r.globalWarnings.length > 0 && (
        <ul className="space-y-1 text-xs text-gold-100">{r.globalWarnings.map((w) => <li key={w} className="rounded-lg border border-gold-600/40 bg-gold-500/5 px-3 py-2">⚠ {w}</li>)}</ul>
      )}

      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/40 p-3">
          <p className="text-xs font-semibold uppercase text-emerald-300">O que foi observado</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-300">
            {r.macro.slice(0, 4).map((m) => <li key={m.key}>{m.label}: {m.value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} {m.unit} (ref. {dOnly(m.referenceDate)})</li>)}
            <li>{r.opportunities.filter((o) => o.dataStatus !== "manual").length} produtos com taxa/preço de fonte oficial ou pública</li>
          </ul>
        </div>
        <div className="rounded-xl border border-electric-500/40 p-3">
          <p className="text-xs font-semibold uppercase text-electric-400">O que é hipótese</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-300">{r.assumptions.map((a) => <li key={a.key}>{a.label}: {a.value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} {a.unit}</li>)}</ul>
        </div>
        <div className="rounded-xl border border-slate-600 p-3">
          <p className="text-xs font-semibold uppercase text-slate-300">O que está faltando</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-400">{[...new Set(r.uncertainties.map((u) => u.replace(/^Ações, ETFs e (FIIs da B3|REITs internacionais)/, "Ações, FIIs, ETFs e REITs (Brasil e exterior)")))].slice(0, 5).map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      </div>

      {buckets.map((h) => {
        const ids = h.rankedIds.slice(0, 5);
        const hm = months.filter((m) => bucketOf(m) === h.horizon);
        const shownMonths = hm.length ? hm : months.slice(0, 2);
        return (
          <div key={h.horizon}>
            <h3 className="text-base font-bold text-gold-400">{HORIZON_LABEL[h.horizon]}</h3>
            <p className="text-xs text-slate-400">{h.focus}</p>
            {h.insufficientBasis || ids.length === 0 ? (
              <p className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">Não há base suficiente para destacar uma opção neste prazo com os dados obtidos.</p>
            ) : (
              <>
              <ul className="mt-2 space-y-3 md:hidden">{ids.map((id) => <OppCard key={id} o={byId.get(id)!} report={r} months={shownMonths} />)}</ul>
              <div className="mt-2 hidden overflow-x-auto md:block">
                <table className="data w-full min-w-[900px]">
                  <thead>
                    <tr><th>Opção</th><th>Mínimo</th><th>Taxa / preço observado</th><th>Liquidez</th><th>Risco e proteção</th>{shownMonths.map((m) => <th key={m}>Em {formatMonths(m)}</th>)}</tr>
                  </thead>
                  <tbody>{ids.map((id) => <OppRow key={id} o={byId.get(id)!} report={r} months={shownMonths} />)}</tbody>
                </table>
              </div>
              </>
            )}
            {h.vetoedIds.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-slate-400">{h.vetoedIds.length} opção(ões) não indicadas para este prazo e o motivo</summary>
                <ul className="mt-1 space-y-0.5 pl-4 text-slate-500">{h.vetoedIds.map((id) => <li key={id}><span className="text-slate-300">{byId.get(id)?.name}:</span> {byId.get(id)?.byHorizon[h.horizon]?.vetoes.join(" ")}</li>)}</ul>
              </details>
            )}
            <p className="mt-1 text-[11px] text-slate-500">A ordem segue a aderência aos critérios informados (segurança, liquidez, custo, prazo, retorno do cenário, câmbio e qualidade dos dados). Não é um “melhor investimento”.</p>
          </div>
        );
      })}

      <div className="rounded-xl border border-navy-600 p-3">
        <p className="text-sm font-semibold text-slate-200">Cobertura indisponível nesta instalação</p>
        <ul className="mt-1 space-y-1 text-xs text-slate-400">
          {r.unavailableClasses.map((u) => <li key={u.className}><StateBadge s="INDISPONIVEL" /> <strong className="text-slate-300">{u.className}</strong>: {u.reason} <span className="text-slate-500">Como ativar: {u.howToIntegrate}</span></li>)}
        </ul>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">{r.disclaimers[0]} {r.disclaimers[2]}</p>
    </section>
  );
}
