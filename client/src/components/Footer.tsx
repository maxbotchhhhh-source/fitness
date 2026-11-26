import { Link, useLocation } from 'react-router-dom';
import { usePublic } from '../context';
import { goal, telHref } from '../utils';

export default function Footer() {
  const { site: s } = usePublic();
  const { pathname } = useLocation();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-logo">ОРЛОВ<b>FIT</b></div>
          <p>Персональный фитнес-тренер в Тольятти. Результат за 12 недель без изнурительных диет.</p>
        </div>
        <div>
          <h3>Контакты</h3>
          <p><a href={telHref(s.phone)} onClick={() => goal('phone_click')}>{s.phone}</a></p>
          <p>{s.address}</p>
          <p>{s.workHours}</p>
        </div>
        <div>
          <h3>Мы в сети</h3>
          <ul className="social">
            {s.telegram && <li><a href={s.telegram} target="_blank" rel="noopener noreferrer">Telegram</a></li>}
            {s.whatsapp && <li><a href={s.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            {s.vk && <li><a href={s.vk} target="_blank" rel="noopener noreferrer">ВКонтакте</a></li>}
          </ul>
        </div>
        <div>
          <h3>Информация</h3>
          <p><Link to="/privacy" target="_blank">Политика конфиденциальности</Link></p>
          {pathname !== '/' && <p><Link to="/">На главную</Link></p>}
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} Максим Орлов. Все права защищены.</div>
    </footer>
  );
}
