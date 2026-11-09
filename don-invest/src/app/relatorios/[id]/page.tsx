import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/store";
import { Badge, FreshnessBadge, ScoreBar, Section, StatusBadge } from "@/components/ui";
import { WeightsEditor } from "@/components/WeightsEditor";
import { DIMENSION_LABEL, type Opportunity, type ResearchReport } from "@/lib/analysis/types";
import { brl, pctFmt } from "@/lib/analysis/context";
import { formatAge, formatDateBR, formatDateTimeBR } from "@/lib/market-data/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório de pesquisa — DON INVEST" };

const METHOD_LABEL: Record<string, string> = {
  api_oficial_publica: "API oficial pública",
  publicacao_oficial: "Publicação oficial",
  api_licenciada: "API licenciada",
  regra_catalogada: "Regra catalogada",
  entrada_manual: "Entrada manual",
};

function SourceLinks({ ids, report }: { ids: string[]; report: ResearchReport }) {
  const map = new Map(report.evidence.map((s) => [s.id, s]));
  const uniq = [...new Set(ids)].map((id) => map.get(id)).filter(Boolean);
  return (
    <span className="flex flex-wrap gap-1">
      {uniq.map((s, i) => (
        <a key={s!.id} href={`#src-${s!.id}`} className="text-[11px] text-electric-400 hover:underline" title={s!.label}>
          [{i + 1}{s!.method === "regra_catalogada" ? "·regra" : s!.method === "entrada_manual" ? "·manual" : ""}]
        </a>
      ))}
    </span>
  );
}

