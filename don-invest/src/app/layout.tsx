import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Brand } from "@/components/Brand";
import { DesktopNav, MobileTabBar } from "@/components/Nav";

export const metadata: Metadata = {
  title: "DON INVEST — pesquisa de investimentos com dados verificáveis",
  description: "Pesquisa e comparação de oportunidades de investimento com fontes oficiais, custos, riscos e trilha de evidências.",
  applicationName: "DON INVEST",
  appleWebApp: { capable: true, title: "DON INVEST", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#050a16", width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-gold-500 focus:px-3 focus:py-1 focus:text-navy-950">
          Pular para o conteúdo
        </a>
        <header className="border-b border-navy-700 bg-navy-950/90 backdrop-blur lg:sticky lg:top-0 lg:z-40" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 py-3" style={{ paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))", paddingRight: "max(1rem, env(safe-area-inset-right, 0px))" }}>
            <Link href="/" aria-label="DON INVEST — início" className="min-w-0">
              <Brand />
            </Link>
            <DesktopNav />
          </div>
        </header>
        <main id="conteudo" className="mx-auto max-w-7xl py-5 md:py-6" style={{ paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))", paddingRight: "max(1rem, env(safe-area-inset-right, 0px))" }}>
          {children}
        </main>
        <footer className="mx-auto max-w-7xl px-4 pb-28 pt-4 text-xs leading-relaxed text-slate-500 lg:pb-10">
          DON INVEST é ferramenta de pesquisa, educação e comparação de dados — não é consultoria de valores mobiliários individualizada (Res. CVM 19/20) e não executa ordens.
          Horários exibidos em America/Bahia. Confirme sempre nas fontes oficiais.{" "}
          <Link href="/dashboard" className="inline-block py-2 underline hover:text-slate-300">Histórico de pesquisas</Link> ·{" "}
          <Link href="/ativos" className="inline-block py-2 underline hover:text-slate-300">Ativos</Link> ·{" "}
          <Link href="/configuracoes" className="inline-block py-2 underline hover:text-slate-300">Fontes e configurações</Link>
        </footer>
        <MobileTabBar />
      </body>
    </html>
  );
}
