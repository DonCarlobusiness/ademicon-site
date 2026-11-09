"use client";

import { useState } from "react";

interface Health {
  checkedAt: string;
  providers: { provider: string; label: string; status: string; circuit: string; lastError?: string; lastSuccessAt?: string; checkedLive: boolean }[];
}

export function HealthPanel({ initial }: { initial: Health }) {
  const [h, setH] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const res = await fetch("/api/health?live=1");
      setH(await res.json());
    } finally {
      setBusy(false);
    }
  }
  const tone = (s: string) => (s === "ok" ? "text-emerald-400" : s === "parcial" ? "text-amber-300" : s === "nao_configurado" ? "text-slate-400" : "text-red-300");
  return (
    <div>
      <button onClick={check} disabled={busy} className="mb-4 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">{busy ? "Testando conexões…" : "Testar conexões agora (consulta real)"}</button>
      <ul className="space-y-2 text-sm">
        {h.providers.map((p) => (
          <li key={p.provider} className="rounded-lg border border-navy-700 p-3">
            <span className="font-semibold">{p.label}</span> — <span className={tone(p.status)}>{p.status === "nao_configurado" ? "não configurado" : p.status}</span>
            <span className="text-xs text-slate-500"> · circuito {p.circuit}{p.lastSuccessAt ? ` · último sucesso ${new Date(p.lastSuccessAt).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}` : ""}{p.checkedLive ? " · testado agora" : " · estado em memória"}</span>
            {p.lastError && <p className="mt-1 text-xs text-slate-400">{p.lastError}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
