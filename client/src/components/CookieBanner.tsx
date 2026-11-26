import { useState } from 'react';
import { Link } from 'react-router-dom';
import { store } from '../utils';

export default function CookieBanner() {
  const [hidden, setHidden] = useState(() => !!store.get('cookie_ok'));
  return (
    <div className="cookie" hidden={hidden} role="dialog" aria-label="Уведомление о cookie">
      <p>Мы используем файлы cookie и сервис Яндекс Метрика для работы сайта и аналитики. Продолжая пользоваться сайтом, вы соглашаетесь с <Link to="/privacy" target="_blank">политикой обработки персональных данных</Link>.</p>
      <button type="button" className="btn btn-accent btn-sm" onClick={() => { store.set('cookie_ok', '1'); setHidden(true); }}>Принять</button>
    </div>
  );
}
