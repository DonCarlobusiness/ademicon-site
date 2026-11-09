"use client";

import { useState } from "react";
import { parseBRL } from "@/lib/finance/costs";
import { toInputBRL } from "@/lib/format";

/**
 * Campo de moeda BRL: aceita "750", "750,50", "10.000", "R$ 1.234,56".
 * Formata ao sair do campo; o valor numérico vai inteiro para o núcleo (sem arredondar).
 */
export function MoneyInput({
  id, label, value, onChange, allowZero = true, large = false, hint, inputRef,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  allowZero?: boolean;
  large?: boolean;
  hint?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [text, setText] = useState(() => toInputBRL(value));
  const [error, setError] = useState<string | null>(null);
  const [lastExternal, setLastExternal] = useState(value);

  // Sincroniza quando o valor muda por fora (ex.: chips de atalho)
  if (value !== lastExternal) {
    setLastExternal(value);
    if (parseBRL(text) !== value) setText(toInputBRL(value));
  }

  function handle(raw: string) {
    setText(raw);
    if (raw.trim() === "") {
      setError(null);
      setLastExternal(0);
      onChange(0);
      return;
    }
    const n = parseBRL(raw);
    if (n === null) return setError("Valor inválido. Use, por exemplo, 750 ou 1.234,56.");
    if (n > 1e10) return setError("Valor acima do limite suportado.");
    if (!allowZero && n === 0) return setError("Informe um valor maior que zero.");
    setError(null);
    setLastExternal(n);
    onChange(n);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-300">{label}</label>
      <div className={`flex items-center rounded-xl border bg-navy-900 focus-within:border-gold-500 ${error ? "border-red-500/70" : "border-navy-600"}`}>
        <span className={`pl-3 font-semibold text-gold-500 ${large ? "text-2xl" : "text-base"}`} aria-hidden>R$</span>
        <input
          id={id}
          ref={inputRef}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => { if (!error && text.trim() !== "") setText(toInputBRL(parseBRL(text) ?? 0)); }}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help`}
          className={`w-full min-w-0 bg-transparent px-2 py-2.5 font-bold tabular-nums text-slate-50 outline-none ${large ? "text-3xl" : "text-lg"}`}
        />
      </div>
      <p id={`${id}-help`} className={`mt-1 text-xs ${error ? "text-red-300" : "text-slate-500"}`}>{error ?? hint ?? " "}</p>
    </div>
  );
}
