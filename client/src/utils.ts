/** Маска телефона +7 (XXX) XXX-XX-XX */
export function maskPhone(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d[0] === '7' || d[0] === '8') d = d.slice(1);
  d = d.slice(0, 10);
  let out = '';
  if (d.length) out = '+7 (' + d.slice(0, 3);
  if (d.length >= 3) out += ') ' + d.slice(3, 6);
  if (d.length >= 6) out += '-' + d.slice(6, 8);
  if (d.length >= 8) out += '-' + d.slice(8, 10);
  return out;
}

export const money = (v: number): string => Math.round(v).toLocaleString('ru-RU') + ' ₽';

export function plural(n: number, one: string, few: string, many: string): string {
  const m = n % 100;
  if (m >= 11 && m <= 14) return many;
  const k = n % 10;
  return k === 1 ? one : k >= 2 && k <= 4 ? few : many;
}

export const telHref = (phone: string): string => 'tel:+' + phone.replace(/\D+/g, '');

export function fmtDt(ts: string | null | undefined, seconds = false): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Samara', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined,
  }).format(new Date(ts)).replace(',', '');
}

export const store = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* приватный режим */ } },
};

/** Цель Яндекс Метрики (если счётчик подключён). */
export function goal(name: string): void {
  const w = window as unknown as { ym?: (id: number, act: string, goal: string) => void; __metrika?: number };
  if (w.ym && w.__metrika) w.ym(w.__metrika, 'reachGoal', name);
}
