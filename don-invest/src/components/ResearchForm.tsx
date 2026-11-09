"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReportLocal } from "@/lib/client-store";

type Horizon = "curto" | "medio" | "longo" | "indefinido";

const HORIZONS: { v: Horizon; l: string; d: string }[] = [
  { v: "curto", l: "Curto", d: "até 12 meses" },
  { v: "medio", l: "Médio", d: "1–5 anos" },
  { v: "longo", l: "Longo", d: "mais de 5 anos" },
  { v: "indefinido", l: "Ainda não sei", d: "conclusões condicionadas" },
];

const STEPS = [
  "Consultando Banco Central (Selic, CDI, IPCA, dólar, poupança)…",
  "Baixando taxas oficiais do Tesouro Direto (Tesouro Transparente)…",
  "Consultando dados públicos da Kraken (BTC, ETH)…",
  "Validando datas, consistência entre fontes e cálculos…",
  "Calculando custos, impostos, riscos e cenários…",
];

interface ManualOfferForm {
  name: string;
  institution: string;
  pctOfCdi: string;
  minimum: string;
  liquidity: string;
  taxExempt: boolean;
  url: string;
}

const field = "w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-gold-500";
const label = "mb-1 block text-sm font-medium text-slate-300";

export function ResearchForm() {
  const router = useRouter();
  const [capital, setCapital] = useState("");
  const [monthly, setMonthly] = useState("");
  const [reserve, setReserve] = useState<"sim" | "nao" | "parcial" | "sem_resposta">("sem_resposta");
  const [objective, setObjective] = useState("renda_passiva");
  const [horizons, setHorizons] = useState<Horizon[]>(["curto", "longo"]);
  const [liquidity, setLiquidity] = useState("nao_preve");
  const [experience, setExperience] = useState("nao_informado");
  const [riskProfile, setRiskProfile] = useState("sem_perfil");
  const [debt, setDebt] = useState(false);
  const [lossReaction, setLossReaction] = useState("nao_sei");
  const [maxLoss, setMaxLoss] = useState<number | null>(null);
  const [region, setRegion] = useState("ambos");
  const [taxResidence, setTaxResidence] = useState("brasil");
  const [institutions, setInstitutions] = useState("");
  const [ipca, setIpca] = useState("");
  const [selic, setSelic] = useState("");
  const [offer, setOffer] = useState<ManualOfferForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function demo() {
    setCapital("R$ 750,00");
    setMonthly("");
    setReserve("sim");
    setObjective("renda_passiva");
    setHorizons(["curto", "longo"]);
    setLiquidity("nao_preve");
    setLossReaction("nao_sei");
    setMaxLoss(null);
  }

  function toggleH(h: Horizon) {
    setHorizons((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!capital.trim()) return setError("Informe o capital disponível.");
    if (horizons.length === 0) return setError("Escolha ao menos um prazo.");
    setLoading(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 900);
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(",", ".")));
    const body = {
      capital,
      monthlyContribution: monthly || 0,
      hasEmergencyReserve: reserve,
      objective,
      horizons,
      liquidityNeed: liquidity,
      experience,
      hasExpensiveDebt: debt,
      lossReaction,
      maxTolerableLossPct: maxLoss,
      riskProfile,
      regionPreference: region,
      taxResidence,
      institutions: institutions.split(",").map((s) => s.trim()).filter(Boolean),
      assumptions: { ipcaAnnualPct: num(ipca), selicAnnualPct: num(selic) },
      manualOffers: offer && offer.name && offer.institution
        ? [{
            name: offer.name,
            institution: offer.institution,
            rateDescription: offer.pctOfCdi ? `${offer.pctOfCdi}% do CDI` : "não informado",
            pctOfCdi: num(offer.pctOfCdi) ?? null,
            minimum: num(offer.minimum.replace(/R\$|\s|\./g, "")) ?? null,
            liquidity: offer.liquidity,
            taxExempt: offer.taxExempt,
            url: offer.url || undefined,
          }]
        : [],
    };
    try {
      const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        const issues = json.issues ? Object.entries(json.issues).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join(" · ") : "";
        throw new Error(`${json.error ?? "Erro"} ${issues}`);
      }
      saveReportLocal(json.report);
      router.push(`/relatorios/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" aria-busy={loading}>
      <div className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="capital" className={label}>Capital disponível agora (BRL) *</label>
            <input id="capital" inputMode="decimal" autoComplete="off" placeholder="R$ 750,00" value={capital} onChange={(e) => setCapital(e.target.value)} className={`${field} text-2xl font-bold`} required />
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="monthly" className={label}>Aporte mensal (opcional)</label>
            <input id="monthly" inputMode="decimal" placeholder="R$ 0" value={monthly} onChange={(e) => setMonthly(e.target.value)} className={field} />
          </div>
          <button type="button" onClick={demo} className="rounded-lg border border-navy-600 px-3 py-2 text-sm text-slate-300 hover:border-gold-500">
            Preencher exemplo (R$ 750, renda passiva)
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className={label}>Prazo da parcela a investir (pode marcar mais de um) *</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HORIZONS.map((h) => (
              <label key={h.v} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${horizons.includes(h.v) ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-navy-600 text-slate-300"}`}>
                <input type="checkbox" className="sr-only" checked={horizons.includes(h.v)} onChange={() => toggleH(h.v)} />
                <span className="font-semibold">{h.l}</span> <span className="block text-xs text-slate-400">{h.d}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="objective" className={label}>Objetivo</label>
            <select id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} className={field}>
              <option value="renda_passiva">Renda passiva</option>
              <option value="crescimento">Crescimento patrimonial</option>
              <option value="imovel">Comprar imóvel</option>
              <option value="aposentadoria">Aposentadoria</option>
              <option value="liberdade_financeira">Liberdade financeira</option>
              <option value="preservacao">Preservação de capital</option>
              <option value="compra_planejada">Compra planejada</option>
              <option value="misto">Misto</option>
            </select>
          </div>
          <div>
            <label htmlFor="reserve" className={label}>Já tem reserva de emergência separada?</label>
            <select id="reserve" value={reserve} onChange={(e) => setReserve(e.target.value as typeof reserve)} className={field}>
              <option value="sem_resposta">Sem resposta</option>
              <option value="sim">Sim, separada</option>
              <option value="parcial">Parcial</option>
              <option value="nao">Não</option>
            </select>
          </div>
          <div>
            <label htmlFor="liquidity" className={label}>Pode precisar resgatar?</label>
            <select id="liquidity" value={liquidity} onChange={(e) => setLiquidity(e.target.value)} className={field}>
              <option value="nao_preve">Não prevejo</option>
              <option value="em_ate_12m">Talvez em até 12 meses</option>
              <option value="ate_30d">Em até 30 dias</option>
              <option value="imediata">A qualquer momento</option>
            </select>
          </div>
        </div>
      </div>

      <details className="panel p-4 sm:p-6">
        <summary className="cursor-pointer font-semibold text-gold-400">Perfil preliminar, preferências e premissas (opcional)</summary>
        <p className="mt-2 text-xs text-slate-400">Questionário preliminar — não é suitability certificada.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="lossReaction" className={label}>Se o investimento caísse 20% em um mês, você…</label>
            <select id="lossReaction" value={lossReaction} onChange={(e) => setLossReaction(e.target.value)} className={field}>
              <option value="nao_sei">Não sei</option>
              <option value="venderia_tudo">Venderia tudo</option>
              <option value="esperaria">Esperaria</option>
              <option value="aportaria_mais">Aportaria mais</option>
            </select>
          </div>
          <div>
            <label htmlFor="maxLoss" className={label}>Perda máxima que aceitaria</label>
            <select id="maxLoss" value={maxLoss === null ? "" : String(maxLoss)} onChange={(e) => setMaxLoss(e.target.value === "" ? null : Number(e.target.value))} className={field}>
              <option value="">Não informado</option>
              {[0, 5, 10, 20, 30, 50, 70].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="experience" className={label}>Experiência com investimentos</label>
            <select id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} className={field}>
              <option value="nao_informado">Não informado</option>
              <option value="nenhuma">Nenhuma</option>
              <option value="basica">Básica</option>
              <option value="intermediaria">Intermediária</option>
              <option value="avancada">Avançada</option>
            </select>
          </div>
          <div>
            <label htmlFor="riskProfile" className={label}>Perfil de risco (declarado)</label>
            <select id="riskProfile" value={riskProfile} onChange={(e) => setRiskProfile(e.target.value)} className={field}>
              <option value="sem_perfil">Sem perfil definido</option>
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="arrojado">Arrojado</option>
            </select>
          </div>
          <div>
            <label htmlFor="region" className={label}>Preferência</label>
            <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className={field}>
              <option value="ambos">Brasil e internacional</option>
              <option value="brasil">Brasil</option>
              <option value="internacional">Internacional</option>
            </select>
          </div>
          <div>
            <label htmlFor="taxResidence" className={label}>Residência fiscal</label>
            <select id="taxResidence" value={taxResidence} onChange={(e) => setTaxResidence(e.target.value)} className={field}>
              <option value="brasil">Brasil</option>
              <option value="exterior">Exterior</option>
            </select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={debt} onChange={(e) => setDebt(e.target.checked)} className="accent-[#d4af37]" />
            Tenho dívidas caras (cartão rotativo, cheque especial…)
          </label>
          <div className="sm:col-span-3">
            <label htmlFor="institutions" className={label}>Instituições onde já tem conta (separadas por vírgula)</label>
            <input id="institutions" value={institutions} onChange={(e) => setInstitutions(e.target.value)} className={field} placeholder="ex.: Banco X, Corretora Y" />
          </div>
          <div>
            <label htmlFor="ipca" className={label}>Hipótese de IPCA (% a.a.)</label>
            <input id="ipca" inputMode="decimal" value={ipca} onChange={(e) => setIpca(e.target.value)} className={field} placeholder="padrão: IPCA 12m oficial" />
          </div>
          <div>
            <label htmlFor="selic" className={label}>Hipótese de Selic média (% a.a.)</label>
            <input id="selic" inputMode="decimal" value={selic} onChange={(e) => setSelic(e.target.value)} className={field} placeholder="padrão: Selic efetiva atual" />
          </div>
        </div>

        <div className="mt-6 border-t border-navy-700 pt-4">
          <p className="text-sm font-semibold text-slate-200">Oferta bancária que você encontrou (opcional)</p>
          <p className="text-xs text-slate-400">Será marcada como <strong>entrada manual — não verificada</strong>.</p>
          {offer ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input aria-label="Nome do produto" className={field} placeholder="Produto (ex.: CDB liquidez diária)" value={offer.name} onChange={(e) => setOffer({ ...offer, name: e.target.value })} />
              <input aria-label="Instituição" className={field} placeholder="Instituição" value={offer.institution} onChange={(e) => setOffer({ ...offer, institution: e.target.value })} />
              <input aria-label="Percentual do CDI" className={field} inputMode="decimal" placeholder="% do CDI (ex.: 102)" value={offer.pctOfCdi} onChange={(e) => setOffer({ ...offer, pctOfCdi: e.target.value })} />
              <input aria-label="Mínimo" className={field} inputMode="decimal" placeholder="Mínimo (R$)" value={offer.minimum} onChange={(e) => setOffer({ ...offer, minimum: e.target.value })} />
              <input aria-label="Liquidez" className={field} placeholder="Liquidez (ex.: diária)" value={offer.liquidity} onChange={(e) => setOffer({ ...offer, liquidity: e.target.value })} />
              <input aria-label="URL da oferta" className={field} placeholder="https://… (página oficial)" value={offer.url} onChange={(e) => setOffer({ ...offer, url: e.target.value })} />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={offer.taxExempt} onChange={(e) => setOffer({ ...offer, taxExempt: e.target.checked })} /> Isenta de IR (LCI/LCA)
              </label>
              <button type="button" onClick={() => setOffer(null)} className="text-left text-sm text-red-300 hover:underline">Remover oferta</button>
            </div>
          ) : (
            <button type="button" onClick={() => setOffer({ name: "", institution: "", pctOfCdi: "", minimum: "", liquidity: "", taxExempt: false, url: "" })} className="mt-2 text-sm text-electric-400 hover:underline">
              + Adicionar oferta manual
            </button>
          )}
        </div>
      </details>

      {error && <p role="alert" className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 px-6 py-4 text-lg font-extrabold tracking-wide text-navy-950 shadow-lg shadow-gold-500/20 hover:brightness-110 disabled:opacity-60">
        {loading ? "PESQUISANDO…" : "PESQUISAR OPORTUNIDADES AGORA"}
      </button>

      {loading && (
        <ol aria-live="polite" className="panel space-y-1 p-4 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? "text-emerald-400" : i === step ? "text-gold-400" : "text-slate-500"}>
              {i < step ? "✓" : i === step ? "…" : "○"} {s}
            </li>
          ))}
          <li className="pt-2 text-xs text-slate-500">As etapas acima indicam o que o servidor executa; o status real de cada fonte aparece no relatório.</li>
        </ol>
      )}
    </form>
  );
}
