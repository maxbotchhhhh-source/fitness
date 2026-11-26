import { useState } from 'react';

/** Аккордеон «Вопросы и ответы». */
export default function Accordion({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <div className="accordion">
      {items.map(([qq, aa], i) => (
        <div className="acc-item" key={i}>
          <h3>
            <button type="button" className="acc-btn" aria-expanded={open.has(i)} aria-controls={`faq-${i}`} id={`faq-btn-${i}`} onClick={() => toggle(i)}>
              {qq}<span className="acc-ico" aria-hidden="true" />
            </button>
          </h3>
          <div className="acc-panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} hidden={!open.has(i)}><p>{aa}</p></div>
        </div>
      ))}
    </div>
  );
}
