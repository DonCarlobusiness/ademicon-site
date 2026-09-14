import type { Queue, Worker } from 'bullmq';
import { ALERTS_QUEUE, createQueue, createWorker } from './queue.js';
import { logger } from '../lib/logger.js';
import { claimAlert, listAllFields } from '../db/repo.js';
import { getFieldIndex } from '../services/satellite/sentinelHub.js';
import { dryStreak, getWeather } from '../services/weather/openMeteo.js';
import { sendText } from '../channels/whatsapp/client.js';
import { t } from '../i18n/index.js';
import type { Field, Locale } from '../domain/types.js';

/**
 * Alertas proativos: estresse hidrico, queda de NDVI, geada e chuva forte.
 *
 * Roda uma vez por dia. Cada alerta tem uma dedupe_key gravada no banco —
 * sem isso o produtor recebe "vai gear" todo dia da semana e silencia o
 * numero, que e a pior coisa que pode acontecer com este produto.
 */

let queue: Queue | null = null;
let worker: Worker | null = null;

const DAILY_SWEEP = 'daily-sweep';

export function startAlertWorker(): void {
  queue = createQueue(ALERTS_QUEUE);
  worker = createWorker(ALERTS_QUEUE, async (job) => {
    if (job.name === DAILY_SWEEP) await sweepAllFields();
  });

  // 09:00 UTC ~ 06:00 no horario de Brasilia: o produtor le antes de ir para
  // a lavoura, e ainda da tempo de mudar o plano do dia.
  void queue.upsertJobScheduler(
    'seiva-daily-sweep',
    { pattern: '0 9 * * *' },
    { name: DAILY_SWEEP, data: {} },
  );

  logger.info('worker de alertas proativos iniciado');
}

export async function stopAlertWorker(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}

export async function sweepAllFields(): Promise<void> {
  const fields = await listAllFields();
  logger.info({ count: fields.length }, 'varredura diaria de alertas');

  for (const field of fields) {
    try {
      await checkField(field);
    } catch (err) {
      // Um talhao com problema nao pode parar a varredura dos outros.
      logger.warn({ err: String(err), fieldId: field.id }, 'falha ao checar talhao');
    }
  }
}

async function checkField(field: Field & { waId: string; locale: Locale }): Promise<void> {
  const { waId, locale } = field;

  // --- Clima: geada, chuva forte, estresse hidrico ---
  const weather = await getWeather(field.centroid, 7);
  if (weather.ok) {
    const days = weather.data.daily;

    const frost = days.find((d) => d.tMinC <= 3);
    if (frost && (await claimAlert(field.id, 'frost', frost.date))) {
      await sendText(waId, t(locale, 'frostAlert', { temp: frost.tMinC.toFixed(0), date: br(frost.date) }));
    }

    const heavy = days.find((d) => d.rainMm >= 50);
    if (heavy && (await claimAlert(field.id, 'heavy_rain', heavy.date))) {
      await sendText(waId, t(locale, 'heavyRainAlert', { mm: heavy.rainMm.toFixed(0), date: br(heavy.date) }));
    }

    const dry = dryStreak(days);
    if (dry >= 7) {
      // Uma vez por semana de seca, nao por dia.
      const week = `${days[0]!.date.slice(0, 7)}-w${Math.floor(new Date(days[0]!.date).getDate() / 7)}`;
      if (await claimAlert(field.id, 'water_stress', week)) {
        await sendText(waId, t(locale, 'waterStressAlert', { days: dry }));
      }
    }
  }

  // --- Satelite: queda de vigor ---
  const ndvi = await getFieldIndex(field, { lookbackDays: 30 });
  if (!ndvi.ok) return; // sem passagem limpa: nada a dizer, e nao inventamos

  const previous = ndvi.data.history[0];
  if (!previous || previous.mean <= 0) return;

  const dropPct = ((previous.mean - ndvi.data.mean) / previous.mean) * 100;
  // 15% entre duas passagens e queda real, nao ruido de sensor.
  if (dropPct < 15) return;

  if (await claimAlert(field.id, 'ndvi_drop', ndvi.data.acquiredAt)) {
    await sendText(
      waId,
      t(locale, 'ndviDropAlert', {
        crop: field.crop,
        drop: dropPct.toFixed(0),
        since: br(previous.date),
        hint: ndvi.data.stdev > 0.12 ? 'com manchas mais fracas' : 'toda',
      }),
    );
  }
}

function br(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
