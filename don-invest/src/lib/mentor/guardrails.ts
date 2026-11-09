/**
 * Guardrails do mentor: o texto do LLM não pode trazer números que não vieram das
 * ferramentas/dados auditados, nem promessas de rentabilidade ou recomendação de compra.
 */

/** Extrai valores em R$ e percentuais de um texto pt-BR. */
export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  const money = /R\$\s?(-?[\d.]+(?:,\d+)?)/g;
  const pct = /(-?\d+(?:[.,]\d+)?)\s?%/g;
  const toNum = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
  for (const m of text.matchAll(money)) out.push(toNum(m[1]));
  for (const m of text.matchAll(pct)) out.push(Number(m[1].replace(",", ".")));
  return out.filter((n) => Number.isFinite(n));
}

/** Coleta todos os números presentes em dados estruturados (resultado de ferramentas, relatório). */
export function collectNumbers(data: unknown, acc: Set<number> = new Set()): Set<number> {
  if (typeof data === "number" && Number.isFinite(data)) {
    acc.add(data);
    acc.add(Math.round(data * 100) / 100);
    acc.add(Math.round(data));
    acc.add(Math.round(data * 10) / 10);
  } else if (typeof data === "string") {
    for (const n of extractNumbers(data)) collectNumbers(n, acc);
    for (const m of data.matchAll(/-?\d+(?:[.,]\d+)?/g)) collectNumbers(Number(m[0].replace(",", ".")), acc);
  } else if (Array.isArray(data)) {
    for (const x of data) collectNumbers(x, acc);
  } else if (data && typeof data === "object") {
    for (const v of Object.values(data)) collectNumbers(v, acc);
  }
  return acc;
}

const FORBIDDEN: { re: RegExp; reason: string }[] = [
  { re: /garant(id|e)[oa]s?\s+(de\s+)?(lucro|retorno|rentabilidade|renda)/i, reason: "promessa de rentabilidade" },
  { re: /lucro\s+(certo|garantido)/i, reason: "promessa de lucro" },
  { re: /(recomendo|recomendamos|você deve)\s+(comprar|investir|aplicar)/i, reason: "recomendação individualizada de compra" },
  { re: /melhor investimento/i, reason: "ranking absoluto" },
];

export interface GuardrailReport {
  untrackedNumbers: number[];
  violations: string[];
  ok: boolean;
}

export function checkAnswer(answer: string, allowed: Set<number>): GuardrailReport {
  const untracked = extractNumbers(answer).filter((n) => {
    for (const a of allowed) {
      if (Math.abs(a - n) <= Math.max(0.01, Math.abs(a) * 0.005)) return false;
    }
    return true;
  });
  const violations = FORBIDDEN.filter((f) => f.re.test(answer)).map((f) => f.reason);
  return { untrackedNumbers: [...new Set(untracked)], violations, ok: untracked.length === 0 && violations.length === 0 };
}
