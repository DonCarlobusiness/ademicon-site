"use client";

import { useEffect, useRef, useState } from "react";
import type { SchedulePoint } from "@/lib/finance/projection";
import { fmtBRL } from "@/lib/format";

/** Evolução do patrimônio: área do total investido (principal) e área dos juros/acréscimos. */
export function GrowthChart({ schedule, label }: { schedule: SchedulePoint[]; label: string }) {
  // Mede a largura real para que 1 unidade do SVG = 1 px: rótulos legíveis no celular e no desktop.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 220 : 260, L = W < 480 ? 58 : 72, R = 12, T = 12, B = 28;
  const n = schedule.length - 1;
  if (n < 1) return null;
  const maxV = Math.max(...schedule.map((p) => Math.max(p.balance, p.invested)), 1);
  const minV = Math.min(0, ...schedule.map((p) => p.balance));
  const x = (m: number) => L + (m / n) * (W - L - R);
  const y = (v: number) => T + (1 - (v - minV) / (maxV - minV)) * (H - T - B);
  const pts = (f: (p: SchedulePoint) => number) => schedule.map((p) => `${x(p.month).toFixed(1)},${y(f(p)).toFixed(1)}`).join(" ");
  const base = y(Math.max(0, minV));
  const investedArea = `${x(0)},${base} ${pts((p) => p.invested)} ${x(n)},${base}`;
  const balanceArea = `${pts((p) => p.balance)} ${[...schedule].reverse().map((p) => `${x(p.month).toFixed(1)},${y(p.invested).toFixed(1)}`).join(" ")}`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => minV + f * (maxV - minV));
  const xt = W < 480 ? [0, n] : [0, Math.round(n / 2), n];
  const last = schedule[n];
  return (
    <figure ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto max-w-full" role="img" aria-label={`Gráfico: ${label}. Patrimônio final ${fmtBRL(last.balance)}, investido ${fmtBRL(last.invested)}.`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#233561" strokeWidth="1" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8ea0c4">{fmtBRL(v, 0)}</text>
          </g>
        ))}
        {xt.map((m) => (
          <text key={m} x={x(m)} y={H - 8} textAnchor={m === 0 ? "start" : m === n ? "end" : "middle"} fontSize="11" fill="#8ea0c4">{m === 0 ? "hoje" : `mês ${m}`}</text>
        ))}
        <polygon points={balanceArea} fill="#d4af37" fillOpacity="0.28" />
        <polygon points={investedArea} fill="#3b82f6" fillOpacity="0.35" />
        <polyline points={pts((p) => p.balance)} fill="none" stroke="#e6c766" strokeWidth="2" />
        <polyline points={pts((p) => p.invested)} fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        <circle cx={x(n)} cy={y(last.balance)} r="4" fill="#e6c766" />
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-slate-400">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-electric-500/60 align-middle" />Principal (capital + aportes)</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-gold-500/50 align-middle" />Juros/acréscimos estimados</span>
        <span>{label}</span>
      </figcaption>
    </figure>
  );
}