function OpportunityDetail({ o, report }: { o: Opportunity; report: ResearchReport }) {
  return (
    <details id={`op-${o.id}`} className="rounded-xl border border-navy-700 bg-navy-900/60 p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-100">{o.name}</span>
        <StatusBadge s={o.dataStatus} />
        <Badge>{o.classLabel}</Badge>
        {o.viableWithCapital === false && <Badge tone="red">mínimo acima do capital</Badge>}
      </summary>
      <div className="mt-4 grid gap-4 text-sm lg:grid-cols-2">
        <div className="space-y-2">
          <p><span className="text-slate-400">Taxa/cotação observada:</span> {o.rateOrPrice.display} {o.rateOrPrice.verified ? <Badge tone="emerald">verificado</Badge> : <Badge tone="amber">não verificado</Badge>} <SourceLinks ids={o.rateOrPrice.sourceIds} report={report} /></p>
          <p><span className="text-slate-400">Mínimo:</span> {o.minimum.display}</p>
          <p><span className="text-slate-400">Viabilidade com seu capital:</span> {o.viabilityNote}</p>
          <p><span className="text-slate-400">Liquidez:</span> {o.liquidity}</p>
          <p><span className="text-slate-400">Impostos:</span> {o.taxes}</p>
          <p><span className="text-slate-400">Custos:</span> {o.costs}</p>
          <p><span className="text-slate-400">Proteção:</span> {o.protection}</p>
          {o.incomeNote && <p className="rounded-lg border border-gold-600/40 bg-gold-500/5 p-2"><span className="text-gold-400">Sobre renda:</span> {o.incomeNote}</p>}
          {o.officialUrl && <p><a className="text-electric-400 hover:underline" href={o.officialUrl} target="_blank" rel="noopener noreferrer nofollow">Site oficial ↗</a></p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["Vantagens", o.pros, "text-emerald-400"], ["Desvantagens", o.cons, "text-amber-300"], ["Principais riscos", o.risks, "text-red-300"], ["O que invalidaria o cenário", o.invalidators, "text-slate-300"], ["Informações que faltam", o.missingInfo, "text-slate-400"]] as const).map(([t, list, c]) => (
            <div key={t}>
              <p className={`text-xs font-semibold uppercase ${c}`}>{t}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-300">{list.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Object.values(o.byHorizon).map((a) => a && (
          <div key={a.horizon} className="rounded-lg border border-navy-700 p-3">
            <p className="flex items-center justify-between text-sm font-semibold">
              <span>{report.horizons.find((h) => h.horizon === a.horizon)?.title}</span>
              <ScoreBar value={a.total} />
            </p>
            {a.vetoes.length > 0 && <ul className="mt-2 list-disc pl-4 text-xs text-red-300">{a.vetoes.map((v) => <li key={v}>Veto: {v}</li>)}</ul>}
            {a.warnings.length > 0 && <ul className="mt-2 list-disc pl-4 text-xs text-amber-300">{a.warnings.map((v) => <li key={v}>{v}</li>)}</ul>}
            <table className="data mt-2 w-full">
              <thead><tr><th>Dimensão</th><th>Nota</th><th>Peso</th><th>Justificativa</th></tr></thead>
              <tbody>
                {a.scores.map((s) => (
                  <tr key={s.dimension}><td className="whitespace-nowrap">{DIMENSION_LABEL[s.dimension]}</td><td className="tabular-nums">{s.weight === 0 ? "—" : s.score}</td><td className="tabular-nums">{Math.round(s.weight * 100)}%</td><td className="text-xs text-slate-400">{s.justification}</td></tr>
                ))}
              </tbody>
            </table>
            {a.scenario && (
              <div className="mt-3 rounded-lg bg-navy-800 p-3 text-xs">
                <p className="font-semibold text-electric-400">Cenário ilustrativo (HIPÓTESE — não é promessa) · {a.scenario.label}</p>
                <p className="mt-1 text-slate-400">Base: {a.scenario.basis}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                  <span>Aplicado: <strong>{brl(a.scenario.amount)}</strong></span>
                  <span>Bruto: <strong>{brl(a.scenario.grossFinal)}</strong></span>
                  <span>Custódia: <strong>{brl(a.scenario.custody)}</strong></span>
                  <span>IR+IOF: <strong>{brl(a.scenario.tax.ir + a.scenario.tax.iof)}</strong></span>
                  <span>Líquido: <strong className="text-emerald-400">{brl(a.scenario.netFinal)}</strong></span>
                  <span>Líquido a.a.: <strong>{pctFmt(a.scenario.netAnnualized * 100)}</strong></span>
                  <span>Real a.a.: <strong>{pctFmt(a.scenario.realNetAnnualized * 100)}</strong></span>
                  <span>Em R$ de hoje: <strong>{brl(a.scenario.realNetFinal)}</strong></span>
                </div>
                <p className="mt-1 text-slate-500">{a.scenario.tax.note}</p>
              </div>
            )}
            {a.volatileRange && (
              <div className="mt-3 rounded-lg bg-navy-800 p-3 text-xs">
                <p className="font-semibold text-electric-400">Faixa ilustrativa de variação (HIPÓTESE)</p>
                <p className="mt-1">Pessimista {brl(a.volatileRange.pessimista)} · Central {brl(a.volatileRange.central)} · Otimista {brl(a.volatileRange.otimista)}</p>
                <p className="mt-1 text-slate-500">{a.volatileRange.label}. Sem custos, câmbio e impostos.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) notFound();
  const byId = new Map(r.opportunities.map((o) => [o.id, o]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Relatório de pesquisa</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{brl(r.input.capital)} · {r.horizons.map((h) => h.title.split(" (")[0]).join(" + ")}</h1>
          <p className="mt-1 text-sm text-slate-400">Gerado em {formatDateTimeBR(r.createdAt)} (America/Bahia) · ID {r.id.slice(0, 8)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge s={r.status} />
            <Badge tone="blue">Modo pesquisa determinística (sem IA generativa)</Badge>
            <Badge>Recomendação regulada: desativada</Badge>
            <Badge>Armazenamento: local limitado</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`/api/reports/${r.id}?format=csv`} className="rounded-lg border border-navy-600 px-3 py-2 hover:border-gold-500">Exportar CSV</a>
          <a href={`/api/reports/${r.id}`} className="rounded-lg border border-navy-600 px-3 py-2 hover:border-gold-500">JSON</a>
          <Link href="/pesquisar" className="rounded-lg bg-gold-500 px-3 py-2 font-semibold text-navy-950">Nova pesquisa</Link>
        </div>
      </div>

      {r.status !== "completo" && (
        <div role="alert" className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-100">
          <strong>{r.status === "indisponivel" ? "DADOS INDISPONÍVEIS" : "PESQUISA PARCIAL"}:</strong> uma ou mais fontes não responderam. Nenhum dado foi substituído por valores inventados.
          <ul className="mt-2 list-disc pl-5">{r.providerRuns.filter((p) => p.status === "falhou").map((p) => <li key={p.provider}>{p.label}: {p.error}</li>)}</ul>
        </div>
      )}

      {r.globalWarnings.length > 0 && (
        <div className="space-y-2">{r.globalWarnings.map((w) => <p key={w} className="rounded-xl border border-gold-600/50 bg-gold-500/5 p-3 text-sm text-gold-100">⚠ {w}</p>)}</div>
      )}

      <Section title="Resumo executivo" subtitle="Escrito a partir dos dados estruturados e auditados abaixo — sem números gerados por IA.">
        <ul className="list-disc space-y-1 pl-5 text-sm">{r.executiveSummary.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="mt-4 text-xs font-semibold uppercase text-slate-400">O que continua incerto</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-400">{r.uncertainties.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
          <p><span className="text-slate-300">Pergunta interpretada:</span> {r.orchestrator.interpretedQuestion}</p>
          <p><span className="text-slate-300">Perfil preliminar (não certificado):</span> {r.orchestrator.profile.label} — {r.orchestrator.profile.rationale.join("; ")}</p>
        </div>
      </Section>

      <Section title="Contexto macro confirmado (dados observados)" subtitle="Banco Central do Brasil — SGS. Data de referência oficial preservada.">
        <div className="overflow-x-auto">
          <table className="data w-full">
            <thead><tr><th>Indicador</th><th>Valor</th><th>Referência</th><th>Fonte</th></tr></thead>
            <tbody>
              {r.macro.map((m) => (
                <tr key={m.key}><td>{m.label}</td><td className="tabular-nums font-semibold">{m.value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} <span className="text-xs text-slate-400">{m.unit}</span></td><td>{formatDateBR(m.referenceDate)}</td><td><SourceLinks ids={[m.sourceId]} report={r} /></td></tr>
              ))}
              {r.macro.length === 0 && <tr><td colSpan={4} className="text-amber-300">DADOS INDISPONÍVEIS</td></tr>}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc pl-5 text-xs text-slate-400">{r.macroNotes.map((n) => <li key={n}>{n}</li>)}</ul>
      </Section>

      {r.horizons.map((h) => (
        <Section key={h.horizon} id={`h-${h.horizon}`} title={h.title} subtitle={h.focus}>
          <p className={`rounded-lg p-3 text-sm ${h.insufficientBasis ? "border border-amber-500/50 bg-amber-500/10 text-amber-100" : "bg-navy-900 text-slate-200"}`}>{h.conclusion}</p>
          {h.rankedIds.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="data w-full">
                <thead><tr><th>Opção</th><th>Aderência</th><th>Mínimo</th><th>Taxa/cotação</th><th>Liquidez</th><th>Cenário líquido</th><th>Dados</th></tr></thead>
                <tbody>
                  {h.rankedIds.map((id) => {
                    const o = byId.get(id)!;
                    const a = o.byHorizon[h.horizon]!;
                    return (
                      <tr key={id}>
                        <td><a href={`#op-${o.id}`} className="font-semibold hover:text-gold-400">{o.name}</a><div className="text-xs text-slate-500">{o.classLabel}</div></td>
                        <td><ScoreBar value={a.total} /></td>
                        <td className="text-xs">{o.minimum.value !== null && o.minimum.value !== undefined ? brl(o.minimum.value) : "—"}{o.viableWithCapital ? <span className="block text-emerald-400">cabe no capital</span> : null}</td>
                        <td className="max-w-xs text-xs">{o.rateOrPrice.display.split(" · ")[0]}</td>
                        <td className="max-w-xs text-xs text-slate-400">{o.liquidity}</td>
                        <td className="text-xs">{a.scenario ? <>{brl(a.scenario.netFinal)}<span className="block text-slate-500">{a.scenario.label}</span></> : a.volatileRange ? <span className="text-slate-400">faixa {brl(a.volatileRange.pessimista, 0)}–{brl(a.volatileRange.otimista, 0)}</span> : "não modelado"}</td>
                        <td><StatusBadge s={o.dataStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {h.vetoedIds.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-red-300">Vetadas pelo Risk Guardian neste horizonte</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-400">
                {h.vetoedIds.map((id) => { const o = byId.get(id)!; return <li key={id}><a href={`#op-${o.id}`} className="text-slate-200 hover:text-gold-400">{o.name}</a>: {o.byHorizon[h.horizon]!.vetoes.join(" ")}</li>; })}
              </ul>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">Pesos: {Object.entries(h.weights).map(([k, v]) => `${DIMENSION_LABEL[k as keyof typeof DIMENSION_LABEL]} ${Math.round(v * 100)}%`).join(" · ")}</p>
          <WeightsEditor input={r.input as unknown as Record<string, unknown>} horizon={h.horizon} weights={h.weights} />
        </Section>
      ))}

      <Section title="Tabela de opções realmente pesquisadas" subtitle="Somente itens com dados obtidos nesta pesquisa (ou informados por você, marcados como manuais).">
        <div className="overflow-x-auto">
          <table className="data w-full min-w-[1100px]">
            <thead><tr><th>Ativo/produto</th><th>Emissor</th><th>Moeda</th><th>Mínimo</th><th>Taxa / cotação</th><th>Referência</th><th>Vencimento</th><th>Impostos</th><th>Custos</th><th>Proteção</th><th>Data do dado</th><th>Fontes</th></tr></thead>
            <tbody>
              {r.opportunities.map((o) => (
                <tr key={o.id}>
                  <td><a href={`#op-${o.id}`} className="font-semibold hover:text-gold-400">{o.name}</a> <StatusBadge s={o.dataStatus} /></td>
                  <td className="text-xs">{o.issuer}</td>
                  <td>{o.currency}</td>
                  <td className="text-xs">{o.minimum.display}</td>
                  <td className="text-xs">{o.rateOrPrice.display}</td>
                  <td className="text-xs">{o.benchmark}</td>
                  <td className="text-xs">{o.maturity ?? "—"}</td>
                  <td className="text-xs">{o.taxes}</td>
                  <td className="text-xs">{o.costs}</td>
                  <td className="text-xs">{o.protection}</td>
                  <td className="text-xs">{formatDateTimeBR(o.observedAt)}</td>
                  <td><SourceLinks ids={o.sourceIds} report={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Análise de cada oportunidade" subtitle="Vantagens, desvantagens, riscos, invalidadores, lacunas, notas explicáveis e cenários.">
        <div className="space-y-3">{r.opportunities.map((o) => <OpportunityDetail key={o.id} o={o} report={r} />)}</div>
      </Section>

      {r.breakEven.length > 0 && (
        <Section title="Pontos de equilíbrio para ofertas bancárias (CDB, LCI, LCA)" subtitle="Não são ofertas. Use para avaliar uma oferta real que você encontrar.">
          <ul className="space-y-2 text-sm">{r.breakEven.map((b) => <li key={b.label}><strong>{b.label} <span className="text-gold-400">{b.value}</span></strong> <span className="text-slate-400">— {b.basis}</span></li>)}</ul>
        </Section>
      )}

      <Section title="Comparador de plataformas" subtitle='Campos não conferidos aparecem como "não verificado".'>
        <div className="overflow-x-auto">
          <table className="data w-full min-w-[900px]">
            <thead><tr><th>Instituição</th><th>Produtos</th><th>Taxas/custos</th><th>Câmbio</th><th>Proteção</th><th>Jurisdição</th><th>Elegibilidade</th><th>Última conferência</th></tr></thead>
            <tbody>
              {r.platforms.map((p) => (
                <tr key={p.id}>
                  <td>{p.officialUrl ? <a href={p.officialUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-electric-400 hover:underline">{p.name} ↗</a> : p.name}</td>
                  <td className="text-xs">{p.products}</td>
                  {[p.fees, p.fx, p.protection, p.jurisdiction, p.eligibility].map((f, i) => (
                    <td key={i} className="text-xs">{f.value}<div><Badge tone={f.status === "verificado_api" ? "emerald" : f.status === "regra_catalogada" ? "amber" : "slate"}>{f.status === "verificado_api" ? "verificado (API)" : f.status === "regra_catalogada" ? "regra catalogada" : "não verificado"}</Badge></div></td>
                  ))}
                  <td className="text-xs">{p.lastChecked ? formatDateTimeBR(p.lastChecked) : "não verificado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Classes não pesquisadas" subtitle="Sem fonte confiável/licenciada nesta versão — nenhuma nota foi atribuída.">
        <ul className="space-y-2 text-sm">{r.unavailableClasses.map((u) => <li key={u.className}><strong>{u.className}:</strong> <span className="text-slate-300">{u.reason}</span> <span className="block text-xs text-slate-500">Como integrar: {u.howToIntegrate}</span></li>)}</ul>
      </Section>

      <Section title="Premissas dos cenários (hipóteses editáveis)" subtitle="Separadas dos dados observados. Altere em Pesquisar → premissas.">
        <ul className="space-y-1 text-sm">{r.assumptions.map((a) => <li key={a.key}><Badge tone="blue">hipótese</Badge> {a.label}: <strong>{a.value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} {a.unit}</strong> {a.sourceId && <SourceLinks ids={[a.sourceId]} report={r} />}</li>)}</ul>
      </Section>

      <Section title="Trilha de evidências" subtitle="Fonte, URL, horário de coleta, referência do dado, idade, método, confiança e frescor.">
        <div className="overflow-x-auto">
          <table className="data w-full min-w-[1000px]">
            <thead><tr><th>#</th><th>Fonte</th><th>Método</th><th>Coleta</th><th>Referência</th><th>Idade</th><th>Confiança</th><th>Estado</th></tr></thead>
            <tbody>
              {r.evidence.map((s, i) => (
                <tr key={s.id} id={`src-${s.id}`}>
                  <td className="text-xs text-slate-500">{i + 1}</td>
                  <td className="max-w-md text-xs">{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline break-all">{s.label}</a> : s.label}{s.note && <div className="text-slate-500">{s.note}</div>}</td>
                  <td className="text-xs">{METHOD_LABEL[s.method]}</td>
                  <td className="text-xs">{formatDateTimeBR(s.collectedAt)}</td>
                  <td className="text-xs">{formatDateTimeBR(s.referenceAt)}</td>
                  <td className="text-xs">{s.method === "regra_catalogada" ? "—" : formatAge(s.ageMinutes)}</td>
                  <td className="text-xs tabular-nums">{Math.round(s.confidence * 100)}%</td>
                  <td><FreshnessBadge f={s.freshness} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Execução dos conectores</p>
            <ul className="mt-1 space-y-1 text-xs">{r.providerRuns.map((p) => <li key={p.provider} className="flex flex-wrap items-center gap-2"><StatusBadge s={p.status} /> {p.label} · {p.durationMs} ms{p.fromCache ? " · cache" : ""}{p.error && <span className="text-slate-500">— {p.error}</span>}</li>)}</ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Evidence Auditor</p>
            <ul className="mt-1 space-y-1 text-xs">{r.audit.checks.map((c) => <li key={c.name}><span className={c.ok ? "text-emerald-400" : "text-red-300"}>{c.ok ? "✓" : "✗"}</span> {c.name}: <span className="text-slate-400">{c.detail}</span></li>)}</ul>
            {r.audit.removed.length > 0 && <ul className="mt-2 list-disc pl-4 text-xs text-amber-300">{r.audit.removed.map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>
        </div>
      </Section>

      <section className="rounded-xl border border-navy-700 p-4 text-xs leading-relaxed text-slate-400">
        <p className="font-semibold text-slate-300">Avisos importantes</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">{r.disclaimers.map((d) => <li key={d}>{d}</li>)}</ul>
      </section>
    </div>
  );
}
