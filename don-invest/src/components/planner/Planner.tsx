"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoneyInput } from "./MoneyInput";
import { GrowthChart } from "./GrowthChart";
import { StateBadge } from "./StateBadge";
import { ResearchResults } from "./ResearchResults";
import {
  DEFAULT_SCENARIOS, STANDARD_HORIZON_MONTHS, formatMonths, project, sustainableMonthlyWithdrawal, validateProjectionInput,
  type NamedScenario, type ProjectionResult, type TaxMode,
} from "@/lib/finance/projection";
import { fmtBRL, fmtPct, parsePctInput } from "@/lib/format";
import type { ResearchReport } from "@/lib/analysis/types";

type Objective = "renda_passiva" | "crescimento" | "preservacao" | "imovel" | "aposentadoria" | "liberdade_financeira";
type Liquidity = "imediata" | "ate_30d" | "nao_preve";
type Risk = "sem_perfil" | "conservador" | "moderado" | "arrojado";
type Reserve = "sim" | "nao" | "sem_resposta";

interface MacroItem { value: number; referenceDate: string; url: string; label: string }
interface Macro { status: string; cdi: MacroItem | null; selicMeta: MacroItem | null; ipca12m: MacroItem | null; poupanca: MacroItem | null; usdbrl: MacroItem | null; poupancaAnnualPct: number | null }

const OBJECTIVES: { v: Objective; l: string }[] = [
  { v: "renda_passiva", l: "Renda passiva" },
  { v: "crescimento", l: "Crescer patrimônio" },
  { v: "preservacao", l: "Preservar capital" },
  { v: "imovel", l: "Comprar imóvel" },
  { v: "aposentadoria", l: "Aposentadoria" },
  { v: "liberdade_financeira", l: "Liberdade financeira" },
];

const STORAGE_KEY = "don-invest:planner:v1";
const field = "min-h-11 w-full min-w-0 rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-base text-slate-100 focus:border-gold-500 sm:min-h-10";
const lbl = "mb-1 block text-sm font-medium text-slate-300";
const dateBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short" }).format(new Date(iso));

interface Saved {
  capital: number; monthly: number; objective: Objective; months: number; compareAll: boolean; liquidity: Liquidity;
  risk: Risk; maxLoss: number | null; reserve: Reserve; currency: "BRL" | "USD"; market: "brasil" | "internacional" | "ambos";
  rates: string[]; inflation: string; tax: TaxMode; cost: string;
}

function loadSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

