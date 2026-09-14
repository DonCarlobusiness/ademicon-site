import type { Locale } from '../domain/types.js';
import { t } from '../i18n/index.js';

/**
 * Termos que caracterizam recomendacao de defensivo. Inclui ingredientes
 * ativos comuns porque o modelo costuma cita-los pelo nome tecnico sem
 * dizer "agrotoxico".
 */
const PESTICIDE_TERMS = [
  // categorias
  'agrotoxic', 'defensivo', 'fungicida', 'inseticida', 'herbicida', 'acaricida',
  'nematicida', 'pulveriz', 'calda', 'desseca',
  'agroquimic', 'fungicid', 'insecticid', 'herbicid', // es
  'pesticide', 'fungicide', 'insecticide', 'herbicide', 'spray', // en
  // ingredientes ativos frequentes
  'glifosat', 'glyphosat', '2,4-d', 'atrazina', 'mancozeb', 'azoxistrobina',
  'tebuconazol', 'clorotalonil', 'imidacloprid', 'lambda-cialotrina',
  'clorantranilipro', 'paraquat', 'diquat', 'carbendazim', 'tiametoxam',
];

export function mentionsPesticide(text: string): boolean {
  const s = text.toLowerCase();
  return PESTICIDE_TERMS.some((term) => s.includes(term));
}

/**
 * Anexa o aviso de receituario agronomico (Lei 7.802/89).
 *
 * Feito em codigo e nao no prompt de proposito: o aviso e exigencia legal,
 * e nao pode depender do modelo lembrar de escrever. Idempotente — se o
 * aviso ja estiver no texto, nao duplica.
 */
export function applyPesticideWarning(text: string, locale: Locale): string {
  if (!mentionsPesticide(text)) return text;
  const warning = t(locale, 'pesticideWarning');
  if (text.includes(warning)) return text;
  // Heuristica barata contra duplicata quando o modelo escreveu o aviso
  // com outras palavras.
  if (/receitu[aá]rio agron[oô]mico|receta agron[oó]mica|agronomic prescription/i.test(text)) {
    return text;
  }
  return `${text.trimEnd()}\n\n${warning}`;
}

/**
 * Ultima barreira contra numero de satelite inventado: se o modelo citou um
 * NDVI mas nenhuma ferramenta de satelite rodou com sucesso neste turno,
 * o texto e suspeito. Nao reescrevemos a resposta (isso pioraria), mas
 * sinalizamos para o log e para o alerta de qualidade.
 */
export function looksLikeFabricatedIndex(text: string, satelliteToolSucceeded: boolean): boolean {
  if (satelliteToolSucceeded) return false;
  return /\bnd(vi|re)\b[^.\n]{0,40}?\d[.,]\d/i.test(text);
}
