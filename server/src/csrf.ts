import crypto from 'crypto';
import { RequestHandler } from 'express';

/** CSRF (double submit cookie): токен в cookie и такой же в заголовке X-CSRF-Token. */
export const csrfToken: RequestHandler = (req, res) => {
  let t = req.cookies?.csrf as string | undefined;
  if (!t) {
    t = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf', t, { sameSite: 'lax', secure: req.secure, httpOnly: false });
  }
  res.json({ token: t });
};

export const verifyCsrf: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const c = req.cookies?.csrf as string | undefined;
  const h = req.get('x-csrf-token');
  if (!c || !h || c !== h) {
    res.status(419).json({ ok: false, error: 'Сессия устарела. Обновите страницу и повторите действие.' });
    return;
  }
  next();
};
