import { Queue, Worker, type Processor } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const connection = { url: env.REDIS_URL };

export const ALERTS_QUEUE = 'seiva:alerts';

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
}

export function createWorker(name: string, processor: Processor): Worker {
  const worker = new Worker(name, processor, { connection, concurrency: 4 });
  worker.on('failed', (job, err) => {
    logger.error({ queue: name, jobId: job?.id, err: String(err) }, 'job falhou');
  });
  return worker;
}
