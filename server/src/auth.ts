import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { audit } from './audit';
import { config } from './config';
import { exec, q1 } from './db';

/** RBAC: разрешения ролей (как в app/auth.php). Посетитель сайта — без входа. */
export const PERMISSIONS: Record<string, string[]> = {
  admin: ['leads.view', 'leads.edit', 'services.edit', 'tariffs.edit', 'reviews.edit', 'users.edit', 'audit.view'],
  manager: ['leads.view', 'leads.edit'],
};

export interface AuthUser { id: number; login: string; full_name: string; role: string; role_name: string }

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export const COOKIE = 'orlov_sid';

export const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };

export const clientIp = (req: Request): string => String(req.ip ?? '').slice(0, 45);

/** Пользователь из cookie-сессии; данные каждый раз берутся из БД (удалённый пользователь теряет доступ сразу). */
export async function currentUser(req: Request): Promise<AuthUser | null> {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (!token) return null;
  try {
    const p = jwt.verify(token, config.jwtSecret) as unknown as { sub: string };
    return await q1<AuthUser>(
      `SELECT u.id, u.login, u.full_name, r.code AS role, r.name AS role_name
         FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND NOT u.is_deleted`, [Number(p.sub)]);
  } catch {
    return null;
  }
}

export const can = (u: AuthUser | null, perm: string): boolean => !!u && (PERMISSIONS[u.role] ?? []).includes(perm);

export const requirePerm = (perm?: string): RequestHandler => ah(async (req, res, next) => {
  const u = await currentUser(req);
  if (!u) { res.status(401).json({ ok: false, error: 'Требуется вход' }); return; }
  if (perm && !can(u, perm)) {
    res.status(403).json({ ok: false, error: `У вашей роли («${u.role_name}») нет доступа к этому разделу.` });
    return;
  }
  req.user = u;
  next();
});

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

/** Возвращает null при успехе или текст ошибки. */
export async function attemptLogin(req: Request, res: Response, login: string, password: string): Promise<string | null> {
  const ip = clientIp(req);
  const fails = await q1<{ n: string }>(
    `SELECT count(*) AS n FROM login_attempts WHERE ip_address = $1 AND created_at > now() - interval '15 minutes'`, [ip]);
  if (Number(fails?.n ?? 0) >= config.security.loginMaxFail) return 'Слишком много попыток входа. Повторите через 15 минут.';

  const u = await q1<{ id: number; password_hash: string }>('SELECT id, password_hash FROM users WHERE login = $1 AND NOT is_deleted', [login]);
  // сравнение хэша выполняем всегда — по времени ответа нельзя узнать, существует ли логин
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH).catch(() => false);
  if (!u || !ok) {
    await exec('INSERT INTO login_attempts (ip_address, login) VALUES ($1, $2)', [ip, login.slice(0, 50)]);
    return 'Неверный логин или пароль.';
  }
  const token = jwt.sign({ sub: String(u.id) }, config.jwtSecret, { expiresIn: '12h' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
  await exec('DELETE FROM login_attempts WHERE ip_address = $1', [ip]);
  await audit(u.id, 'login', 'users', u.id);
  return null;
}
