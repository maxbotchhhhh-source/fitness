"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePerm = exports.can = exports.clientIp = exports.ah = exports.COOKIE = exports.PERMISSIONS = void 0;
exports.currentUser = currentUser;
exports.attemptLogin = attemptLogin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const audit_1 = require("./audit");
const config_1 = require("./config");
const db_1 = require("./db");
/** RBAC: разрешения ролей (как в app/auth.php). Посетитель сайта — без входа. */
exports.PERMISSIONS = {
    admin: ['leads.view', 'leads.edit', 'services.edit', 'tariffs.edit', 'reviews.edit', 'users.edit', 'audit.view'],
    manager: ['leads.view', 'leads.edit'],
};
exports.COOKIE = 'orlov_sid';
const ah = (fn) => (req, res, next) => { fn(req, res, next).catch(next); };
exports.ah = ah;
const clientIp = (req) => String(req.ip ?? '').slice(0, 45);
exports.clientIp = clientIp;
/** Пользователь из cookie-сессии; данные каждый раз берутся из БД (удалённый пользователь теряет доступ сразу). */
async function currentUser(req) {
    const token = req.cookies?.[exports.COOKIE];
    if (!token)
        return null;
    try {
        const p = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        return await (0, db_1.q1)(`SELECT u.id, u.login, u.full_name, r.code AS role, r.name AS role_name
         FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND NOT u.is_deleted`, [Number(p.sub)]);
    }
    catch {
        return null;
    }
}
const can = (u, perm) => !!u && (exports.PERMISSIONS[u.role] ?? []).includes(perm);
exports.can = can;
const requirePerm = (perm) => (0, exports.ah)(async (req, res, next) => {
    const u = await currentUser(req);
    if (!u) {
        res.status(401).json({ ok: false, error: 'Требуется вход' });
        return;
    }
    if (perm && !(0, exports.can)(u, perm)) {
        res.status(403).json({ ok: false, error: `У вашей роли («${u.role_name}») нет доступа к этому разделу.` });
        return;
    }
    req.user = u;
    next();
});
exports.requirePerm = requirePerm;
const DUMMY_HASH = bcryptjs_1.default.hashSync('dummy-password', 10);
/** Возвращает null при успехе или текст ошибки. */
async function attemptLogin(req, res, login, password) {
    const ip = (0, exports.clientIp)(req);
    const fails = await (0, db_1.q1)(`SELECT count(*) AS n FROM login_attempts WHERE ip_address = $1 AND created_at > now() - interval '15 minutes'`, [ip]);
    if (Number(fails?.n ?? 0) >= config_1.config.security.loginMaxFail)
        return 'Слишком много попыток входа. Повторите через 15 минут.';
    const u = await (0, db_1.q1)('SELECT id, password_hash FROM users WHERE login = $1 AND NOT is_deleted', [login]);
    // сравнение хэша выполняем всегда — по времени ответа нельзя узнать, существует ли логин
    const ok = await bcryptjs_1.default.compare(password, u?.password_hash ?? DUMMY_HASH).catch(() => false);
    if (!u || !ok) {
        await (0, db_1.exec)('INSERT INTO login_attempts (ip_address, login) VALUES ($1, $2)', [ip, login.slice(0, 50)]);
        return 'Неверный логин или пароль.';
    }
    const token = jsonwebtoken_1.default.sign({ sub: String(u.id) }, config_1.config.jwtSecret, { expiresIn: '12h' });
    res.cookie(exports.COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
    await (0, db_1.exec)('DELETE FROM login_attempts WHERE ip_address = $1', [ip]);
    await (0, audit_1.audit)(u.id, 'login', 'users', u.id);
    return null;
}
