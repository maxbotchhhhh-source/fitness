import { useEffect, useRef } from 'react';
import { usePublic } from '../context';

declare const ymaps: any;

/** Яндекс Карты: загружаются, когда блок приблизился к экрану. Без ключа YMAPS_KEY — ссылка на Яндекс Карты. */
export default function YandexMap() {
  const { site, integrations } = usePublic();
  const el = useRef<HTMLDivElement>(null);
  const key = integrations.ymapsKey;

  useEffect(() => {
    const box = el.current;
    if (!box || !key) return;
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      const sc = document.createElement('script');
      sc.src = 'https://api-maps.yandex.ru/2.1/?apikey=' + encodeURIComponent(key) + '&lang=ru_RU';
      sc.onload = () => {
        ymaps.ready(() => {
          box.innerHTML = '';
          box.style.display = 'block';
          const c = [site.mapLat, site.mapLon];
          const map = new ymaps.Map(box, { center: c, zoom: 15, controls: ['zoomControl', 'geolocationControl', 'routeButtonControl'] });
          map.geoObjects.add(new ymaps.Placemark(c, { balloonContent: site.address, hintContent: 'Место проведения занятий' }, { preset: 'islands#redDotIcon' }));
          map.behaviors.disable('scrollZoom');
        });
      };
      document.head.appendChild(sc);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '300px' });
      io.observe(box);
      return () => io.disconnect();
    }
    load();
  }, [key, site.mapLat, site.mapLon, site.address]);

  return (
    <div className="map" id="map" ref={el} role="region" aria-label="Карта: место проведения занятий">
      <p className="map-fallback">
        {site.address}<br />
        <a href={`https://yandex.ru/maps/?pt=${site.mapLon},${site.mapLat}&z=16&l=map`} target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах</a>
      </p>
    </div>
  );
}
