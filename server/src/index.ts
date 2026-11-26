import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { csrfToken, verifyCsrf } from './csrf';
import { pool } from './db';
import { adminRouter } from './routes/admin';
import { publicRouter } from './routes/public';

const app = express();
app.set('trust proxy', 1); // за туннелем tuna.am / reverse-proxy: берём реальный IP и https из X-Forwarded-*

// Заголовки безопасности (X-Content-Type-Options, X-Frame-Options, Referrer-Policy и др.).
// CSP отключён: Яндекс Карты и Метрика подгружают скрипты со своих доменов.
app.use(helmet({ contentSecurityPolicy: false, hsts: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: false, crossOriginResourcePolicy: false, xFrameOptions: { action: 'sameorigin' } }));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

const api = express.Router();
api.get('/health', (_req, res) => { res.json({ ok: true }); });
api.get('/csrf', csrfToken);
api.use(verifyCsrf); // POST/PUT/PATCH/DELETE требуют CSRF-токен
api.use(publicRouter);
api.use('/admin', adminRouter);
api.use((_req, res) => { res.status(404).json({ ok: false, error: 'Не найдено' }); });
app.use('/api', api);

// Раздача собранного клиента (npm run build): один сервер, один порт — удобно для tuna.am
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '7d', setHeaders: (res, p) => { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
  app.get('*', (_req, res) => { res.sendFile(path.join(clientDist, 'index.html')); });
} else {
  app.get('/', (_req, res) => { res.send('API работает. Клиент: «npm run dev» (разработка) или «npm run build» (сборка).'); });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
};
app.use(errorHandler);

const server = app.listen(config.port, () => console.log(`Сервер: http://localhost:${config.port}`));
const stop = () => { server.close(); void pool.end(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
