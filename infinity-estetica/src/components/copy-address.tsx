"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "copied" | "error";

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure contexts (e.g. LAN preview over http).
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

export function CopyAddress({ text }: { text: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      await writeClipboard(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    timer.current = window.setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-12 items-center gap-3 rounded-full border border-ink/70 px-6 text-[0.9375rem] font-semibold text-ink transition-colors duration-[160ms] hover:border-ink hover:bg-ink hover:text-ivory"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          {status === "copied" ? (
            <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="5.5" y="5.5" width="8" height="8.5" rx="1.5" />
              <path d="M10.5 3.5V3a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v6.5A1.5 1.5 0 0 0 4 11h.5" />
            </>
          )}
        </svg>
        {status === "copied" ? "Endereço copiado" : "Copiar endereço"}
      </button>

      <p
        role="status"
        aria-live="polite"
        className={`min-h-[1.5rem] text-sm ${status === "error" ? "text-error" : "text-muted"}`}
      >
        {status === "copied" && "Copiado para a área de transferência."}
        {status === "error" &&
          "Não foi possível copiar automaticamente. Selecione o endereço acima."}
      </p>
    </div>
  );
}