export function Planner({ withResearch = true }: { withResearch?: boolean }) {
  // ---------- Entradas ----------
  const [capital, setCapital] = useState(750);
  const [monthly, setMonthly] = useState(0);
  const [objective, setObjective] = useState<Objective>("renda_passiva");
  const [months, setMonths] = useState(12);
  const [customText, setCustomText] = useState("");
  const [compareAll, setCompareAll] = useState(true);
  const [liquidity, setLiquidity] = useState<Liquidity>("nao_preve");
  const [risk, setRisk] = useState<Risk>("sem_perfil");
  const [maxLoss, setMaxLoss] = useState<number | null>(null);
  const [reserve, setReserve] = useState<Reserve>("sem_resposta");
  const [currency, setCurrency] = useState<"BRL" | "USD">("BRL");
  const [market, setMarket] = useState<"brasil" | "internacional" | "ambos">("ambos");
  const [rates, setRates] = useState<string[]>(DEFAULT_SCENARIOS.map((s) => (s.annualRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false })));
  const [rateOrigin, setRateOrigin] = useState<string[]>(DEFAULT_SCENARIOS.map(() => "hipótese editável"));
  const [inflation, setInflation] = useState("4,5");
  const [inflationOrigin, setInflationOrigin] = useState("hipótese editável");
  const [inflationTouched, setInflationTouched] = useState(false);
  const [tax, setTax] = useState<TaxMode>("nao_calcular");
  const [cost, setCost] = useState("0");
  const [chartScenario, setChartScenario] = useState(2);
  const [withdrawPlan, setWithdrawPlan] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const capitalRef = useRef<HTMLInputElement>(null);
  const horizonRef = useRef<HTMLFieldSetElement>(null);

  // ---------- Persistência local (somente parâmetros, sem segredos) ----------
  useEffect(() => {
    const s = loadSaved();
    /* eslint-disable react-hooks/set-state-in-effect -- restaura parâmetros salvos uma única vez após montar (evita divergência de hidratação) */
    if (typeof s.capital === "number") setCapital(s.capital);
    if (typeof s.monthly === "number") setMonthly(s.monthly);
    if (s.objective) setObjective(s.objective);
    if (typeof s.months === "number") setMonths(s.months);
    if (typeof s.compareAll === "boolean") setCompareAll(s.compareAll);
    if (s.liquidity) setLiquidity(s.liquidity);
    if (s.risk) setRisk(s.risk);
    if (s.maxLoss !== undefined) setMaxLoss(s.maxLoss);
    if (s.reserve) setReserve(s.reserve);
    if (s.currency) setCurrency(s.currency);
    if (s.market) setMarket(s.market);
    if (Array.isArray(s.rates) && s.rates.length === 4 && s.rates.every((r) => typeof r === "string" && r.length <= 12)) setRates(s.rates);
    if (typeof s.inflation === "string") setInflation(s.inflation);
    if (s.tax) setTax(s.tax);
    if (typeof s.cost === "string") setCost(s.cost);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const s: Saved = { capital, monthly, objective, months, compareAll, liquidity, risk, maxLoss, reserve, currency, market, rates, inflation, tax, cost };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* armazenamento indisponível: segue sem salvar */
    }
  }, [hydrated, capital, monthly, objective, months, compareAll, liquidity, risk, maxLoss, reserve, currency, market, rates, inflation, tax, cost]);

  // ---------- Indicadores oficiais (BCB) ----------
  const [macro, setMacro] = useState<Macro | null>(null);
  const [macroErr, setMacroErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/macro")
      .then((r) => r.json())
      .then((j: Macro) => { if (alive) setMacro(j); })
      .catch(() => { if (alive) setMacroErr("Sem conexão com o Banco Central agora. O simulador funciona com hipóteses."); });
    return () => { alive = false; };
  }, []);

  function useOfficialRates() {
    if (!macro) return;
    const next = [...rates];
    const origin = [...rateOrigin];
    if (macro.poupancaAnnualPct !== null && macro.poupanca) {
      next[1] = macro.poupancaAnnualPct.toFixed(2).replace(".", ",");
      origin[1] = `poupança observada em ${dateBR(macro.poupanca.referenceDate)} (BCB), mantida constante`;
    }
    if (macro.cdi) {
      next[2] = macro.cdi.value.toFixed(2).replace(".", ",");
      origin[2] = `CDI observado em ${dateBR(macro.cdi.referenceDate)} (BCB), mantido constante`;
    }
    setRates(next);
    setRateOrigin(origin);
    if (macro.ipca12m) {
      setInflation(macro.ipca12m.value.toFixed(2).replace(".", ","));
      setInflationOrigin(`IPCA 12 meses observado (ref. ${dateBR(macro.ipca12m.referenceDate)}, BCB), mantido constante`);
      setInflationTouched(true);
    }
  }

  // ---------- Cálculo (recalcula a cada mudança) ----------
  const scenarios: (NamedScenario & { valid: boolean })[] = DEFAULT_SCENARIOS.map((s, i) => {
    const r = parsePctInput(rates[i]);
    return { ...s, annualRate: r ?? 0, valid: r !== null && r > -1 && r <= 5 };
  });
  const infl = parsePctInput(inflation);
  const costRate = parsePctInput(cost) ?? 0;

  const horizonsShown = useMemo(() => {
    const set = new Set<number>(compareAll ? [...STANDARD_HORIZON_MONTHS] : []);
    set.add(months);
    return [...set].sort((a, b) => a - b);
  }, [compareAll, months]);

  const baseErrors = validateProjectionInput({ initial: capital, monthly, annualRate: 0.1, months });
  const calc = (() => {
    if (baseErrors.length) return null;
    const run = (rate: number, m: number): ProjectionResult => project({ initial: capital, monthly, annualRate: rate, months: m, inflationAnnual: infl, annualCostRate: costRate, tax });
    const main = scenarios.map((s) => (s.valid ? run(s.annualRate, months) : null));
    const table = horizonsShown.map((m) => ({ m, cols: scenarios.map((s) => (s.valid ? run(s.annualRate, m) : null)) }));
    return { main, table };
  })();

  const focus = calc?.main[chartScenario] ?? null;
  const usd = currency === "USD" && macro?.usdbrl ? macro.usdbrl.value : null;

  // ---------- Pesquisa real ----------
  const [researching, setResearching] = useState(false);
  const [researchErr, setResearchErr] = useState<string | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);

  async function research() {
    setResearching(true);
    setResearchErr(null);
    setReport(null);
    const hm = [...new Set([3, 12, 60, 120, months])].sort((a, b) => a - b);
    const body = {
      capital,
      monthlyContribution: monthly,
      objective,
      horizonMonths: compareAll ? hm : [months],
      liquidityNeed: liquidity,
      riskProfile: risk,
      maxTolerableLossPct: maxLoss,
      hasEmergencyReserve: reserve,
      regionPreference: market,
      currency,
      assumptions: inflationTouched && infl !== null ? { ipcaAnnualPct: infl * 100 } : {},
    };
    try {
      const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        const issues = json.issues ? Object.values(json.issues as Record<string, string[]>).flat().join(" ") : "";
        throw new Error(`${json.error ?? "Erro na pesquisa."} ${issues}`.trim());
      }
      const rep = await fetch(`/api/reports/${json.id}`).then((r) => r.json());
      setReport(rep as ResearchReport);
      setTimeout(() => document.getElementById("resultado-pesquisa")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setResearchErr(e instanceof TypeError ? "Erro de conexão com o servidor. Verifique sua internet e tente novamente." : e instanceof Error ? e.message : String(e));
    } finally {
      setResearching(false);
    }
  }

  function applyCustom() {
    const t = customText.trim().toLowerCase();
    const m = /^(\d+)\s*(a|ano|anos)?$/.exec(t);
    if (!m) return;
    const v = Number(m[1]) * (m[2] ? 12 : 1);
    if (v >= 1 && v <= 600) setMonths(v);
  }

  const withdraw = focus && infl !== null && withdrawPlan ? sustainableMonthlyWithdrawal(focus.finalBalance, scenarios[chartScenario].annualRate, infl) : null;

  return (
    <div className="space-y-6">
      {/* ================= ENTRADA ================= */}
      <section aria-labelledby="titulo-entrada" className="panel p-4 sm:p-6">
        <h1 id="titulo-entrada" className="text-2xl font-extrabold tracking-tight sm:text-3xl">Quanto você quer investir?</h1>
        <p className="mt-1 text-sm text-slate-400">Simule na hora com hipóteses editáveis e, quando quiser, pesquise dados reais de mercado com fonte e data.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0">
            <MoneyInput id="capital" label="Capital inicial" value={capital} onChange={setCapital} large inputRef={capitalRef}
              hint={capital === 0 ? "Capital zero: a projeção usará apenas os aportes mensais." : "Qualquer valor: R$ 500, R$ 750, R$ 10.000…"} />
            <div className="mt-1 flex flex-wrap gap-2">
              {[500, 750, 1000, 10000].map((v) => (
                <button key={v} type="button" onClick={() => setCapital(v)} className={`min-h-10 rounded-full border px-3 text-sm sm:min-h-8 sm:text-xs ${capital === v ? "border-gold-500 text-gold-400" : "border-navy-600 text-slate-300 hover:border-gold-600"}`}>{fmtBRL(v, 0)}</button>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <MoneyInput id="aporte" label="Aporte mensal" value={monthly} onChange={setMonthly} hint="Depositado no fim de cada mês." />
            <div className="mt-1 flex flex-wrap gap-2">
              {[0, 50, 250, 500].map((v) => (
                <button key={v} type="button" onClick={() => setMonthly(v)} className={`min-h-10 rounded-full border px-3 text-sm sm:min-h-8 sm:text-xs ${monthly === v ? "border-gold-500 text-gold-400" : "border-navy-600 text-slate-300 hover:border-gold-600"}`}>{v === 0 ? "sem aporte" : `${fmtBRL(v, 0)}/mês`}</button>
              ))}
            </div>
          </div>
        </div>

        <fieldset ref={horizonRef} className="mt-5" id="prazo">
          <legend className={lbl}>Prazo principal</legend>
          <div className="flex flex-wrap gap-2">
            {STANDARD_HORIZON_MONTHS.map((m) => (
              <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}
                className={`min-h-11 rounded-lg border px-3 text-sm sm:min-h-9 ${months === m ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-navy-600 text-slate-300 hover:border-gold-600"}`}>
                {formatMonths(m)}
              </button>
            ))}
            <span className="flex items-center gap-1">
              <label htmlFor="prazo-custom" className="sr-only">Prazo personalizado (meses, ou anos com a letra a)</label>
              <input id="prazo-custom" value={customText} onChange={(e) => setCustomText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCustom())}
                placeholder="ex.: 18 ou 7a" inputMode="text" className="min-h-11 w-28 rounded-lg border border-navy-600 bg-navy-900 px-2 text-base sm:min-h-9 sm:text-sm" />
              <button type="button" onClick={applyCustom} className="min-h-11 rounded-lg border border-navy-600 px-3 text-sm text-slate-300 hover:border-gold-600 sm:min-h-9">OK</button>
            </span>
          </div>
          <label className="mt-2 flex min-h-11 items-center gap-3 text-sm text-slate-300 sm:min-h-0">
            <input type="checkbox" checked={compareAll} onChange={(e) => setCompareAll(e.target.checked)} className="accent-[#d4af37]" />
            Comparar todos os horizontes (1, 3, 6 e 12 meses; 3, 5, 10, 20 e 30 anos)
          </label>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="objetivo" className={lbl}>Objetivo</label>
            <select id="objetivo" value={objective} onChange={(e) => setObjective(e.target.value as Objective)} className={field}>
              {OBJECTIVES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="liquidez" className={lbl}>Liquidez necessária</label>
            <select id="liquidez" value={liquidity} onChange={(e) => setLiquidity(e.target.value as Liquidity)} className={field}>
              <option value="imediata">Imediata</option>
              <option value="ate_30d">Até 30 dias</option>
              <option value="nao_preve">Sem necessidade de resgate no prazo</option>
            </select>
          </div>
          <div>
            <label htmlFor="risco" className={lbl}>Perfil de risco (declarado)</label>
            <select id="risco" value={risk} onChange={(e) => setRisk(e.target.value as Risk)} className={field}>
              <option value="sem_perfil">Sem perfil definido</option>
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="arrojado">Arrojado</option>
            </select>
          </div>
          <div>
            <label htmlFor="reserva" className={lbl}>Reserva de emergência</label>
            <select id="reserva" value={reserve} onChange={(e) => setReserve(e.target.value as Reserve)} className={field}>
              <option value="sem_resposta">Sem resposta</option>
              <option value="sim">Existente e separada</option>
              <option value="nao">Não tenho</option>
            </select>
          </div>
          <div>
            <label htmlFor="perda" className={lbl}>Perda máxima que aceitaria</label>
            <select id="perda" value={maxLoss === null ? "" : String(maxLoss)} onChange={(e) => setMaxLoss(e.target.value === "" ? null : Number(e.target.value))} className={field}>
              <option value="">Não informado</option>
              {[0, 5, 10, 20, 30, 50, 70].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mercado" className={lbl}>Mercado</label>
            <select id="mercado" value={market} onChange={(e) => setMarket(e.target.value as typeof market)} className={field}>
              <option value="ambos">Brasil e global</option>
              <option value="brasil">Brasil</option>
              <option value="internacional">Global</option>
            </select>
          </div>
          <div>
            <label htmlFor="moeda" className={lbl}>Moeda de exibição</label>
            <select id="moeda" value={currency} onChange={(e) => setCurrency(e.target.value as "BRL" | "USD")} className={field}>
              <option value="BRL">Real (BRL)</option>
              <option value="USD">Dólar (USD) — conversão indicativa</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Nada é presumido sobre seu perfil: o que você não informar fica como “não informado”. Orientação individualizada exigiria processo de suitability.</p>
      </section>

      {/* ================= CALCULADORA ================= */}
      <section aria-labelledby="titulo-proj" className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-proj" className="text-lg font-bold text-gold-400">Calcular projeções <StateBadge s="ESTIMATIVA_CENARIO" /></h2>
          <span className="text-xs text-slate-500">Funciona offline · recalcula a cada mudança</span>
        </div>

        <details className="mt-3 rounded-lg border border-navy-700 p-3" open>
          <summary className="cursor-pointer py-1.5 text-sm font-semibold text-slate-200">Premissas dos cenários (taxas anuais ilustrativas e editáveis)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((s, i) => (
              <div key={s.key}>
                <label htmlFor={`taxa-${s.key}`} className={lbl}>{s.label} (% a.a.)</label>
                <input id={`taxa-${s.key}`} inputMode="decimal" value={rates[i]} onChange={(e) => { const n = [...rates]; n[i] = e.target.value; setRates(n); const o = [...rateOrigin]; o[i] = "hipótese editável"; setRateOrigin(o); }}
                  className={`${field} ${s.valid ? "" : "border-red-500/70"}`} aria-invalid={!s.valid} />
                <p className="mt-1 text-[11px] text-slate-500">{s.valid ? rateOrigin[i] : "Taxa inválida"}</p>
              </div>
            ))}
            <div>
              <label htmlFor="inflacao" className={lbl}>Inflação (% a.a.)</label>
              <input id="inflacao" inputMode="decimal" value={inflation} onChange={(e) => { setInflation(e.target.value); setInflationOrigin("hipótese editável"); setInflationTouched(true); }} className={field} />
              <p className="mt-1 text-[11px] text-slate-500">{inflationOrigin}</p>
            </div>
            <div>
              <label htmlFor="imposto" className={lbl}>Regra tributária</label>
              <select id="imposto" value={tax} onChange={(e) => setTax(e.target.value as TaxMode)} className={field}>
                <option value="nao_calcular">Não calcular (mostrar bruto)</option>
                <option value="renda_fixa_regressiva">Renda fixa — IR regressivo por aporte</option>
                <option value="isento">Isento de IR (ex.: poupança, LCI/LCA)</option>
              </select>
            </div>
            <div>
              <label htmlFor="custo" className={lbl}>Custo anual informado (% a.a.)</label>
              <input id="custo" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className={field} />
              <p className="mt-1 text-[11px] text-slate-500">Ex.: custódia/administração. Informado por você.</p>
            </div>
            <div className="flex items-end">
              <button type="button" disabled={!macro?.cdi} onClick={useOfficialRates}
                className="w-full rounded-lg border border-emerald-500/50 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40">
                Usar CDI, poupança e IPCA atuais (BCB)
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {macro?.cdi && macro.ipca12m
              ? <>Referências oficiais <StateBadge s="DADO_OBSERVADO" />: CDI {fmtPct(macro.cdi.value)} a.a. ({dateBR(macro.cdi.referenceDate)}), Selic meta {macro.selicMeta ? fmtPct(macro.selicMeta.value) : "—"}, IPCA 12m {fmtPct(macro.ipca12m.value)} ({dateBR(macro.ipca12m.referenceDate)}). <a href={macro.cdi.url} target="_blank" rel="noopener noreferrer nofollow" className="text-electric-400 hover:underline">Fonte: Banco Central (SGS)</a>. Taxas atuais mantidas no futuro continuam sendo hipótese.</>
              : macroErr ?? "Consultando indicadores oficiais do Banco Central…"}
          </p>
        </details>

        {baseErrors.length > 0 ? (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{baseErrors.join(" ")}</p>
        ) : focus ? (
          <>
            <p className="mt-5 text-sm text-slate-300">
              Com <strong>{fmtBRL(capital)}</strong> iniciais{monthly > 0 && <> e <strong>{fmtBRL(monthly)}/mês</strong></>}, em <strong>{formatMonths(months)}</strong>, no cenário{" "}
              <label htmlFor="cenario-foco" className="sr-only">Cenário em destaque</label>
              <select id="cenario-foco" value={chartScenario} onChange={(e) => setChartScenario(Number(e.target.value))} className="mt-1 min-h-10 max-w-full rounded border border-navy-600 bg-navy-900 px-2 text-base text-gold-400 sm:mt-0 sm:min-h-0 sm:py-0.5 sm:text-sm">
                {scenarios.map((s, i) => <option key={s.key} value={i}>{s.label.toLowerCase()} ({rates[i]}% a.a.)</option>)}
              </select>:
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
              <Card label="Total investido" value={fmtBRL(focus.totalInvested)} sub={`${fmtBRL(capital)} + ${monthly > 0 ? `${months} × ${fmtBRL(monthly)}` : "sem aportes"}`} usd={usd ? focus.totalInvested / usd : null} />
              <Card label="Patrimônio final estimado (bruto)" value={fmtBRL(focus.finalBalance)} highlight usd={usd ? focus.finalBalance / usd : null} />
              <Card label="Lucro bruto estimado" value={fmtBRL(focus.grossGain)} sub={fmtPct(focus.grossGainPct * 100) + " sobre o investido"} tone={focus.grossGain < 0 ? "neg" : "pos"} />
              <Card label="Impostos e custos" value={focus.tax.status === "nao_calculado" ? "Impostos não calculados" : fmtBRL((focus.tax.ir ?? 0) + (focus.tax.iof ?? 0) + focus.costs)}
                sub={focus.tax.status === "nao_calculado" ? (focus.costs > 0 ? `Custos informados: ${fmtBRL(focus.costs)}` : "Escolha a regra tributária acima") : `IR ${fmtBRL(focus.tax.ir)} · IOF ${fmtBRL(focus.tax.iof)} · custos ${fmtBRL(focus.costs)}`} />
              <Card label="Patrimônio líquido estimado" value={focus.netBalance === null ? "—" : fmtBRL(focus.netBalance)} sub={focus.netBalance === null ? "Só aparece quando os impostos são calculados" : "Após IR/IOF e custos informados"} />
              <Card label="Em poder de compra de hoje" value={fmtBRL(focus.realNetBalance ?? focus.realBalance)} sub={infl === null ? "Informe a inflação" : `Inflação ${inflation}% a.a. (${focus.realNetBalance !== null ? "líquido" : "bruto"})`} />
              <div className="col-span-2 rounded-xl border border-navy-700 bg-navy-900/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Renda passiva</p>
                <p className="mt-1 text-sm text-slate-200">Esta simulação genérica <strong>não gera renda distribuída</strong>: os ganhos ficam acumulados. Renda real depende do produto (cupons, proventos), e não é garantida.</p>
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={withdrawPlan} onChange={(e) => setWithdrawPlan(e.target.checked)} className="accent-[#d4af37]" />
                  Simular um plano de retiradas que preserva o poder de compra
                </label>
                {withdrawPlan && (
                  <p className="mt-1 text-sm">
                    {withdraw === null ? <span className="text-amber-300">Sem juro real positivo neste cenário: qualquer retirada consumiria o principal.</span>
                      : <>Saque mensal hipotético: <strong className="text-gold-400">{fmtBRL(withdraw)}</strong> ({fmtBRL(withdraw * 12)}/ano). É <strong>saque</strong> do rendimento real, não pagamento do produto.</>}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <GrowthChart schedule={focus.schedule} label={`Cenário ${scenarios[chartScenario].label.toLowerCase()}, ${rates[chartScenario]}% a.a.`} />
            </div>

            <h3 className="mt-6 text-sm font-semibold text-slate-200">Comparação por prazo e cenário (patrimônio bruto estimado)</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="data sticky-first w-full min-w-[640px]">
                <thead>
                  <tr><th>Prazo</th><th>Total investido</th>{scenarios.map((s, i) => <th key={s.key}>{s.label}<span className="block text-[10px] normal-case text-slate-500">{rates[i]}% a.a.</span></th>)}</tr>
                </thead>
                <tbody>
                  {calc!.table.map((row) => (
                    <tr key={row.m} className={row.m === months ? "bg-gold-500/5" : ""}>
                      <td className="whitespace-nowrap font-semibold">{formatMonths(row.m)}</td>
                      <td className="tabular-nums">{fmtBRL(row.cols[0]?.totalInvested ?? capital + monthly * row.m)}</td>
                      {row.cols.map((c, i) => (
                        <td key={i} className="tabular-nums">
                          {c ? <>{fmtBRL(c.finalBalance)}<span className={`block text-[11px] ${c.grossGain < 0 ? "text-red-300" : "text-emerald-400"}`}>{c.grossGain >= 0 ? "+" : ""}{fmtBRL(c.grossGain)}</span></> : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer py-2.5 text-sm text-electric-400">Ver tabela {focus.months <= 24 ? "mês a mês" : "ano a ano"} (principal × juros)</summary>
              <div className="mt-2 max-h-96 overflow-auto">
                <table className="data w-full">
                  <thead><tr><th>{focus.months <= 24 ? "Mês" : "Ano"}</th><th>Principal acumulado</th><th>Juros/acréscimos</th><th>Patrimônio</th></tr></thead>
                  <tbody>
                    {focus.schedule.filter((p) => p.month > 0 && (focus.months <= 24 || p.month % 12 === 0 || p.month === focus.months)).map((p) => (
                      <tr key={p.month}>
                        <td>{focus.months <= 24 ? p.month : (p.month / 12).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                        <td className="tabular-nums">{fmtBRL(p.invested)}</td>
                        <td className={`tabular-nums ${p.gains < 0 ? "text-red-300" : "text-emerald-400"}`}>{fmtBRL(p.gains)}</td>
                        <td className="tabular-nums font-semibold">{fmtBRL(p.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="mt-3 text-xs text-slate-500">
              Fórmula: i = (1+r)^(1/12) − 1; FV = P·(1+i)^n + A·((1+i)^n − 1)/i, aporte no fim de cada mês. Cenários são ilustrativos, não probabilidades calculadas nem promessa de retorno.
              Para produtos reais (Tesouro, poupança, cripto) use “Pesquisar oportunidades agora”.
            </p>
          </>
        ) : null}
      </section>

      {/* ================= PESQUISA REAL ================= */}
      {withResearch && (
        <section aria-labelledby="titulo-pesquisa" className="panel p-4 sm:p-6">
          <h2 id="titulo-pesquisa" className="text-lg font-bold text-gold-400">Pesquisar oportunidades reais</h2>
          <p className="mt-1 text-sm text-slate-400">Consulta ao vivo: Banco Central, Tesouro Transparente (Tesouro Direto) e Kraken. Mostra fonte, data, mínimos, liquidez, impostos e onde verificar a oferta. Nenhuma ordem é executada.</p>
          <button type="button" onClick={research} disabled={researching || baseErrors.length > 0}
            className="mt-4 w-full rounded-xl bg-gold-500 px-6 py-4 text-lg font-extrabold tracking-wide text-navy-950 hover:bg-gold-400 disabled:opacity-60">
            {researching ? "Pesquisando fontes oficiais…" : "Pesquisar oportunidades agora"}
          </button>
          {researching && <p aria-live="polite" className="mt-3 text-sm text-gold-400">Consultando Banco Central, Tesouro Transparente e Kraken. Normalmente leva de 2 a 6 segundos.</p>}
          {researchErr && <p role="alert" className="mt-3 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{researchErr}</p>}
        </section>
      )}

      {report && (
        <div id="resultado-pesquisa" className="scroll-mt-28">
          <ResearchResults
            report={report}
            onChangeValue={() => { capitalRef.current?.focus(); capitalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            onChangeTerm={() => horizonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          />
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub, highlight, tone, usd }: { label: string; value: string; sub?: string; highlight?: boolean; tone?: "pos" | "neg"; usd?: number | null }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${highlight ? "border-gold-600 bg-gold-500/5" : "border-navy-700 bg-navy-900/60"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-lg font-bold tabular-nums sm:text-xl ${highlight ? "text-gold-400" : tone === "neg" ? "text-red-300" : tone === "pos" ? "text-emerald-400" : "text-slate-50"}`}>{value}</p>
      {usd !== null && usd !== undefined && <p className="text-xs text-slate-400">≈ {usd.toLocaleString("pt-BR", { style: "currency", currency: "USD" })} (dólar BCB, indicativo)</p>}
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
