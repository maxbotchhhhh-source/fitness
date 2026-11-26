import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { pool, q1 } from '../db';

/** Установка (аналог bin/install.php): таблицы, стартовые данные и администратор.  npm run db:init [-- логин пароль] */
async function main() {
  const login = process.argv[2] || config.admin.login;
  const pass = process.argv[3] || config.admin.password;

  const exists = await q1(`SELECT to_regclass('public.users') AS t`);
  if (exists?.t) {
    console.error('Таблицы уже существуют. Для создания пользователя: npm run user:create -- <логин> <пароль> <admin|manager> "ФИО"');
    return;
  }
  const dir = path.join(__dirname, '../../sql');
  await pool.query(fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
  await pool.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
  await pool.query(
    `INSERT INTO users (role_id, login, password_hash, full_name) VALUES ((SELECT id FROM roles WHERE code = 'admin'), $1, $2, 'Максим Орлов')`,
    [login, await bcrypt.hash(pass, 10)]);
  console.log(`База данных создана.\nАдминистратор: логин «${login}», пароль «${pass}»\nСразу смените пароль в разделе «Пользователи».`);
}

main().catch((e) => { console.error('Ошибка установки:', e.message); process.exitCode = 1; }).finally(() => pool.end());
