import Link from "next/link";

export function Loading() {
  return <p className="panel p-6 text-sm text-slate-400">Carregando…</p>;
}

export function NoResearchYet({ what }: { what: string }) {
  return (
    <div className="panel p-6">
      <h1 className="text-xl font-bold">Nenhuma pesquisa neste navegador ainda</h1>
      <p className="mt-2 text-sm text-slate-400">{what} aparece depois que você faz uma pesquisa. O histórico fica salvo neste dispositivo.</p>
      <Link href="/" className="mt-4 inline-block rounded-lg bg-gold-500 px-4 py-2 font-semibold text-navy-950">Pesquisar oportunidades agora</Link>
    </div>
  );
}
