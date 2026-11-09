"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABELS: Record<string, string> = {
  risco: "Segurança",
  liquidez: "Liquidez",
  custo: "Custo",
  prazo: "Prazo",
  retorno: "Retorno (cenário)",
  cambio: "Câmbio",
  dados: "Dados",
};

export function WeightsEditor({ input, horizon, weights }: { input: Record<string, unknown>; horizon: string; weights: Record<string, number> }) {
  const router = useRouter();
  const [w, setW] = useState<Record<string, number>>(() => Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Math.round(v * 100)])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function recalc() {
    setBusy(true);
    setErr(null);
    const prev = (input.weights as Record<string, unknown>) ?? {};
    const body = { ...input, weights: { ...prev, [horizon]: Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / 100])) } };
    try {
      const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      router.push(`/relatorios/${json.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <details className="mt-3 rounded-lg border border-navy-700 p-3">
      <summary className="cursor-pointer text-sm text-electric-400">Editar pesos deste horizonte e refazer a pesquisa</summary>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.keys(w).map((k) => (
          <label key={k} className="text-xs text-slate-300">
            {LABELS[k] ?? k}: <strong>{w[k]}</strong>
            <input type="range" min={0} max={50} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="w-full accent-[#d4af37]" />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Os pesos são normalizados para somar 100%. Uma nova pesquisa é feita com dados atualizados.</p>
      {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
      <button type="button" disabled={busy} onClick={recalc} className="mt-2 rounded-lg bg-navy-700 px-3 py-1.5 text-sm text-gold-400 hover:bg-navy-600 disabled:opacity-50">
        {busy ? "Recalculando…" : "Recalcular"}
      </button>
    </details>
  );
}
