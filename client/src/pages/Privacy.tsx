import { Link } from 'react-router-dom';
import { usePublic } from '../context';
import { usePageMeta } from '../hooks';
import { goal, telHref } from '../utils';

export default function Privacy({ notFound = false }: { notFound?: boolean }) {
  const { site: s } = usePublic();
  usePageMeta(
    notFound ? 'Страница не найдена — Максим Орлов' : 'Политика конфиденциальности — Максим Орлов',
    'Политика обработки персональных данных на сайте фитнес-тренера Максима Орлова.', true,
  );
  if (notFound) {
    return (
      <main id="main" className="inner-page">
        <div className="container narrow thanks">
          <h1 className="page-title">Страница не найдена</h1>
          <p className="lead">Такой страницы нет. Вернитесь на главную.</p>
          <div className="page-actions"><Link className="btn btn-accent" to="/">На главную</Link></div>
        </div>
      </main>
    );
  }
  const today = new Date().toLocaleDateString('ru-RU');
  return (
    <main id="main" className="inner-page">
      <div className="container narrow">
        <nav className="crumbs" aria-label="Навигация"><Link to="/">На главную</Link> / Политика конфиденциальности</nav>
        <h1 className="page-title">Политика конфиденциальности</h1>
        <p className="muted">Редакция от {today}. Настоящая политика составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>

        <h2>1. Общие положения</h2>
        <p>Оператором персональных данных является {s.operator} (далее — Оператор). Политика определяет порядок обработки и защиты персональных данных пользователей сайта.</p>

        <h2>2. Какие данные мы собираем</h2>
        <ul>
          <li>имя;</li><li>номер телефона;</li><li>выбранная услуга и тариф;</li>
          <li>текст комментария, который вы указали в форме;</li>
          <li>технические данные: IP-адрес, сведения о браузере, файлы cookie, данные Яндекс Метрики.</li>
        </ul>

        <h2>3. Цели обработки</h2>
        <ul>
          <li>обратная связь по заявке и запись на пробное занятие;</li>
          <li>заключение и исполнение договора оказания услуг;</li>
          <li>улучшение работы сайта и анализ его посещаемости.</li>
        </ul>

        <h2>4. Правовое основание</h2>
        <p>Обработка осуществляется на основании согласия субъекта персональных данных, которое даётся отметкой в форме заявки.</p>

        <h2>5. Хранение и защита</h2>
        <p>Персональные данные хранятся на территории Российской Федерации. Применяются организационные и технические меры защиты: шифрование соединения (HTTPS), разграничение прав доступа, резервное копирование. Данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством.</p>

        <h2>6. Срок хранения</h2>
        <p>Данные хранятся в течение срока, необходимого для достижения целей обработки, но не дольше 3 лет с момента последнего обращения, если иное не предусмотрено законом.</p>

        <h2>7. Права пользователя</h2>
        <p>Вы вправе запросить сведения об обработке своих данных, потребовать их уточнения, блокирования или удаления, а также отозвать согласие. Для этого свяжитесь с Оператором: <a href={telHref(s.phone)} onClick={() => goal('phone_click')}>{s.phone}</a>{s.email && <>, <a href={`mailto:${s.email}`}>{s.email}</a></>}.</p>

        <h2>8. Файлы cookie</h2>
        <p>Сайт использует cookie для корректной работы форм и сбора статистики. Вы можете отключить cookie в настройках браузера, при этом часть функций может работать некорректно.</p>

        <div className="page-actions">
          <Link className="btn btn-accent" to="/">На главную</Link>
          <button type="button" className="btn btn-outline-dark" onClick={() => { if (history.length > 1 && window.opener === null) history.back(); else window.close(); }}>Назад</button>
        </div>
        <div className="trainer-contacts card">
          <strong>Контакты тренера:</strong>
          <a href={telHref(s.phone)} onClick={() => goal('phone_click')}>{s.phone}</a>
          {s.telegram && <a href={s.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>}
          {s.whatsapp && <a href={s.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        </div>
      </div>
    </main>
  );
}
