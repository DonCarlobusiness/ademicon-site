import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

/** Usa public/brand/don-invest.png se existir (sem alterar a imagem); senão, logotipo tipográfico. */
export function Brand({ size = 36 }: { size?: number }) {
  const hasImage = existsSync(path.join(process.cwd(), "public", "brand", "don-invest.png"));
  return (
    <span className="flex items-center gap-3">
      {hasImage ? (
        <Image src="/brand/don-invest.png" alt="DON INVEST" width={size} height={size} className="rounded-lg" />
      ) : (
        <span aria-hidden className="grid place-items-center rounded-lg border border-gold-600/60 bg-navy-900 font-black text-gold-500" style={{ width: size, height: size }}>
          D
        </span>
      )}
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-wide gold-text">DON INVEST</span>
        <span className="block text-[11px] text-slate-400">Inteligência para construir seu futuro financeiro</span>
      </span>
    </span>
  );
}
