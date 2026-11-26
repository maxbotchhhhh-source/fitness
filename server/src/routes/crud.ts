import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { audit } from '../audit';
import { ah, requirePerm } from '../auth';
import { q, q1, tx } from '../db';

type Vals = Record<string, string>;
type Row = Record<string, any>;

export interface FieldDef {
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'password';
  required?: boolean;
  requiredOnCreate?: boolean;
  min?: number;
  max?: number;
  default?: string | number;
  options?: Record<string, string>;
}

export interface CrudConfig {
  table: string;
  perm: string;
  fields: Record<string, FieldDef>;
  listSql: string;
  /** Проверки поверх стандартных; может изменить vals. Возвращает текст ошибки или null. */
  validate?: (vals: Vals, existing: Row | null, userId: number) => Promise<string | null>;
  /** Запрет мягкого удаления: возвращает текст причины или null. */
  canDelete?: (row: Row, userId: number) => Promise<string | null>;
  /** Динамические варианты для select (например, список услуг). */
  dynamicOptions?: () => Promise<Record<string, Record<string, string>>>;
}

/**
 * Универсальный справочник админ-панели: список, создание, правка и мягкое удаление с записью в audit_log
 * (порт app/crud.php). Имена таблиц и полей берутся из конфигурации в коде, значения — только параметрами.
 */
export function crudRouter(cfg: CrudConfig): Router {
  const r = Router();
  const perm = requirePerm(cfg.perm);

  r.get('/', perm, ah(async (_req, res) => { res.json(await q(cfg.listSql)); }));

  r.post('/', perm, ah(async (req, res) => { await save(req, res, null); }));
  r.put('/:id', perm, ah(async (req, res) => { await save(req, res, Number(req.params.id)); }));

  async function save(req: any, res: any, id: number | null) {
    const user = req.user!;
    const existing = id ? await q1<Row>(`SELECT * FROM ${cfg.table} WHERE id = $1 AND NOT is_deleted`, [id]) : null;
    if (id && !existing) { res.status(404).json({ ok: false, error: 'Запись не найдена.' }); return; }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const fields = { ...cfg.fields };
    if (cfg.dynamicOptions) {
      const dyn = await cfg.dynamicOptions();
      for (const k of Object.keys(dyn)) fields[k] = { ...fields[k], options: dyn[k] };
    }

    // нормализация значений
    const vals: Vals = {};
    for (const [name, f] of Object.entries(fields)) {
      const raw = body[name];
      if (f.type === 'checkbox') vals[name] = raw === true || raw === 'true' || raw === '1' || raw === 1 ? 'true' : 'false';
      else if (f.type === 'number') vals[name] = String(raw ?? '').trim().replace(',', '.');
      else if (f.type === 'textarea') vals[name] = String(raw ?? '').replace(/\r\n/g, '\n').trim();
      else vals[name] = String(raw ?? '').trim();
    }

    // стандартные проверки
    let error: string | null = null;
    for (const [name, f] of Object.entries(fields)) {
      const required = !!f.required || (!!f.requiredOnCreate && !existing);
      if (required && vals[name] === '') { error = `Заполните поле «${f.label}».`; break; }
      if (vals[name] === '') { if (f.type === 'number') vals[name] = String(f.default ?? 0); continue; }
      if (f.type === 'number' && !Number.isFinite(Number(vals[name]))) { error = `Поле «${f.label}» должно быть числом.`; break; }
      if (f.min !== undefined && f.type === 'number' && Number(vals[name]) < f.min) { error = `Поле «${f.label}»: минимум ${f.min}.`; break; }
      if (f.max !== undefined && f.type === 'number' && Number(vals[name]) > f.max) { error = `Поле «${f.label}»: максимум ${f.max}.`; break; }
      if (f.max !== undefined && f.type !== 'number' && f.type !== 'checkbox' && [...vals[name]].length > f.max) { error = `Поле «${f.label}» слишком длинное (до ${f.max}).`; break; }
      if (f.type === 'select' && f.options && !(vals[name] in f.options)) { error = `Недопустимое значение поля «${f.label}».`; break; }
    }
    if (!error && cfg.validate) error = await cfg.validate(vals, existing, user.id);
    if (error) { res.status(400).json({ ok: false, error }); return; }

    const cols = Object.keys(vals);
    const bind = cols.map((c) => (fields[c]?.type === 'checkbox' ? vals[c] === 'true' : vals[c]));
    try {
      const newId = await tx(async (c) => {
        if (existing) {
          const set = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
          await c.query(`UPDATE ${cfg.table} SET ${set}, updated_at = now() WHERE id = $${cols.length + 1}`, [...bind, id]);
          const old: Row = {}; const nw: Row = {};
          for (const col of cols) { old[col] = existing[col] ?? null; nw[col] = vals[col]; }
          await audit(user.id, 'update', cfg.table, id!, old, nw, c);
          return id!;
        }
        const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
        const ins = await c.query(`INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${ph}) RETURNING id`, bind);
        const nid = ins.rows[0].id as number;
        await audit(user.id, 'create', cfg.table, nid, {}, vals, c);
        return nid;
      });
      res.json({ ok: true, id: newId, message: existing ? 'Изменения сохранены.' : 'Запись добавлена.' });
    } catch (e) {
      console.error(e);
      res.status(400).json({ ok: false, error: 'Не удалось сохранить: проверьте данные (возможно, значение уже существует).' });
    }
  }

  r.delete('/:id', perm, ah(async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    const existing = await q1<Row>(`SELECT * FROM ${cfg.table} WHERE id = $1 AND NOT is_deleted`, [id]);
    if (!existing) { res.status(404).json({ ok: false, error: 'Запись не найдена.' }); return; }
    if (cfg.canDelete) {
      const msg = await cfg.canDelete(existing, user.id);
      if (msg) { res.status(400).json({ ok: false, error: msg }); return; }
    }
    await tx(async (c) => {
      await c.query(`UPDATE ${cfg.table} SET is_deleted = TRUE, deleted_by = $1, updated_at = now() WHERE id = $2`, [user.id, id]);
      await audit(user.id, 'delete', cfg.table, id, { is_deleted: 'false' }, { is_deleted: 'true' }, c);
    });
    res.json({ ok: true, message: 'Запись удалена (скрыта). Данные сохранены в базе.' });
  }));

  return r;
}

