"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCsrf = exports.csrfToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
/** CSRF (double submit cookie): токен в cookie и такой же в заголовке X-CSRF-Token. */
const csrfToken = (req, res) => {
    let t = req.cookies?.csrf;
    if (!t) {
        t = crypto_1.default.randomBytes(32).toString('hex');
        res.cookie('csrf', t, { sameSite: 'lax', secure: req.secure, httpOnly: false });
    }
    res.json({ token: t });
};
exports.csrfToken = csrfToken;
const verifyCsrf = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
        return next();
    const c = req.cookies?.csrf;
    const h = req.get('x-csrf-token');
    if (!c || !h || c !== h) {
        res.status(419).json({ ok: false, error: 'Сессия устарела. Обновите страницу и повторите действие.' });
        return;
    }
    next();
};
exports.verifyCsrf = verifyCsrf;
