"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAD_STATUSES = exports.adminRouter = void 0;
const express_1 = require("express");
const audit_1 = require("../audit");
const auth_1 = require("../auth");
const db_1 = require("../db");
const crud_1 = require("./crud");
exports.adminRouter = (0, express_1.Router)();
exports.LEAD_STATUSES = { new: 'Новая', in_progress: 'В работе', done: 'Обработана', rejected: 'Отклонена' };
exports.adminRouter.post('/login', (0, auth_1.ah)(async (req, res) => {
    const b = (req.body ?? {});
    const login = typeof b.login === 'string' ? b.login.trim() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    const err = await (0, auth_1.attemptLogin)(req, res, login, password);
    if (err) {
        res.status(401).json({ ok: false, error: err });
        return;
    }
    const row = await (0, db_1.q1)(`SELECT u.id, u.login, u.full_name, r.code AS role, r.name AS role_name FROM users u JOIN roles r ON r.id=u.role_id WHERE u.login=$1 AND NOT u.is_deleted`, [login]);
    res.json({ ok: true, user: row, permissions: auth_1.PERMISSIONS[row?.role ?? ''] ?? [] });
}));
exports.adminRouter.post('/logout', (0, auth_1.ah)(async (req, res) => {
    const u = await (0, auth_1.currentUser)(req);
    if (u)
        await (0, audit_1.audit)(u.id, 'logout', 'users', u.id);
    res.clearCookie(auth_1.COOKIE, { path: '/' });
    res.json({ ok: true });
}));
exports.adminRouter.get('/me', (0, auth_1.ah)(async (req, res) => {
    const u = await (0, auth_1.currentUser)(req);
    if (!u) {
        res.status(401).json({ ok: false, error: 'Требуется вход' });
        return;
    }
    res.json({ ok: true, user: u, permissions: auth_1.PERMISSIONS[u.role] ?? [] });
}));
/* ---------- Заявки: просмотр и смена статуса (admin, manager) ---------- */
exports.adminRouter.get('/leads', (0, auth_1.requirePerm)('leads.view'), (0, auth_1.ah)(async (req, res) => {
    const status = typeof req.query.status === 'string' && req.query.status in exports.LEAD_STATUSES ? req.query.status : '';
    const counts = await (0, db_1.q)('SELECT status, count(*) AS n FROM leads WHERE NOT is_deleted GROUP BY status');
    const leads = await (0, db_1.q)(`SELECT l.id, l.name, l.phone, l.comment, l.status, l.created_at, s.title AS service_title, t.title AS tariff_title, u.full_name AS processed_name
       FROM leads l
       LEFT JOIN services s ON s.id = l.service_id
       LEFT JOIN tariffs t ON t.id = l.tariff_id
       LEFT JOIN users u ON u.id = l.processed_by
      WHERE NOT l.is_deleted AND ($1::text = '' OR l.status = $1)
      ORDER BY l.created_at DESC, l.id DESC LIMIT 300`, [status]);
    res.json({ leads, counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])) });
}));
exports.adminRouter.patch('/leads/:id', (0, auth_1.requirePerm)('leads.edit'), (0, auth_1.ah)(async (req, res) => {
    const id = Number(req.params.id);
    const next = String((req.body ?? {}).status ?? '');
    const old = await (0, db_1.q1)('SELECT status, processed_by FROM leads WHERE id = $1 AND NOT is_deleted', [id]);
    if (!old || !(next in exports.LEAD_STATUSES)) {
        res.status(400).json({ ok: false, error: 'Заявка или статус не найдены.' });
        return;
    }
    if (old.status !== next) {
        const uid = req.user.id;
        await (0, db_1.tx)(async (c) => {
            await (0, db_1.exec)('UPDATE leads SET status = $1, processed_by = $2, updated_at = now() WHERE id = $3', [next, uid, id], c);
            await (0, audit_1.audit)(uid, 'update', 'leads', id, { status: old.status, processed_by: old.processed_by }, { status: next, processed_by: uid }, c);
        });
    }
    res.json({ ok: true, message: `Статус заявки #${id} изменён на «${exports.LEAD_STATUSES[next]}».` });
}));
/* ---------- Журнал действий (admin) ---------- */
exports.adminRouter.get('/audit', (0, auth_1.requirePerm)('audit.view'), (0, auth_1.ah)(async (req, res) => {
    const per = 50;
    const page = Math.max(1, Number(req.query.p) || 1);
    const total = Number((await (0, db_1.q1)('SELECT count(*) AS n FROM audit_log')).n);
    const rows = await (0, db_1.q)(`SELECT a.id, a.user_id, a.action, a.table_name, a.record_id, a.field_name, a.old_value, a.new_value, a.created_at, u.login, u.full_name
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC, a.id DESC LIMIT $1 OFFSET $2`, [per, (page - 1) * per]);
    res.json({ rows, total, page, pages: Math.max(1, Math.ceil(total / per)) });
}));
/* ---------- Справочники ---------- */
exports.adminRouter.use('/services', crud_1.servicesCrud);
exports.adminRouter.use('/tariffs', crud_1.tariffsCrud);
exports.adminRouter.use('/reviews', crud_1.reviewsCrud);
exports.adminRouter.use('/users', crud_1.usersCrud);
/** Варианты для select в формах (услуги, роли). */
exports.adminRouter.get('/options', (0, auth_1.requirePerm)(), (0, auth_1.ah)(async (req, res) => {
    const u = req.user;
    res.json({
        services: (0, auth_1.can)(u, 'tariffs.edit') ? await (0, db_1.q)('SELECT id, title FROM services WHERE NOT is_deleted ORDER BY sort_order, id') : [],
        roles: (0, auth_1.can)(u, 'users.edit') ? await (0, db_1.q)('SELECT id, name FROM roles ORDER BY id') : [],
    });
}));
