"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const NAV = [
  { href: "/", label: "Início", short: "Início", icon: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/pesquisar", label: "Pesquisar investimentos", short: "Pesquisar", icon: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4.3-4.3" },
  { href: "/simulador", label: "Simulador", short: "Simulador", icon: "M4 19h16M7 16V9m5 7V5m5 11v-4" },
  { href: "/carteira", label: "Minha carteira", short: "Carteira", icon: "M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2" },
  { href: "/instituicoes", label: "Bancos e corretoras", short: "Bancos", icon: "M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M2 21h20M12 3l9 5H3z" },
  { href: "/mentor", label: "Mentor IA", short: "Mentor", icon: "M4 5h16v11H8l-4 4z" },
  { href: "/academy", label: "Academy", short: "Academy", icon: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5" },
];

const PRIMARY_MOBILE = ["/", "/pesquisar", "/simulador", "/mentor"];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Menu completo no desktop (cabeçalho). */
export function DesktopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="hidden flex-wrap gap-1 text-sm lg:flex">
      {NAV.map((n) => {
        const active = isActive(path, n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 ${active ? "bg-navy-800 text-gold-400" : "text-slate-300 hover:bg-navy-800 hover:text-gold-400"}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior no celular com os destinos principais + “Mais”. */
export function MobileTabBar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const primary = NAV.filter((n) => PRIMARY_MOBILE.includes(n.href));
  const more = NAV.filter((n) => !PRIMARY_MOBILE.includes(n.href));
  const moreActive = more.some((n) => isActive(path, n.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-navy-600 bg-navy-900 px-4 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-navy-600" aria-hidden />
            <ul className="divide-y divide-navy-700">
              {more.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={`flex min-h-12 items-center gap-3 px-1 text-base ${isActive(path, n.href) ? "text-gold-400" : "text-slate-200"}`}>
                    <Icon d={n.icon} /> {n.label}
                  </Link>
                </li>
              ))}
              <li><Link href="/dashboard" className="flex min-h-12 items-center gap-3 px-1 text-base text-slate-200">Histórico de pesquisas</Link></li>
              <li><Link href="/configuracoes" className="flex min-h-12 items-center gap-3 px-1 text-base text-slate-200">Fontes e configurações</Link></li>
            </ul>
          </div>
        </div>
      )}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-navy-700 bg-navy-950/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <ul className="grid grid-cols-5">
          {primary.map((n) => {
            const active = isActive(path, n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "text-gold-400" : "text-slate-400"}`}>
                  <Icon d={n.icon} />{n.short}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] ${open || moreActive ? "text-gold-400" : "text-slate-400"}`}>
              <Icon d="M5 12h.01M12 12h.01M19 12h.01" />Mais
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
