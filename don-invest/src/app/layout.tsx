import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Brand } from "@/components/Brand";

export const metadata: Metadata = {
  title: "DON INVEST — pesquisa de investimentos com dados verificáveis",
  description: "Pesquisa e comparação de oportunidades de investimento com fontes oficiais, custos, riscos e trilha de evidências.",
};

export const viewport: Viewport = { themeColor: "#050a16", width: "device-width", initialScale: 1 };

const NAV = [
  { href: "/", label: "Início" },
  { href: "/pesquisar", label: "Pesquisar investimentos" },
  { href: "/simulador", label: "Simulador" },
  { href: "/carteira", label: "Minha carteira" },
  { href: "/instituicoes", label: "Bancos e corretoras" },
  { href: "/mentor", label: "Mentor IA" },
  { href: "/academy", label: "Academy" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-gold-500 focus:px-3 focus:py-1 focus:text-navy-950">
          Pular para o conteúdo
        </a>
        <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" aria-label="DON INVEST — início">
              <Brand />
            </Link>
            <nav aria-label="Principal" className="-mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 text-sm whitespace-nowrap md:mx-0 md:w-auto md:flex-wrap md:px-0">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-navy-800 hover:text-gold-400">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main id="conteudo" className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 text-xs leading-relaxed text-slate-500">
          DON INVEST é ferramenta de pesquisa, educação e comparação de dados — não é consultoria de valores mobiliários individualizada (Res. CVM 19/20) e não executa ordens.
          Horários exibidos em America/Bahia. Confirme sempre nas fontes oficiais.{" "}
          <Link href="/dashboard" className="underline hover:text-slate-300">Histórico de pesquisas</Link> ·{" "}
          <Link href="/ativos" className="underline hover:text-slate-300">Ativos</Link> ·{" "}
          <Link href="/configuracoes" className="underline hover:text-slate-300">Fontes e configurações</Link>
        </footer>
      </body>
    </html>
  );
}
