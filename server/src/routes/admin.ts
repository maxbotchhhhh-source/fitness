import { Router } from 'express';
import { audit } from '../audit';
import { ah, attemptLogin, can, COOKIE, currentUser, PERMISSIONS, requirePerm } from '../auth';
import { exec, q, q1, tx } from '../db';
import { reviewsCrud, servicesCrud, tariffsCrud, usersCrud } from './crud';

export const adminRouter = Router();

export const LEAD_STATUSES: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Обработана', rejected: 'Отклонена' };

adminRouter.post('/login', ah(async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const login = typeof b.login === 'string' ? b.login.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const err = await attemptLogin(req, res, login, password);
  if (err) { res.status(401).json({ ok: false, error: err }); return; }
  const row = await q1<{ role: string }>(`SELECT u.id, u.login, u.full_name, r.code AS role, r.name AS role_name FROM users u JOIN roles r ON r.id=u.role_id WHERE u.login=$1 AND NOT u.is_deleted`, [login]);
  res.json({ ok: true, user: row, permissions: PERMISSIONS[row?.role ?? ''] ?? [] });
}));

adminRouter.post('/logout', ah(async (req, res) => {
  const u = await currentUser(req);
  if (u) await audit(u.id, 'logout', 'users', u.id);
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
}));

adminRouter.get('/me', ah(async (req, res) => {
  const u = await currentUser(req);
  if (!u) { res.status(401).json({ ok: false, error: 'Требуется вход' }); return; }
  res.json({ ok: true, user: u, permissions: PERMISSIONS[u.role] ?? [] });
}));

/* ---------- Заявки: просмотр и смена статуса (admin, manager) ---------- */
adminRouter.get('/leads', requirePerm('leads.view'), ah(async (req, res) => {
  const status = typeof req.query.status === 'string' && req.query.status in LEAD_STATUSES ? req.query.status : '';
  const counts = await q<{ status: string; n: string }>('SELECT status, count(*) AS n FROM leads WHERE NOT is_deleted GROUP BY status');
  const leads = await q(
    `SELECT l.id, l.name, l.phone, l.comment, l.status, l.created_at, s.title AS service_title, t.title AS tariff_title, u.full_name AS processed_name
       FROM leads l
       LEFT JOIN services s ON s.id = l.service_id
       LEFT JOIN tariffs t ON t.id = l.tariff_id
       LEFT JOIN users u ON u.id = l.processed_by
      WHERE NOT l.is_deleted AND ($1::text = '' OR l.status = $1)
      ORDER BY l.created_at DESC, l.id DESC LIMIT 300`, [status]);
  res.json({ leads, counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])) });
}));

adminRouter.patch('/leads/:id', requirePerm('leads.edit'), ah(async (req, res) => {
  const id = Number(req.params.id);
  const next = String((req.body ?? {}).status ?? '');
  const old = await q1<{ status: string; processed_by: number | null }>('SELECT status, processed_by FROM leads WHERE id = $1 AND NOT is_deleted', [id]);
  if (!old || !(next in LEAD_STATUSES)) { res.status(400).json({ ok: false, error: 'Заявка или статус не найдены.' }); return; }
  if (old.status !== next) {
    const uid = req.user!.id;
    await tx(async (c) => {
      await exec('UPDATE leads SET status = $1, processed_by = $2, updated_at = now() WHERE id = $3', [next, uid, id], c);
      await audit(uid, 'update', 'leads', id, { status: old.status, processed_by: old.processed_by }, { status: next, processed_by: uid }, c);
    });
  }
  res.json({ ok: true, message: `Статус заявки #${id} изменён на «${LEAD_STATUSES[next]}».` });
}));

/* ---------- Журнал действий (admin) ---------- */
adminRouter.get('/audit', requirePerm('audit.view'), ah(async (req, res) => {
  const per = 50;
  const page = Math.max(1, Number(req.query.p) || 1);
  const total = Number((await q1<{ n: string }>('SELECT count(*) AS n FROM audit_log'))!.n);
  const rows = await q(
    `SELECT a.id, a.user_id, a.action, a.table_name, a.record_id, a.field_name, a.old_value, a.new_value, a.created_at, u.login, u.full_name
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC, a.id DESC LIMIT $1 OFFSET $2`, [per, (page - 1) * per]);
  res.json({ rows, total, page, pages: Math.max(1, Math.ceil(total / per)) });
}));

/* ---------- Справочники ---------- */
adminRouter.use('/services', servicesCrud);
adminRouter.use('/tariffs', tariffsCrud);
adminRouter.use('/reviews', reviewsCrud);
adminRouter.use('/users', usersCrud);

/** Варианты для select в формах (услуги, роли). */
adminRouter.get('/options', requirePerm(), ah(async (req, res) => {
  const u = req.user!;
  res.json({
    services: can(u, 'tariffs.edit') ? await q('SELECT id, title FROM services WHERE NOT is_deleted ORDER BY sort_order, id') : [],
    roles: can(u, 'users.edit') ? await q('SELECT id, name FROM roles ORDER BY id') : [],
  });
}));
