"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTrainer = notifyTrainer;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("./config");
/** Уведомление тренеру: Telegram-бот и/или e-mail. Ошибки не ломают приём заявки. */
async function notifyTrainer(lead, serviceTitle, tariffTitle) {
    const text = `Новая заявка #${lead.id}\nИмя: ${lead.name}\nТелефон: ${lead.phone}\n` +
        `Услуга: ${serviceTitle || '—'}\nТариф: ${tariffTitle || '—'}\nКомментарий: ${lead.comment || '—'}`;
    const i = config_1.config.integrations;
    if (i.telegramToken && i.telegramChat) {
        try {
            await fetch(`https://api.telegram.org/bot${i.telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: i.telegramChat, text }),
                signal: AbortSignal.timeout(4000),
            });
        }
        catch (e) {
            console.error('Telegram:', e.message);
        }
    }
    if (i.notifyEmail && i.smtp.host) {
        try {
            const tr = nodemailer_1.default.createTransport({
                host: i.smtp.host, port: i.smtp.port, secure: i.smtp.port === 465,
                auth: i.smtp.user ? { user: i.smtp.user, pass: i.smtp.pass } : undefined,
            });
            await tr.sendMail({ from: i.smtp.user || i.notifyEmail, to: i.notifyEmail, subject: `Новая заявка #${lead.id}`, text });
        }
        catch (e) {
            console.error('E-mail:', e.message);
        }
    }
}
