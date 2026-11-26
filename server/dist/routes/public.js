"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRouter = void 0;
const express_1 = require("express");
const audit_1 = require("../audit");
const auth_1 = require("../auth");
const config_1 = require("../config");
const db_1 = require("../db");
const notify_1 = require("../notify");
const phone_1 = require("../phone");
exports.publicRouter = (0, express_1.Router)();
/** Настройки сайта и динамический контент (услуги, тарифы, отзывы из БД) — одним запросом при загрузке страницы. */
exports.publicRouter.get('/public', (0, auth_1.ah)(async (_req, res) => {
    const [services, tariffs, reviews] = await Promise.all([
        (0, db_1.q)('SELECT id, title, description, format FROM services WHERE NOT is_deleted ORDER BY sort_order, id'),
        (0, db_1.q)(`SELECT t.id, t.service_id, t.title, t.description, t.price::float8 AS price, t.sessions_count, t.is_featured, s.title AS service_title
         FROM tariffs t JOIN services s ON s.id = t.service_id
        WHERE NOT t.is_deleted AND NOT s.is_deleted ORDER BY t.sort_order, t.id`),
        (0, db_1.q)('SELECT id, client_name, text, rating FROM reviews WHERE is_published AND NOT is_deleted ORDER BY created_at DESC, id DESC'),
    ]);
    const s = config_1.config.site;
    res.json({
        site: { ...s },
        integrations: { ymapsKey: config_1.config.integrations.ymapsKey, metrikaId: config_1.config.integrations.metrikaId },
        services, tariffs, reviews,
    });
}));
const fail = (res, msg, code = 422, field = null) => {
    res.status(code).json({ ok: false, error: msg, field });
};
/** Приём заявки (аналог public/api/lead.php). */
exports.publicRouter.post('/lead', (0, auth_1.ah)(async (req, res) => {
    const b = (req.body ?? {});
    const str = (v) => (typeof v === 'string' ? v : '');
    // Антиспам: honeypot и слишком быстрая отправка (< 2 сек. после загрузки страницы)
    if (str(b.website).trim() !== '') {
        res.json({ ok: true });
        return;
    } // боту делаем вид, что всё хорошо
    const ts = Number(b.ts) || 0;
    if (ts > 0 && Date.now() / 1000 - ts < 2) {
        fail(res, 'Слишком быстрая отправка. Попробуйте ещё раз.', 429);
        return;
    }
    const name = str(b.name).replace(/\s+/gu, ' ').trim();
    const phone = (0, phone_1.normalizePhone)(str(b.phone));
    const comment = str(b.comment).trim();
    const consent = b.consent === true || b.consent === '1' || b.consent === 'true';
    const serviceId = /^\d+$/.test(String(b.service_id ?? '')) ? Number(b.service_id) : null;
    const tariffId = /^\d+$/.test(String(b.tariff_id ?? '')) ? Number(b.tariff_id) : null;
    if (name === '' || [...name].length > 100) {
        fail(res, 'Введите имя (не более 100 символов).', 422, 'name');
        return;
    }
    if (!/^[\p{L}\p{M}\s.'\-]+$/u.test(name)) {
        fail(res, 'Имя может содержать только буквы, пробел и дефис.', 422, 'name');
        return;
    }
    if (phone === null) {
        fail(res, 'Укажите телефон в формате +7 (XXX) XXX-XX-XX.', 422, 'phone');
        return;
    }
    if (!consent) {
        fail(res, 'Необходимо согласие на обработку персональных данных.', 422, 'consent');
        return;
    }
    if ([...comment].length > 1000) {
        fail(res, 'Комментарий слишком длинный (до 1000 символов).', 422, 'comment');
        return;
    }
    // Ссылочная целостность: услуга и тариф должны существовать
    let service = serviceId ? await (0, db_1.q1)('SELECT id, title FROM services WHERE id = $1 AND NOT is_deleted', [serviceId]) : null;
    const tariff = tariffId ? await (0, db_1.q1)('SELECT id, title, service_id FROM tariffs WHERE id = $1 AND NOT is_deleted', [tariffId]) : null;
    if (tariff && !service)
        service = await (0, db_1.q1)('SELECT id, title FROM services WHERE id = $1 AND NOT is_deleted', [tariff.service_id]);
    // Ограничения частоты: 1 заявка с номера в 5 минут, не более N с одного IP в час
    const sec = config_1.config.security;
    const ip = (0, auth_1.clientIp)(req);
    const dup = await (0, db_1.q1)(`SELECT 1 FROM leads WHERE phone = $1 AND created_at > now() - ($2 * interval '1 second')`, [phone, sec.leadCooldownSec]);
    if (dup) {
        fail(res, 'Заявка с этого номера уже отправлена. Повторить можно через 5 минут.', 429, 'phone');
        return;
    }
    const byIp = await (0, db_1.q1)(`SELECT count(*) AS n FROM leads WHERE ip_address = $1 AND created_at > now() - interval '1 hour'`, [ip]);
    if (Number(byIp?.n ?? 0) >= sec.leadIpLimit) {
        fail(res, 'Слишком много заявок. Попробуйте позже или позвоните по телефону.', 429);
        return;
    }
    let utm = str(b.utm).trim().slice(0, 255);
    if (!/^[\w\-=&%.+?]*$/u.test(utm))
        utm = '';
    const row = await (0, db_1.q1)(`INSERT INTO leads (service_id, tariff_id, name, phone, comment, consent, source_url, ip_address)
     VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7) RETURNING id`, [service?.id ?? null, tariff?.id ?? null, name, phone, comment, utm, ip]);
    const id = row.id;
    await (0, audit_1.audit)(null, 'create', 'leads', id, {}, {
        name, phone, service_id: service?.id ?? null, tariff_id: tariff?.id ?? null, comment, status: 'new', consent: 'true',
    });
    void (0, notify_1.notifyTrainer)({ id, name, phone, comment }, service?.title ?? null, tariff?.title ?? null);
    res.json({ ok: true, id });
}));
