import { useCallback, useEffect, useRef, useState } from 'react';
import type { Review } from '../types';

/** Слайдер отзывов: стрелки, точки, свайп (scroll-snap), стрелки клавиатуры. */
export default function Slider({ items }: { items: Review[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [cur, setCur] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const step = useCallback(() => {
    const t = track.current;
    if (!t) return 1;
    const s = t.querySelectorAll<HTMLElement>('.slide');
    return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : t.clientWidth;
  }, []);

  const update = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const st = step();
    const perView = Math.max(1, Math.round(t.clientWidth / st));
    const p = Math.max(1, items.length - perView + 1);
    setPages(p);
    setCur(Math.min(Math.round(t.scrollLeft / st), p - 1));
    setAtStart(t.scrollLeft <= 2);
    setAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 2);
  }, [items.length, step]);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  const by = (dir: number) => track.current?.scrollBy({ left: dir * step(), behavior: 'smooth' });

  return (
    <div className="slider" aria-roledescription="карусель" aria-label="Отзывы клиентов">
      <div className="slider-track" tabIndex={0} ref={track}
        onScroll={() => window.requestAnimationFrame(update)}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') by(1); else if (e.key === 'ArrowLeft') by(-1); }}>
        {items.map((rv, i) => (
          <blockquote className="slide card" key={rv.id} aria-roledescription="слайд" aria-label={`${i + 1} из ${items.length}`}>
            <div className="stars" role="img" aria-label={`Оценка ${rv.rating} из 5`}>
              {'★'.repeat(rv.rating)}{Array.from({ length: 5 - rv.rating }, (_, k) => <span className="off" key={k}>★</span>)}
            </div>
            <p style={{ whiteSpace: 'pre-line' }}>{rv.text}</p>
            <footer>— {rv.client_name}</footer>
          </blockquote>
        ))}
      </div>
      <div className="slider-nav">
        <button type="button" className="arrow" aria-label="Предыдущий отзыв" disabled={atStart} onClick={() => by(-1)}>←</button>
        <div className="dots">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" aria-label={`Отзыв ${i + 1}`} aria-current={i === cur ? 'true' : 'false'}
              onClick={() => track.current?.scrollTo({ left: i * step(), behavior: 'smooth' })} />
          ))}
        </div>
        <button type="button" className="arrow" aria-label="Следующий отзыв" disabled={atEnd} onClick={() => by(1)}>→</button>
      </div>
    </div>
  );
}
