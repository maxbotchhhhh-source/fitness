"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
/** npm run user:create -- <логин> <пароль> <admin|manager> "ФИО" */
async function main() {
    const [login, pass, role, name] = process.argv.slice(2);
    if (!login || !pass || !role || !name) {
        console.error('Использование: npm run user:create -- <логин> <пароль> <admin|manager> "ФИО"');
        process.exitCode = 1;
        return;
    }
    await db_1.pool.query('INSERT INTO users (role_id, login, password_hash, full_name) VALUES ((SELECT id FROM roles WHERE code = $1), $2, $3, $4)', [role, login, await bcryptjs_1.default.hash(pass, 10), name]);
    console.log(`Пользователь ${login} создан.`);
}
main().catch((e) => { console.error('Ошибка:', e.message); process.exitCode = 1; }).finally(() => db_1.pool.end());
