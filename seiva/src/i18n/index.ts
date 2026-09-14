import type { Locale } from '../domain/types.js';
import { ptBR } from './pt-BR.js';
import { es419 } from './es-419.js';
import { en } from './en.js';

export type Dict = Record<keyof typeof ptBR, string>;
/** pt-BR e a fonte da verdade: as outras devem ter as mesmas chaves. */
export type MessageKey = keyof Dict;

/**
 * Fallback do modulo. i18n NAO importa a config de proposito: e busca pura de
 * string e precisa ser usavel (e testavel) sem env carregado. Quem quer o
 * DEFAULT_LOCALE configurado passa explicitamente.
 */
export const FALLBACK_LOCALE: Locale = 'pt-BR';

const DICTS: Record<Locale, Dict> = {
  'pt-BR': ptBR,
  'es-419': es419,
  en: en,
};

export function t(locale: Locale, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const dict = DICTS[locale] ?? DICTS[FALLBACK_LOCALE];
  const template = dict[key] ?? DICTS[FALLBACK_LOCALE][key];
  return interpolate(template, vars);
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Detecta o idioma pelo texto de entrada. Heuristica deliberadamente simples:
 * o produtor nao vai trocar de idioma no meio da conversa, e errar para pt-BR
 * e o padrao seguro no Brasil.
 */
export function detectLocale(text: string | null, fallback: Locale = FALLBACK_LOCALE): Locale {
  if (!text) return fallback;
  const s = ` ${text.toLowerCase()} `;
  if (/\b(hola|buenos dias|gracias|cultivo|cosecha|siembra|lluvia)\b/.test(s)) return 'es-419';
  if (/\b(hello|hi|thanks|harvest|planting|rain|yield)\b/.test(s)) return 'en';
  return fallback;
}

export function isLocale(value: string): value is Locale {
  return value === 'pt-BR' || value === 'es-419' || value === 'en';
}
