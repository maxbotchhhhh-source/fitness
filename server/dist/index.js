"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const csrf_1 = require("./csrf");
const db_1 = require("./db");
const admin_1 = require("./routes/admin");
const public_1 = require("./routes/public");
const app = (0, express_1.default)();
app.set('trust proxy', 1); // за туннелем tuna.am / reverse-proxy: берём реальный IP и https из X-Forwarded-*
// Заголовки безопасности (X-Content-Type-Options, X-Frame-Options, Referrer-Policy и др.).
// CSP отключён: Яндекс Карты и Метрика подгружают скрипты со своих доменов.
app.use((0, helmet_1.default)({ contentSecurityPolicy: false, hsts: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: false, crossOriginResourcePolicy: false, xFrameOptions: { action: 'sameorigin' } }));
app.use(express_1.default.json({ limit: '50kb' }));
app.use((0, cookie_parser_1.default)());
const api = express_1.default.Router();
api.get('/health', (_req, res) => { res.json({ ok: true }); });
api.get('/csrf', csrf_1.csrfToken);
api.use(csrf_1.verifyCsrf); // POST/PUT/PATCH/DELETE требуют CSRF-токен
api.use(public_1.publicRouter);
api.use('/admin', admin_1.adminRouter);
api.use((_req, res) => { res.status(404).json({ ok: false, error: 'Не найдено' }); });
app.use('/api', api);
// Раздача собранного клиента (npm run build): один сервер, один порт — удобно для tuna.am
const clientDist = path_1.default.resolve(__dirname, '../../client/dist');
if (fs_1.default.existsSync(clientDist)) {
    app.use(express_1.default.static(clientDist, { index: false, maxAge: '7d', setHeaders: (res, p) => { if (p.endsWith('.html'))
            res.setHeader('Cache-Control', 'no-cache'); } }));
    app.get('*', (_req, res) => { res.sendFile(path_1.default.join(clientDist, 'index.html')); });
}
else {
    app.get('/', (_req, res) => { res.send('API работает. Клиент: «npm run dev» (разработка) или «npm run build» (сборка).'); });
}
const errorHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
};
app.use(errorHandler);
const server = app.listen(config_1.config.port, () => console.log(`Сервер: http://localhost:${config_1.config.port}`));
const stop = () => { server.close(); void db_1.pool.end(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
