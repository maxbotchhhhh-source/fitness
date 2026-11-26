import { useEffect, useState } from 'react';

export default function ToTop() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const on = () => setHidden(window.scrollY < 700);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return <button type="button" className="to-top" aria-label="Наверх" hidden={hidden} onClick={() => window.scrollTo({ top: 0 })}>↑</button>;
}
