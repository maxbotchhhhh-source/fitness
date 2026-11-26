import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { AuthUser } from '../types';
import { useAdmin } from './AdminApp';

export default function Login() {
  const { setSession } = useAdmin();
  const nav = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const r = await api<{ user: AuthUser; permissions: string[] }>('/admin/login', { method: 'POST', body: { login, password } });
      setSession(r.user, r.permissions);
      nav('/admin/leads');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка сети. Повторите попытку.');
    } finally { setBusy(false); }
  }

  return (
    <div className="panel login-box">
      {error && <div className="alert alert-err" role="alert">{error}</div>}
      <form className="lead-form" onSubmit={submit}>
        <div className="field"><label htmlFor="login">Логин</label><input id="login" name="login" type="text" required autoComplete="username" autoFocus value={login} onChange={(e) => setLogin(e.target.value)} /></div>
        <div className="field"><label htmlFor="password">Пароль</label><input id="password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn btn-accent btn-block" type="submit" disabled={busy}>Войти</button>
      </form>
    </div>
  );
}