const rows2map = (rows: { id: number; title: string }[]): Record<string, string> =>
  Object.fromEntries(rows.map((x) => [String(x.id), x.title]));

/* ---------------- справочники (как public/admin/*.php) ---------------- */

export const servicesCrud = crudRouter({
  table: 'services', perm: 'services.edit',
  fields: {
    title: { label: 'Название', type: 'text', required: true, max: 150 },
    format: { label: 'Формат', type: 'select', required: true, options: { 'очно': 'Очно', 'онлайн': 'Онлайн' } },
    sort_order: { label: 'Порядок вывода', type: 'number', default: 10, min: 0, max: 9999 },
    description: { label: 'Описание', type: 'textarea', required: true, max: 1000 },
  },
  listSql: 'SELECT id, title, format, sort_order, description FROM services WHERE NOT is_deleted ORDER BY sort_order, id',
  canDelete: async (row) => {
    const n = await q1<{ n: string }>('SELECT count(*) AS n FROM tariffs WHERE service_id = $1 AND NOT is_deleted', [row.id]);
    return Number(n?.n) > 0 ? 'Нельзя удалить услугу: к ней привязаны тарифы. Сначала удалите или перенесите тарифы.' : null;
  },
});

export const tariffsCrud = crudRouter({
  table: 'tariffs', perm: 'tariffs.edit',
  fields: {
    service_id: { label: 'Услуга', type: 'select', required: true, options: {} },
    title: { label: 'Название', type: 'text', required: true, max: 100 },
    price: { label: 'Цена, ₽', type: 'number', required: true, min: 0, max: 10000000 },
    sessions_count: { label: 'Количество занятий', type: 'number', required: true, min: 1, max: 1000 },
    sort_order: { label: 'Порядок вывода', type: 'number', default: 10, min: 0, max: 9999 },
    is_featured: { label: 'Выделить как «Популярный»', type: 'checkbox' },
    description: { label: 'Что входит (каждый пункт с новой строки)', type: 'textarea', max: 1000 },
  },
  dynamicOptions: async () => ({ service_id: rows2map(await q('SELECT id, title FROM services WHERE NOT is_deleted ORDER BY sort_order, id')) }),
  listSql: `SELECT t.id, t.service_id, t.title, t.price::float8 AS price, t.sessions_count, t.sort_order, t.is_featured, t.description, s.title AS service_title
              FROM tariffs t JOIN services s ON s.id = t.service_id WHERE NOT t.is_deleted ORDER BY t.sort_order, t.id`,
  validate: async (v) => (!/^\d+$/.test(v.sessions_count) ? 'Количество занятий — целое число.' : null),
});

export const reviewsCrud = crudRouter({
  table: 'reviews', perm: 'reviews.edit',
  fields: {
    client_name: { label: 'Имя клиента', type: 'text', required: true, max: 100 },
    rating: { label: 'Оценка', type: 'select', required: true, default: '5', options: { '5': '5', '4': '4', '3': '3', '2': '2', '1': '1' } },
    is_published: { label: 'Опубликован на сайте', type: 'checkbox', default: 'true' },
    text: { label: 'Текст отзыва', type: 'textarea', required: true, max: 1500 },
  },
  listSql: 'SELECT id, client_name, rating, is_published, text, created_at FROM reviews WHERE NOT is_deleted ORDER BY created_at DESC, id DESC',
});

export const usersCrud = crudRouter({
  table: 'users', perm: 'users.edit',
  fields: {
    full_name: { label: 'ФИО', type: 'text', required: true, max: 150 },
    login: { label: 'Логин', type: 'text', required: true, max: 50 },
    role_id: { label: 'Роль', type: 'select', required: true, options: {} },
    password: { label: 'Пароль', type: 'password', requiredOnCreate: true },
  },
  dynamicOptions: async () => ({
    role_id: Object.fromEntries((await q<{ id: number; name: string }>('SELECT id, name FROM roles ORDER BY id')).map((x) => [String(x.id), x.name])),
  }),
  listSql: `SELECT u.id, u.full_name, u.login, u.role_id, r.name AS role_name, u.created_at
              FROM users u JOIN roles r ON r.id = u.role_id WHERE NOT u.is_deleted ORDER BY u.id`,
  validate: async (v, existing, userId) => {
    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(v.login)) return 'Логин: 3–50 символов (латиница, цифры, _ . -).';
    const dup = await q1('SELECT 1 FROM users WHERE login = $1 AND id <> $2', [v.login, existing?.id ?? 0]);
    if (dup) return 'Пользователь с таким логином уже существует.';
    if (v.password !== '') {
      if ([...v.password].length < 8) return 'Пароль должен содержать не менее 8 символов.';
      v.password_hash = await bcrypt.hash(v.password, 10);
    }
    delete v.password;
    if (existing && existing.id === userId && Number(v.role_id) !== existing.role_id) return 'Нельзя изменить собственную роль.';
    return null;
  },
  canDelete: async (row, userId) => (row.id === userId ? 'Нельзя удалить самого себя.' : null),
});
