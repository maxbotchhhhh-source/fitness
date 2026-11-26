import 'dotenv/config';

const env = (k: string, d = ''): string => process.env[k] ?? d;

/** Настройки. Значения берутся из server/.env (см. .env.example). Аналог app/config.php. */
export const config = {
  port: Number(env('PORT', '3000')),
  isProd: env('NODE_ENV') === 'production',
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
  databaseUrl: env('DATABASE_URL', 'postgres://orlov:orlov_pass@localhost:5432/orlov_fitness'),
  admin: { login: env('ADMIN_LOGIN', 'admin'), password: env('ADMIN_PASSWORD', 'ChangeMe123!') },
  site: {
    name: 'Максим Орлов — персональный тренер',
    trainer: 'Максим Орлов',
    phone: env('SITE_PHONE', '+7 (900) 000-00-00'),
    email: env('SITE_EMAIL', 'info@example.ru'),
    telegram: env('SITE_TELEGRAM', 'https://t.me/maksim_orlov_fit'),
    whatsapp: env('SITE_WHATSAPP', 'https://wa.me/79000000000'),
    vk: env('SITE_VK', 'https://vk.com/'),
    address: env('SITE_ADDRESS', 'г. Тольятти, ул. Мира, 1 (фитнес-студия)'),
    mapLat: Number(env('MAP_LAT', '53.5078')),
    mapLon: Number(env('MAP_LON', '49.4204')),
    workHours: env('SITE_WORK_HOURS', 'Ежедневно, 07:00 – 22:00'),
    operator: 'Орлов Максим (оператор персональных данных)',
  },
  integrations: {
    ymapsKey: env('YMAPS_KEY'),
    metrikaId: Number(env('METRIKA_ID', '0')) || 0,
    telegramToken: env('TG_BOT_TOKEN'),
    telegramChat: env('TG_CHAT_ID'),
    notifyEmail: env('NOTIFY_EMAIL'),
    smtp: { host: env('SMTP_HOST'), port: Number(env('SMTP_PORT', '587')), user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  },
  security: {
    leadCooldownSec: 300, // не чаще 1 заявки с номера в 5 минут
    leadIpLimit: 10,      // не более N заявок с одного IP в час
    loginMaxFail: 5,      // неудачных входов за 15 минут
  },
};
