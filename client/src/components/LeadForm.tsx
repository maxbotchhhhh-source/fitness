import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useLead, usePublic } from '../context';
import { goal, maskPhone } from '../utils';

type Errors = Partial<Record<'name' | 'phone' | 'consent' | 'comment', string>>;
interface Props { id: string; compact?: boolean; initialService?: string; onSent?: () => void }

/** Лид-форма: имя, телефон, услуга, комментарий, согласие ФЗ-152. Отправка без перезагрузки страницы. */
export default function LeadForm({ id, compact = false, initialService = '', onSent }: Props) {
  const { services } = usePublic();
  const { chosen, clearChosen } = useLead();
  const loadedAt = useRef(Math.floor(Date.now() / 1000));

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState(initialService);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ type: '' | 'ok' | 'err'; msg: string }>({ type: '', msg: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (chosen.service) setService(chosen.service); }, [chosen.service, chosen.id]);

  function onPhone(value: string, e: React.ChangeEvent<HTMLInputElement>) {
    const ne = e.nativeEvent as InputEvent;
    if (ne.inputType && ne.inputType.startsWith('delete') && !/\d$/.test(value)) { setPhone(value); return; }
    setPhone(maskPhone(value));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus({ type: '', msg: '' });
    const er: Errors = {};
    if (!name.trim()) er.name = 'Введите имя';
    if (phone.replace(/\D/g, '').length !== 11) er.phone = 'Введите телефон полностью';
    if (!consent) er.consent = '';
    setErrors(er);
    if (Object.keys(er).length) {
      if (er.consent !== undefined) setStatus({ type: 'err', msg: 'Необходимо согласие на обработку персональных данных.' });
      document.getElementById(`${id}-${er.name ? 'name' : er.phone ? 'phone' : 'consent'}`)?.focus();
      return;
    }

    setSending(true);
    try {
      await api('/lead', {
        method: 'POST',
        body: { name, phone, comment, consent, website, ts: loadedAt.current, utm: location.search.slice(0, 200),
          service_id: service, tariff_id: chosen.id },
      });
      goal('form_submit');
      setSent(true);
      setStatus({ type: 'ok', msg: '' });
      setName(''); setPhone(''); setComment(''); setConsent(false); setService('');
      clearChosen();
      onSent?.();
    } catch (err) {
      const d = err instanceof ApiError ? err.data : {};
      setStatus({ type: 'err', msg: d.error || 'Не удалось отправить заявку. Попробуйте ещё раз.' });
      const f = d.field as keyof Errors | undefined | null;
      if (f && ['name', 'phone', 'comment', 'consent'].includes(f)) {
        setErrors({ [f]: d.error });
        document.getElementById(`${id}-${f}`)?.focus();
      }
    } finally {
      setSending(false);
    }
  }

  const field = (k: keyof Errors) => 'field' + (errors[k] ? ' invalid' : '');
  return (
    <form className={'lead-form' + (compact ? ' lead-form-compact' : '') + (sent ? ' sent' : '')} onSubmit={submit} noValidate>
      <div className="hp" aria-hidden="true"><label>Не заполняйте это поле<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
      {chosen.id && (
        <div className="chosen-tariff"><span>Тариф: {chosen.title}</span><button type="button" aria-label="Убрать выбранный тариф" onClick={clearChosen}>×</button></div>
      )}
      <div className="form-row">
        <div className={field('name')}>
          <label htmlFor={`${id}-name`}>Ваше имя</label>
          <input id={`${id}-name`} name="name" type="text" maxLength={100} autoComplete="name" required placeholder="Как к вам обращаться"
            aria-invalid={errors.name ? true : undefined} value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <div className="field-err">{errors.name}</div>}
        </div>
        <div className={field('phone')}>
          <label htmlFor={`${id}-phone`}>Телефон</label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+7 (___) ___-__-__"
            aria-invalid={errors.phone ? true : undefined} value={phone}
            onChange={(e) => onPhone(e.target.value, e)}
            onFocus={() => { if (!phone) setPhone('+7 ('); }}
            onBlur={() => { if (phone.replace(/\D/g, '').length <= 1) setPhone(''); }} />
          {errors.phone && <div className="field-err">{errors.phone}</div>}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-service`}>Услуга</label>
        <select id={`${id}-service`} name="service_id" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Пока не определился</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      {!compact && (
        <div className="field">
          <label htmlFor={`${id}-comment`}>Комментарий <span className="muted">(необязательно)</span></label>
          <textarea id={`${id}-comment`} name="comment" rows={3} maxLength={1000} placeholder="Цель, ограничения по здоровью, удобное время" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      )}
      <label className={'check' + (errors.consent !== undefined ? ' invalid' : '')}>
        <input id={`${id}-consent`} type="checkbox" name="consent" required aria-invalid={errors.consent !== undefined ? true : undefined} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Я даю согласие на обработку персональных данных в соответствии с <Link to="/privacy" target="_blank">Политикой конфиденциальности</Link></span>
      </label>
      <button className="btn btn-accent btn-block" type="submit" disabled={sending}>{sending ? 'Отправляем…' : 'Отправить заявку'}</button>
      <p className={'form-status' + (status.type ? ' ' + status.type : '')} role="status" aria-live="polite">
        {sent && status.type === 'ok'
          ? <>✓ Спасибо! Заявка принята — я свяжусь с вами в течение рабочего дня. <Link to="/thanks">Подробнее</Link></>
          : status.msg}
      </p>
    </form>
  );
}
