"use client";

import { useState } from "react";
import { useLatestReport } from "@/lib/client-store";

interface Msg { role: "user" | "mentor"; text: string; meta?: string }

export function MentorChat({ configured }: { configured: boolean }) {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const latest = useLatestReport();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const question = q.trim();
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/mentor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, report: latest ?? undefined }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro");
      const meta = [`ferramentas: ${j.toolCalls.map((t: { name: string }) => t.name).join(", ") || "nenhuma"}`, j.filters ? `parâmetros sugeridos: ${JSON.stringify(j.filters)}` : ""].filter(Boolean).join(" · ");
      setMsgs((m) => [...m, { role: "mentor", text: j.answer, meta }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "mentor", text: err instanceof Error ? err.message : String(err) }]);
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="font-semibold">Mentor IA não configurado nesta instalação.</p>
        <p className="mt-1">Para ativar: defina <code>ANTHROPIC_API_KEY</code> (e opcionalmente <code>ANTHROPIC_MODEL</code>) no arquivo <code>.env.local</code> do servidor e reinicie. A chave nunca vai para o navegador. O simulador e a pesquisa real funcionam sem IA.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="space-y-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 text-sm ${m.role === "user" ? "ml-8 bg-navy-700" : "mr-8 border border-navy-600 bg-navy-900"}`}>
            <p className="whitespace-pre-wrap">{m.text}</p>
            {m.meta && <p className="mt-2 text-[11px] text-slate-500">{m.meta}</p>}
          </div>
        ))}
        {busy && <p className="text-sm text-gold-400">Consultando dados e calculando…</p>}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <label htmlFor="pergunta" className="sr-only">Sua pergunta</label>
        <input id="pergunta" value={q} onChange={(e) => setQ(e.target.value)} maxLength={800} placeholder="Ex.: Tenho R$ 750 e posso guardar R$ 250 por mês. O que comparar para 1 e 10 anos?"
          className="min-w-0 flex-1 rounded-lg border border-navy-600 bg-navy-900 px-3 py-2" />
        <button disabled={busy} className="rounded-lg bg-gold-500 px-4 py-2 font-semibold text-navy-950 disabled:opacity-60">Perguntar</button>
      </form>
    </div>
  );
}
