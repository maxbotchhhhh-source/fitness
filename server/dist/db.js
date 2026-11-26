"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.q = q;
exports.q1 = q1;
exports.exec = exec;
exports.tx = tx;
const pg_1 = require("pg");
const config_1 = require("./config");
exports.pool = new pg_1.Pool({ connectionString: config_1.config.databaseUrl });
exports.pool.on('connect', (c) => { c.query("SET TIME ZONE 'Europe/Samara'").catch(() => undefined); });
/** SELECT: все строки. Параметры передаются отдельно от текста запроса (подготовленные запросы). */
async function q(sql, params = [], db = exports.pool) {
    return (await db.query(sql, params)).rows;
}
async function q1(sql, params = [], db = exports.pool) {
    return (await q(sql, params, db))[0] ?? null;
}
async function exec(sql, params = [], db = exports.pool) {
    return (await db.query(sql, params)).rowCount ?? 0;
}
async function tx(fn) {
    const c = await exports.pool.connect();
    try {
        await c.query('BEGIN');
        const r = await fn(c);
        await c.query('COMMIT');
        return r;
    }
    catch (e) {
        await c.query('ROLLBACK');
        throw e;
    }
    finally {
        c.release();
    }
}
