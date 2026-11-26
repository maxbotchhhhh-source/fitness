import { Link } from 'react-router-dom';
import Accordion from '../components/Accordion';
import LeadForm from '../components/LeadForm';
import Slider from '../components/Slider';
import YandexMap from '../components/YandexMap';
import { content as c } from '../content';
import { useLead, usePublic } from '../context';
import { usePageMeta } from '../hooks';
import { goal, money, plural, telHref } from '../utils';

const ICONS: Record<string, JSX.Element> = {
  'Персональные тренировки': <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  'Групповые занятия': <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c3 .2 5.5 2.4 5.5 5.7" /></>,
  'Онлайн-сопровождение': <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2M10 6.5l4 2.5-4 2.5z" /></>,
};
const DEFAULT_ICON = <path d="M13 3L5 14h6l-1 7 8-11h-6z" />;

export default function Home() {
  const { site: s, services, tariffs, reviews } = usePublic();
  const { openModal, choose } = useLead();

  usePageMeta(
    'Персональный тренер в Тольятти — Максим Орлов | Запись на пробное занятие',
    'Персональные тренировки, групповые занятия и онлайн-сопровождение в Тольятти. Индивидуальная программа, результат за 12 недель. Запишитесь на пробное занятие.',
  );

  const pickTariff = (id: number, service: number, title: string) => {
    choose({ id: String(id), service: String(service), title });
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('main-name')?.focus({ preventScroll: true }), 500);
  };

  return (
    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <picture className="hero-bg"><img src="/assets/img/hero.webp" alt="" width={1920} height={1000} fetchPriority="high" /></picture>
        <div className="container hero-inner">
          <p className="eyebrow">Фитнес-тренер Максим Орлов · Тольятти</p>
          <h1 id="hero-title">{c.hero.title}</h1>
          <p className="hero-sub">{c.hero.subtitle}</p>
          <div className="hero-cta">
            <button type="button" className="btn btn-accent btn-lg" onClick={() => openModal()}>Записаться на пробное занятие</button>
            <Link className="btn btn-outline btn-lg" to="/#tariffs">Смотреть тарифы</Link>
          </div>
          <ul className="hero-stats">
            {c.hero.stats.map(([n, l]) => <li key={n}><strong>{n}</strong><span>{l}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="section" id="about" aria-labelledby="about-title">
        <div className="container">
          <h2 id="about-title">{c.about.title}</h2>
          <div className="about-grid">
            <figure className="about-photo">
              <img src="/assets/img/trainer.webp" alt="Фитнес-тренер Максим Орлов" width={640} height={800} loading="lazy" />
            </figure>
            <div className="about-body">
              <p className="lead">{c.about.lead}</p>
              {c.about.text.map((p) => <p key={p}>{p}</p>)}
              <dl className="facts">{c.about.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <h3>Сертификаты и обучение</h3>
              <ul className="certs">{c.about.certs.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="services" aria-labelledby="services-title">
        <div className="container">
          <h2 id="services-title">Услуги</h2>
          <p className="section-sub">Выберите формат, который подходит вашему графику и цели.</p>
          <div className="cards cards-3">
            {services.map((sv) => (
              <article className="card service-card" key={sv.id}>
                <svg className="card-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[sv.title] ?? DEFAULT_ICON}</svg>
                <h3>{sv.title}</h3>
                <span className="badge">{sv.format}</span>
                <p>{sv.description}</p>
                <button type="button" className="link-btn" onClick={() => openModal(String(sv.id))}>Записаться →</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="tariffs" aria-labelledby="tariffs-title">
        <div className="container">
          <h2 id="tariffs-title">Тарифы</h2>
          <p className="section-sub">Прозрачные пакеты занятий. Первое пробное занятие — бесплатно.</p>
          <div className="cards cards-3 tariffs">
            {tariffs.map((t) => {
              const per = t.sessions_count > 0 ? t.price / t.sessions_count : 0;
              const items = t.description.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
              return (
                <article className={'card tariff' + (t.is_featured ? ' tariff-featured' : '')} key={t.id}>
                  {t.is_featured && <span className="ribbon">Популярный</span>}
                  <h3>{t.title}</h3>
                  <p className="tariff-service">{t.service_title}</p>
                  <p className="price">{money(t.price)}</p>
                  <p className="price-note">{t.sessions_count} {plural(t.sessions_count, 'занятие', 'занятия', 'занятий')} · {money(per)} за занятие</p>
                  <ul className="tariff-list">{items.map((it) => <li key={it}>{it}</li>)}</ul>
                  <button type="button" className="btn btn-accent btn-block" onClick={() => pickTariff(t.id, t.service_id, `${t.title} — ${money(t.price)}`)}>Выбрать</button>
                </article>
              );
            })}
          </div>
          <div className="cta-band">
            <div>
              <h3>Не уверены, какой тариф выбрать?</h3>
              <p>Оставьте телефон — подскажу и запишу на бесплатное пробное занятие.</p>
            </div>
            <LeadForm id="cta" compact />
          </div>
        </div>
      </section>

      <section className="section section-alt" id="results" aria-labelledby="results-title">
        <div className="container">
          <h2 id="results-title">Результаты клиентов</h2>
          <p className="section-sub">Изменения за 12 недель регулярных занятий.</p>
          <p className="results-note">{c.resultsNote}</p>
          <div className="cards cards-3">
            {c.results.map((r) => (
              <figure className="card result" key={r.name}>
                <div className="ba">
                  <div><img src={`/assets/img/${r.before}`} alt={`${r.name}: до`} width={328} height={840} loading="lazy" /><span>До</span></div>
                  <div><img src={`/assets/img/${r.after}`} alt={`${r.name}: после`} width={328} height={840} loading="lazy" /><span className="after">После</span></div>
                </div>
                <figcaption><strong>{r.name}</strong><br />{r.text}<small className="meta">{r.meta}</small></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="reviews" aria-labelledby="reviews-title">
        <div className="container">
          <h2 id="reviews-title">Отзывы</h2>
          {reviews.length ? <Slider items={reviews} /> : <p className="muted">Скоро здесь появятся отзывы клиентов.</p>}
        </div>
      </section>

      <section className="section section-alt" id="faq" aria-labelledby="faq-title">
        <div className="container narrow">
          <h2 id="faq-title">Вопросы и ответы</h2>
          <Accordion items={c.faq} />
        </div>
      </section>

      <section className="section" id="booking" aria-labelledby="booking-title">
        <div className="container booking">
          <div className="booking-info">
            <h2 id="booking-title">Запишитесь на пробное занятие</h2>
            <p>Первая встреча бесплатна: познакомимся, определим цель и проведём тренировку в комфортном темпе.</p>
            <ul className="check-list">
              <li>Ответ в течение рабочего дня</li>
              <li>Подберём формат под ваш график</li>
              <li>Без обязательств и скрытых платежей</li>
            </ul>
            <p className="messengers">
              {s.telegram && <a className="btn btn-outline-dark btn-sm" href={s.telegram} target="_blank" rel="noopener noreferrer" onClick={() => goal('messenger_click')}>Написать в Telegram</a>}
              {s.whatsapp && <a className="btn btn-outline-dark btn-sm" href={s.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => goal('messenger_click')}>Написать в WhatsApp</a>}
            </p>
          </div>
          <div className="booking-form card"><LeadForm id="main" /></div>
        </div>
      </section>

      <section className="section section-alt" id="contacts" aria-labelledby="contacts-title">
        <div className="container">
          <h2 id="contacts-title">Контакты</h2>
          <div className="contacts-grid">
            <div className="contact-list">
              <p><span className="muted">Телефон</span><br /><a className="big-link" href={telHref(s.phone)} onClick={() => goal('phone_click')}>{s.phone}</a></p>
              <p><span className="muted">Адрес занятий</span><br />{s.address}</p>
              <p><span className="muted">Режим работы</span><br />{s.workHours}</p>
              {s.email && <p><span className="muted">E-mail</span><br /><a href={`mailto:${s.email}`}>{s.email}</a></p>}
              <a className="btn btn-accent" target="_blank" rel="noopener noreferrer" href={`https://yandex.ru/maps/?rtext=~${s.mapLat},${s.mapLon}&rtt=auto`}>Построить маршрут</a>
            </div>
            <YandexMap />
          </div>
        </div>
      </section>
    </main>
  );
}
