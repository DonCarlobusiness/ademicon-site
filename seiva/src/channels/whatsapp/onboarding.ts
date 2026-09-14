import type { Crop, InboundMessage, Locale, Producer } from '../../domain/types.js';
import { t } from '../../i18n/index.js';
import {
  clearOnboardingData, createField, getPrimaryField, patchOnboardingData, updateProducer,
} from '../../db/repo.js';
import { reverseGeocode } from '../../services/geocode.js';
import { logger } from '../../lib/logger.js';

/**
 * Onboarding deterministico (nao passa pelo modelo).
 *
 * Sao 4 perguntas e o produtor pode responder por audio ou texto. Feito em
 * codigo porque cada passo grava estado e porque consentimento LGPD nao pode
 * depender de o modelo interpretar bem um "uhum".
 */

export interface OnboardingOutcome {
  handled: boolean;
  reply?: string;
}

const YES = /^\s*(sim|s|claro|pode|ok|isso|aceito|si|yes|y|concordo|beleza|bora|positivo)\b/i;
const NO = /^\s*(n[aã]o|nao|n|nunca|negativo|no)\b/i;

const CROP_ALIASES: [RegExp, Crop][] = [
  [/\bsoja|soya|soybean\b/i, 'soja'],
  [/\bmilho|ma[ií]z|maize|corn\b/i, 'milho'],
  [/\bcaf[eé]|coffee\b/i, 'cafe'],
  [/\balgod[aã]o|cotton\b/i, 'algodao'],
  [/\bfeij[aã]o|frijol|bean\b/i, 'feijao'],
  [/\btrigo|wheat\b/i, 'trigo'],
  [/\bcana|sugarcane\b/i, 'cana'],
  [/\bpasto|pastagem|pastura|capim|braqui|pasture\b/i, 'pastagem'],
  [/\bhortali|horta|verdura|tomate|alface|vegetable\b/i, 'hortalicas'],
];

export function parseCrop(text: string): Crop | null {
  for (const [re, crop] of CROP_ALIASES) if (re.test(text)) return crop;
  return null;
}

/** Aceita "30", "30 ha", "30,5", "30.5 hectares", "uns 30". */
export function parseArea(text: string): number | null {
  const m = text.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  // Acima de 100 mil ha quase certamente e erro de digitacao ou outro numero.
  return n > 0 && n <= 100_000 ? n : null;
}

export async function handleOnboarding(
  producer: Producer,
  inbound: InboundMessage,
  text: string | null,
  locale: Locale,
): Promise<OnboardingOutcome> {
  // Pedido de exclusao vale em qualquer etapa, inclusive depois de pronto.
  if (text && /apagar meus dados|borrar mis datos|delete my data/i.test(text)) {
    return { handled: false }; // tratado no handler principal
  }

  switch (producer.onboardingStep) {
    case 'consent': {
      if (!text) return { handled: true, reply: t(locale, 'welcome') };
      if (YES.test(text)) {
        await updateProducer(producer.id, { lgpdConsent: true, onboardingStep: 'name' });
        return { handled: true, reply: `${t(locale, 'consentAccepted')}\n\n${t(locale, 'askName')}` };
      }
      if (NO.test(text)) {
        // Sem consentimento nao avancamos, mas tambem nao travamos a conversa.
        return { handled: true, reply: t(locale, 'consentDenied') };
      }
      return { handled: true, reply: t(locale, 'welcome') };
    }

    case 'name': {
      if (!text) return { handled: true, reply: t(locale, 'askName') };
      const name = cleanName(text) ?? inbound.profileName;
      if (!name) return { handled: true, reply: t(locale, 'askName') };
      await updateProducer(producer.id, { name, onboardingStep: 'location' });
      return { handled: true, reply: t(locale, 'askLocation') };
    }

    case 'location': {
      if (!inbound.location) return { handled: true, reply: t(locale, 'askLocation') };
      const place = await reverseGeocode(inbound.location);
      await updateProducer(producer.id, {
        municipality: place?.municipality ?? null,
        uf: place?.uf ?? null,
        onboardingStep: 'crop',
      });
      // Guardamos o pin em memoria do passo seguinte via o proprio talhao,
      // criado so quando soubermos cultura e area.
      await patchOnboardingData(producer.id, {
        pendingLat: inbound.location.lat,
        pendingLon: inbound.location.lon,
      });
      return { handled: true, reply: t(locale, 'askCrop') };
    }

    case 'crop': {
      if (!text) return { handled: true, reply: t(locale, 'askCrop') };
      const crop = parseCrop(text) ?? 'outro';
      await patchOnboardingData(producer.id, { pendingCrop: crop });
      await updateProducer(producer.id, { onboardingStep: 'area' });
      return { handled: true, reply: t(locale, 'askArea') };
    }

    case 'area': {
      if (!text) return { handled: true, reply: t(locale, 'askArea') };
      const areaHa = parseArea(text);
      if (areaHa === null) return { handled: true, reply: t(locale, 'askArea') };

      const { pendingLat, pendingLon, pendingCrop } = producer.onboardingData;
      if (pendingLat === undefined || pendingLon === undefined) {
        // Sem pin gravado nao da para cadastrar talhao: pede de novo em vez
        // de inventar uma coordenada.
        await updateProducer(producer.id, { onboardingStep: 'location' });
        return { handled: true, reply: t(locale, 'askLocation') };
      }

      await createField({
        producerId: producer.id,
        crop: pendingCrop ?? 'outro',
        areaHa,
        centroid: { lat: pendingLat, lon: pendingLon },
      });
      const updated = await updateProducer(producer.id, { onboardingStep: 'done' });
      await clearOnboardingData(producer.id);
      const crop = pendingCrop ?? 'outro';

      logger.info({ producerId: producer.id, crop, areaHa }, 'onboarding concluido');
      // Sem municipio (geocode falhou) usamos a variante sem cidade — melhor
      // do que confirmar "talhao em -" para o produtor.
      const vars = { name: updated.name ?? '', area: areaHa, crop };
      return {
        handled: true,
        reply: updated.municipality
          ? t(locale, 'onboardingDone', { ...vars, municipality: updated.municipality })
          : t(locale, 'onboardingDoneNoCity', vars),
      };
    }

    case 'done':
    default:
      return { handled: false };
  }
}

/**
 * Um pin enviado depois do onboarding cadastra um talhao novo se ainda nao
 * houver nenhum — o produtor nao precisa refazer o cadastro.
 */
export async function maybeRegisterFieldFromPin(
  producer: Producer,
  inbound: InboundMessage,
): Promise<boolean> {
  if (!inbound.location || producer.onboardingStep !== 'done') return false;
  const existing = await getPrimaryField(producer.id);
  if (existing) return false;
  await createField({
    producerId: producer.id,
    crop: 'outro',
    areaHa: 1,
    centroid: inbound.location,
  });
  return true;
}

function cleanName(text: string): string | null {
  const cleaned = text
    .replace(/\b(meu nome|me chamo|eu sou|sou o|sou a|aqui e|aqui é|my name is|i am|me llamo)\b/gi, '')
    .replace(/[^\p{L}\p{M}\s'-]/gu, '')
    .trim();
  if (cleaned.length < 2 || cleaned.length > 60) return null;
  return cleaned
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
