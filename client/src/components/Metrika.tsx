import { useEffect } from 'react';
import { usePublic } from '../context';

/** Яндекс Метрика: подключается, если в настройках сервера задан METRIKA_ID. */
export default function Metrika() {
  const id = usePublic().integrations.metrikaId;
  useEffect(() => {
    if (!id) return;
    const w = window as unknown as { ym?: (...a: unknown[]) => void; __metrika?: number };
    if (w.ym) return;
    w.__metrika = id;
    const ym = function (...args: unknown[]) {
      const f = ym as unknown as { a?: unknown[][] };
      (f.a = f.a || []).push(args);
    };
    w.ym = ym;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);
    w.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  }, [id]);
  return null;
}
