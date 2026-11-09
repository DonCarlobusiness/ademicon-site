import type { EvidenceState } from "@/lib/analysis/types";

const MAP: Record<EvidenceState, { label: string; cls: string; title: string }> = {
  DADO_OBSERVADO: { label: "dado observado", cls: "border-emerald-500/60 text-emerald-300", title: "Valor obtido de fonte oficial/pública nesta pesquisa, com data e link." },
  ESTIMATIVA_CENARIO: { label: "estimativa", cls: "border-electric-500/60 text-electric-400", title: "Cálculo sob hipóteses visíveis e editáveis. Não é promessa." },
  INFORMADO_USUARIO: { label: "informado por você", cls: "border-gold-600 text-gold-400", title: "Dado fornecido por você, não verificado pelo sistema." },
  INDISPONIVEL: { label: "indisponível", cls: "border-slate-600 text-slate-400", title: "Sem dado ou cálculo confiável." },
};

export function StateBadge({ s }: { s: EvidenceState }) {
  const m = MAP[s];
  return (
    <span title={m.title} className={`inline-flex whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}
