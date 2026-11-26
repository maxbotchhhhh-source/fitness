import { Pool, PoolClient } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });
pool.on('connect', (c) => { c.query("SET TIME ZONE 'Europe/Samara'").catch(() => undefined); });

type Runner = Pick<Pool | PoolClient, 'query'>;

/** SELECT: все строки. Параметры передаются отдельно от текста запроса (подготовленные запросы). */
export async function q<T = any>(sql: string, params: any[] = [], db: Runner = pool): Promise<T[]> {
  return (await db.query(sql, params)).rows as T[];
}
export async function q1<T = any>(sql: string, params: any[] = [], db: Runner = pool): Promise<T | null> {
  return (await q<T>(sql, params, db))[0] ?? null;
}
export async function exec(sql: string, params: any[] = [], db: Runner = pool): Promise<number> {
  return (await db.query(sql, params)).rowCount ?? 0;
}
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
