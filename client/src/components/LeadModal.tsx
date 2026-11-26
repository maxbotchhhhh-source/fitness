import { useEffect, useRef } from 'react';
import { useLead } from '../context';
import LeadForm from './LeadForm';

/** Окно «Запись на пробное занятие» (кнопка в шапке, «Записаться →» в услугах). */
export default function LeadModal() {
  const { modal, closeModal } = useLead();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (modal.open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      d.querySelector<HTMLInputElement>('input[name=name]')?.focus();
    }
    if (!modal.open && d.open) d.close();
  }, [modal.open, modal.key]);

  return (
    <dialog
      className="modal" ref={ref} aria-labelledby="modal-title"
      onClose={closeModal}
      onClick={(e) => { if (e.target === ref.current) closeModal(); }} // клик по подложке
    >
      <button type="button" className="modal-close" aria-label="Закрыть" onClick={closeModal}>×</button>
      <h2 id="modal-title">Запись на пробное занятие</h2>
      <p className="muted">Оставьте контакты — я перезвоню в течение рабочего дня.</p>
      <LeadForm key={modal.key} id="modal" compact initialService={modal.service} onSent={() => setTimeout(closeModal, 4000)} />
    </dialog>
  );
}
