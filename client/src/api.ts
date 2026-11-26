let csrf: string | null = null;

export class ApiError extends Error {
  status: number;
  data: { error?: string; field?: string | null };
  constructor(status: number, data: { error?: string; field?: string | null }) {
    super(data.error ?? 'Ошибка сервера');
    this.status = status;
    this.data = data;
  }
}

async function getCsrf(): Promise<string> {
  if (!csrf) {
    const r = await fetch('/api/csrf', { credentials: 'same-origin' });
    csrf = ((await r.json()) as { token: string }).token;
  }
  return csrf;
}

/** Запрос к API. Для POST/PUT/PATCH/DELETE автоматически добавляется CSRF-токен. */
export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = await getCsrf();
  }
  const r = await fetch('/api' + path, {
    method, headers, credentials: 'same-origin',
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) {
    if (r.status === 419) csrf = null; // токен устарел — получим новый при следующем запросе
    throw new ApiError(r.status, data as { error?: string });
  }
  return data;
}
