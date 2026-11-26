import { Link, useNavigate } from 'react-router-dom';
import { usePublic } from '../context';
import { usePageMeta } from '../hooks';
import { goal, telHref } from '../utils';

export default function Thanks() {
  const { site: s } = usePublic();
  const nav = useNavigate();
  usePageMeta('Спасибо за заявку — Максим Орлов', 'Заявка на пробное занятие принята.', true);
  return (
    <main id="main" className="inner-page">
      <div className="container narrow thanks">
        <div className="thanks-ico" aria-hidden="true">✓</div>
        <h1 className="page-title">Спасибо за заявку!</h1>
        <p className="lead">Я получил ваши данные и свяжусь с вами в течение рабочего дня (обычно в течение 2–3 часов с 09:00 до 21:00), чтобы согласовать время пробного занятия.</p>
        <div className="page-actions">
          <Link className="btn btn-accent" to="/">На главную</Link>
          <button type="button" className="btn btn-outline-dark" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}>Назад</button>
        </div>
        <div className="trainer-contacts card">
          <strong>Не хотите ждать?</strong>
          <a href={telHref(s.phone)} onClick={() => goal('phone_click')}>{s.phone}</a>
          {s.telegram && <a href={s.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>}
          {s.whatsapp && <a href={s.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        </div>
      </div>
    </main>
  );
}
