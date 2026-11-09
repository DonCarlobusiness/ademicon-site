/** Utilitários de data. Armazenamento em UTC; exibição em America/Bahia (UTC−3, sem horário de verão). */

export const DISPLAY_TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ || "America/Bahia";

/** Converte "dd/mm/aaaa" (data oficial brasileira) para ISO UTC à meia-noite de Brasília/Bahia (03:00Z). */
export function brDateToIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  if (!m) throw new Error(`Data inválida (esperado dd/mm/aaaa): ${br}`);
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`Data inválida: ${br}`);
  return new Date(Date.UTC(Number(y), month - 1, day, 3, 0, 0)).toISOString();
}

export function ageMinutes(referenceIso: string | null, now: Date = new Date()): number | null {
  if (!referenceIso) return null;
  return Math.max(0, Math.round((now.getTime() - new Date(referenceIso).getTime()) / 60000));
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: DISPLAY_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: DISPLAY_TZ, dateStyle: "short" }).format(new Date(iso));
}

export function formatAge(minutes: number | null): string {
  if (minutes === null) return "idade desconhecida";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} dias`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}
