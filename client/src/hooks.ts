import { useEffect } from 'react';

/** Заголовок, описание и robots для страницы (SEO). */
export function usePageMeta(title: string, description: string, noindex = false): void {
  useEffect(() => {
    document.title = title;
    const set = (name: string, content: string | null) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (content === null) { el?.remove(); return; }
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    set('description', description);
    set('robots', noindex ? 'noindex, follow' : null);
  }, [title, description, noindex]);
}
