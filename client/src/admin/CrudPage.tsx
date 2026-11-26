import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAdmin } from './AdminApp';
import type { CrudCfg, Row } from './crudConfigs';

type Form = Record<string, string | boolean>;
type Options = { services: { id: number; title: string }[]; roles: { id: number; name: string }[] };

/** Универсальная страница справочника: список, создание, правка, мягкое удаление (порт app/crud.php). */
export default function CrudPage({ cfg }: { cfg: CrudCfg }) {
  const { flash } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [opts, setOpts] = useState<Options>({ services: [], roles: [] });
  const [editing, setEditing] = useState<{ id: number | null } | null>(null);
  const [form, setForm] = useState<Form>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Row[]>(`/admin/${cfg.resource}`).then(setRows).catch((e) => flash(e instanceof ApiError ? e.message : 'Ошибка загрузки', 'err'));
  }, [cfg.resource, flash]);
  useEffect(() => { setEditing(null); load(); }, [load]);
  useEffect(() => { api<Options>('/admin/options').then(setOpts).catch(() => undefined); }, []);

  const optionsOf = (f: CrudCfg['fields'][string]): Record<string, string> => {
    if (f.options) return f.options;
    if (f.optionsFrom === 'services') return Object.fromEntries(opts.services.map((s) => [String(s.id), s.title]));
    if (f.optionsFrom === 'roles') return Object.fromEntries(opts.roles.map((r) => [String(r.id), r.name]));
    return {};
  };

  function startForm(row: Row | null) {
    const v: Form = {};
    for (const [name, f] of Object.entries(cfg.fields)) {
      if (f.type === 'checkbox') v[name] = row ? !!row[name] : !!f.default;
      else if (f.type === 'password') v[name] = '';
      else if (row) v[name] = row[name] === null || row[name] === undefined ? '' : String(row[name]);
      else v[name] = f.default !== undefined ? String(f.default) : (f.type === 'select' ? Object.keys(optionsOf(f))[0] ?? '' : '');
    }
    setForm(v);
    setEditing({ id: row ? row.id : null });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const url = `/admin/${cfg.resource}` + (editing?.id ? `/${editing.id}` : '');
      const r = await api<{ message: string }>(url, { method: editing?.id ? 'PUT' : 'POST', body: form });
      flash(r.message); setEditing(null); load();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Не удалось сохранить', 'err');
    } finally { setBusy(false); }
  }

  async function remove(row: Row) {
    if (!confirm('Удалить запись? Данные останутся в базе (мягкое удаление).')) return;
    try {
      const r = await api<{ message: string }>(`/admin/${cfg.resource}/${row.id}`, { method: 'DELETE' });
      flash(r.message); load();
    } catch (err) { flash(err instanceof ApiError ? err.message : 'Не удалось удалить', 'err'); }
  }

  return (
    <>
      {!editing && <p><button type="button" className="btn btn-accent btn-sm" onClick={() => startForm(null)}>+ Добавить: {cfg.singular}</button></p>}
      {editing && (
        <div className="panel">
          <h2>{editing.id ? 'Редактирование' : 'Новая запись'}: {cfg.singular}</h2>
          <form className="lead-form" onSubmit={submit}>
            <div className="form-grid">
              {Object.entries(cfg.fields).map(([name, f]) => (
                <div key={name} className={'field' + (f.type === 'textarea' ? ' full' : '')}>
                  {f.type === 'checkbox' ? (
                    <label className="check"><input type="checkbox" checked={!!form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.checked })} /><span>{f.label}</span></label>
                  ) : (
                    <>
                      <label htmlFor={`f-${name}`}>{f.label}{f.required ? ' *' : ''}</label>
                      {f.type === 'textarea' ? (
                        <textarea id={`f-${name}`} rows={f.rows ?? 4} required={f.required} value={String(form[name] ?? '')} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
                      ) : f.type === 'select' ? (
                        <select id={`f-${name}`} required={f.required} value={String(form[name] ?? '')} onChange={(e) => setForm({ ...form, [name]: e.target.value })}>
                          {Object.entries(optionsOf(f)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ) : (
                        <input id={`f-${name}`} type={f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : 'text'}
                          step={f.type === 'number' ? f.step ?? '1' : undefined} min={f.type === 'number' ? f.min : undefined}
                          maxLength={f.type === 'text' ? f.max : undefined} required={f.required || (f.requiredOnCreate && !editing.id)}
                          autoComplete={f.type === 'password' ? 'new-password' : undefined}
                          value={String(form[name] ?? '')} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
                      )}
                      {f.hint && <div className="hint">{f.hint}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="row-actions">
              <button className="btn btn-accent" type="submit" disabled={busy}>Сохранить</button>
              <button className="btn btn-outline-dark" type="button" onClick={() => setEditing(null)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table className="t">
          <thead><tr>{cfg.columns.map(([label]) => <th key={label}>{label}</th>)}<th>Действия</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {cfg.columns.map(([label, fmt]) => <td key={label}>{fmt(r)}</td>)}
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => startForm(r)}>Изменить</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(r)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cfg.columns.length + 1} className="muted">Записей пока нет.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
