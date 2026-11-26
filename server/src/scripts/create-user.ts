import bcrypt from 'bcryptjs';
import { pool } from '../db';

/** npm run user:create -- <логин> <пароль> <admin|manager> "ФИО" */
async function main() {
  const [login, pass, role, name] = process.argv.slice(2);
  if (!login || !pass || !role || !name) {
    console.error('Использование: npm run user:create -- <логин> <пароль> <admin|manager> "ФИО"');
    process.exitCode = 1;
    return;
  }
  await pool.query(
    'INSERT INTO users (role_id, login, password_hash, full_name) VALUES ((SELECT id FROM roles WHERE code = $1), $2, $3, $4)',
    [role, login, await bcrypt.hash(pass, 10), name]);
  console.log(`Пользователь ${login} создан.`);
}

main().catch((e) => { console.error('Ошибка:', e.message); process.exitCode = 1; }).finally(() => pool.end());
