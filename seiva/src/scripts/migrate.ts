import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool, closePool } from '../db/pool.js';
import { logger } from '../lib/logger.js';

/**
 * Migrador simples: aplica os .sql de db/migrations em ordem e anota o que
 * ja rodou. Cada migration roda dentro de uma transacao — se falhar no meio,
 * nao deixa o schema pela metade.
 */
const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

async function main(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const applied = new Set(
    (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name),
  );

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info({ file }, 'migration ja aplicada');
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info({ file }, 'migration aplicada');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ file, err: String(err) }, 'migration falhou; schema intacto');
      throw err;
    } finally {
      client.release();
    }
  }
  logger.info({ count: files.length }, 'migrations em dia');
}

try {
  await main();
} finally {
  await closePool();
}
