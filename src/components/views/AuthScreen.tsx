import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import ForgotPasswordScreen from './ForgotPasswordScreen';

const tabs = [
  { key: 'sign_in', label: 'Вход' },
  { key: 'sign_up', label: 'Регистрация' },
] as const;

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<typeof tabs[number]['key']>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>('input, button');
      focusable[0]?.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'sign_up') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message ?? 'Ошибка аутентификации');
    } finally {
      setLoading(false);
    }
  };

  // Если показываем экран восстановления пароля
  if (showForgotPassword) {
    return <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="auth-screen">
      <div className="card" ref={modalRef} style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              className={`btn ${mode === t.key ? 'btn-primary' : ''}`}
              onClick={() => setMode(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {mode === 'sign_in' && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Забыли пароль?
              </button>
            </div>
          )}
          {error && <div className="error-message" style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Подождите…' : mode === 'sign_up' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
