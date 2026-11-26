<<<<<<< HEAD
# Лендинг фитнес-тренера Максима Орлова — React + Express + PostgreSQL

Сайт полностью перенесён с PHP на стек:

| Часть | Технологии |
|---|---|
| Клиент (`client/`) | React 18 + Vite 5 + TypeScript, React Router |
| Сервер (`server/`) | Node.js + Express 4 + TypeScript |
| База данных | PostgreSQL 15+ (схема и стартовые данные — те же, что были, `server/sql/`) |
| Хостинг | [tuna.am](https://tuna.am) — публичная https-ссылка на локальный сервер |

Внешний вид, тексты, картинки (WebP), шрифты Montserrat/Roboto и стили сохранены без изменений.
Функциональность прежняя: лендинг, заявки, админ-панель, журнал действий.

## Что было → что стало

| Было (PHP) | Стало |
|---|---|
| `public/index.php`, `privacy.php`, `thanks.php` | React-страницы `client/src/pages/` |
| `public/assets/js/main.js` | React-компоненты `client/src/components/` (меню, форма с маской телефона, слайдер, аккордеон, карта, cookie, «Наверх») |
| `public/api/lead.php` | `POST /api/lead` — `server/src/routes/public.ts` |
| `public/admin/*.php`, `app/crud.php` | React-админка `client/src/admin/` + `server/src/routes/admin.ts`, `crud.ts` |
| `app/auth.php` (сессии, RBAC) | `server/src/auth.ts` (cookie с JWT, роли admin / manager) |
| `app/db.php` (PDO) | `server/src/db.ts` (`pg`, подготовленные запросы) |
| `app/config.php`, `config.local.php` | `server/.env` (см. `.env.example`) |
| `bin/install.php`, `bin/create_user.php` | `npm run db:init`, `npm run user:create` |
| `database/schema.sql`, `seed.sql` | `server/sql/schema.sql`, `seed.sql` (без изменений) |

## Структура

```
orlov-fitness/
├── client/                   React + Vite + TypeScript
│   ├── public/assets/        изображения WebP, шрифты
│   └── src/
│       ├── pages/            Home, Privacy, Thanks
│       ├── components/       Header, Footer, LeadForm, Slider, Accordion, YandexMap …
│       ├── admin/            админ-панель (заявки, услуги, тарифы, отзывы, пользователи, журнал)
│       ├── content.ts        тексты лендинга (hero, «Обо мне», FAQ, результаты)
│       └── styles/           style.css, admin.css
├── server/                   Node.js + Express + TypeScript
│   ├── sql/                  schema.sql, seed.sql
│   └── src/                  index.ts, routes/, auth.ts, audit.ts, db.ts, notify.ts, scripts/
├── docker-compose.yml        PostgreSQL 16
└── .env.example              настройки
```

## Запуск (локально)

Нужны Node.js 18+ и Docker (для PostgreSQL) — или установленный PostgreSQL 15+.

```bash
npm run install:all          # зависимости корня, сервера и клиента
cp .env.example server/.env  # откройте и задайте JWT_SECRET, ADMIN_PASSWORD, телефон и ссылки тренера
npm run db:up                # PostgreSQL в Docker (пользователь orlov / orlov_pass, база orlov_fitness)
npm run db:init              # таблицы + стартовые данные + администратор
npm run dev                  # сервер :3000 и клиент :5173
```

Сайт: http://localhost:5173 · админка: http://localhost:5173/admin (логин и пароль — `ADMIN_LOGIN` / `ADMIN_PASSWORD` из `server/.env`).
Без Docker создайте базу и пользователя вручную и впишите строку подключения в `DATABASE_URL`.

Дополнительный пользователь (например, менеджер):
```bash
npm run user:create -- manager 'ПарольМенеджера1' manager 'Имя Менеджера'
```

## Публикация на tuna.am

Express сам раздаёт собранный клиент, поэтому нужен один порт — 3000.

```bash
npm run build                # сборка клиента и сервера
# в server/.env: NODE_ENV=production
npm run start                # сайт на http://localhost:3000

# в другом окне терминала:
tuna config save-token <ВАШ_ТОКЕН>   # один раз, токен из личного кабинета tuna.am
npm run tunnel                       # то же, что: tuna http 3000
```

Tuna выведет адрес вида `https://xxxx.tuna.am` — это ссылка на сайт. Пока работают `npm run start`, `tuna` и база данных, сайт доступен из интернета.
Cookie админки получают флаг `Secure` автоматически (сервер видит https через заголовки прокси). Установку tuna и постоянный поддомен смотрите в документации tuna.am.

## Интеграции (в `server/.env`, необязательно)

- `YMAPS_KEY` — ключ JavaScript API Яндекс Карт (без него вместо карты — ссылка на Яндекс Карты);
- `METRIKA_ID` — счётчик Яндекс Метрики (цели `form_submit`, `phone_click`, `messenger_click`);
- `TG_BOT_TOKEN` + `TG_CHAT_ID` — уведомления тренеру в Telegram;
- `NOTIFY_EMAIL` + `SMTP_*` — уведомления на почту.

## Безопасность

Подготовленные запросы (`pg`), экранирование React, CSRF-токен (cookie + заголовок), honeypot и проверка времени отправки формы,
не более 1 заявки с номера в 5 минут и 10 с одного IP в час, bcrypt-хэши паролей, лимит попыток входа (5 за 15 минут),
мягкое удаление с `deleted_by` и запрет `DELETE` триггерами БД, журнал `audit_log`, заголовки безопасности (helmet).

## Заметки

- Фото «до/после» и тренера сгенерированы нейросетью, клиенты вымышленные (подпись есть на сайте). Для боевого сайта замените реальными (`client/public/assets/img/`).
- Телефон, адрес и соцсети задаются в `server/.env`; тексты лендинга — в `client/src/content.ts`; услуги, тарифы и отзывы — в админ-панели.
- Сразу после установки смените пароль администратора в разделе «Пользователи».
=======
# orlov.fitnes
Fitness trainer landing page project
>>>>>>> 557bd5b1249f12a234e5b693ed33fd4f32e87e50
