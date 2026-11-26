"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const db_1 = require("./db");
const SKIP = new Set(['updated_at', 'password_hash']);
/**
 * Журнал действий audit_log: по одной строке на каждое изменённое поле
 * (кто, когда, какое действие, какое поле, было → стало). userId = null — действие посетителя сайта.
 */
async function audit(userId, action, table, recordId, oldV = {}, newV = {}, db) {
    const sql = `INSERT INTO audit_log (user_id, action, table_name, record_id, field_name, old_value, new_value) VALUES ($1,$2,$3,$4,$5,$6,$7)`;
    const str = (v) => (v === null || v === undefined ? null : String(v));
    const fields = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)]));
    let logged = false;
    for (const f of fields) {
        if (SKIP.has(f))
            continue;
        const o = str(oldV[f]);
        const n = str(newV[f]);
        if (action === 'update' && o === n)
            continue;
        await (0, db_1.exec)(sql, [userId, action, table, recordId, f, o, n], db);
        logged = true;
    }
    if (!logged)
        await (0, db_1.exec)(sql, [userId, action, table, recordId, null, null, null], db);
}
