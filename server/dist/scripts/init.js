"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("../config");
const db_1 = require("../db");
/** Установка (аналог bin/install.php): таблицы, стартовые данные и администратор.  npm run db:init [-- логин пароль] */
async function main() {
    const login = process.argv[2] || config_1.config.admin.login;
    const pass = process.argv[3] || config_1.config.admin.password;
    const exists = await (0, db_1.q1)(`SELECT to_regclass('public.users') AS t`);
    if (exists?.t) {
        console.error('Таблицы уже существуют. Для создания пользователя: npm run user:create -- <логин> <пароль> <admin|manager> "ФИО"');
        return;
    }
    const dir = path_1.default.join(__dirname, '../../sql');
    await db_1.pool.query(fs_1.default.readFileSync(path_1.default.join(dir, 'schema.sql'), 'utf8'));
    await db_1.pool.query(fs_1.default.readFileSync(path_1.default.join(dir, 'seed.sql'), 'utf8'));
    await db_1.pool.query(`INSERT INTO users (role_id, login, password_hash, full_name) VALUES ((SELECT id FROM roles WHERE code = 'admin'), $1, $2, 'Максим Орлов')`, [login, await bcryptjs_1.default.hash(pass, 10)]);
    console.log(`База данных создана.\nАдминистратор: логин «${login}», пароль «${pass}»\nСразу смените пароль в разделе «Пользователи».`);
}
main().catch((e) => { console.error('Ошибка установки:', e.message); process.exitCode = 1; }).finally(() => db_1.pool.end());
