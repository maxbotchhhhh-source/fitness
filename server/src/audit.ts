import { PoolClient } from 'pg';
import { exec } from './db';

type Row = Record<string, unknown>;
const SKIP = new Set(['updated_at', 'password_hash']);

/**
 * Журнал действий audit_log: по одной строке на каждое изменённое поле
 * (кто, когда, какое действие, какое поле, было → стало). userId = null — действие посетителя сайта.
 */
export async function audit(
  userId: number | null, action: 'create' | 'update' | 'delete' | 'login' | 'logout', table: string,
  recordId: number | null, oldV: Row = {}, newV: Row = {}, db?: PoolClient,
): Promise<void> {
  const sql = `INSERT INTO audit_log (user_id, action, table_name, record_id, field_name, old_value, new_value) VALUES ($1,$2,$3,$4,$5,$6,$7)`;
  const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
  const fields = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)]));
  let logged = false;
  for (const f of fields) {
    if (SKIP.has(f)) continue;
    const o = str(oldV[f]);
    const n = str(newV[f]);
    if (action === 'update' && o === n) continue;
    await exec(sql, [userId, action, table, recordId, f, o, n], db);
    logged = true;
  }
  if (!logged) await exec(sql, [userId, action, table, recordId, null, null, null], db);
}
