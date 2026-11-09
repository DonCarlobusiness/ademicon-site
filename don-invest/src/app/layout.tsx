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
  { href: "/dashboard", label: "Painel" },
  { href: "/pesquisar", label: "Pesquisar" },
  { href: "/ativos", label: "Ativos" },
  { href: "/instituicoes", label: "Instituições" },
  { href: "/configuracoes", label: "Fontes & Config." },
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
            <Link href="/dashboard" aria-label="DON INVEST — painel">
              <Brand />
            </Link>
            <nav aria-label="Principal" className="flex flex-wrap gap-1 text-sm">
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
          Horários exibidos em America/Bahia. Confirme sempre nas fontes oficiais.
        </footer>
      </body>
    </html>
  );
}
