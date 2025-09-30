import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>('input, button');
      focusable[0]?.focus();
    }
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) {
        throw error;
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message ?? 'Ошибка при отправке письма для сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-screen">
        <div className="card" ref={modalRef} style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2>Проверьте вашу почту</h2>
            <p style={{ margin: '16px 0', color: 'var(--secondary-text-color)' }}>
              Мы отправили ссылку для сброса пароля на адрес <strong>{email}</strong>
            </p>
            <p style={{ margin: '16px 0', color: 'var(--secondary-text-color)', fontSize: '14px' }}>
              Перейдите по ссылке в письме, чтобы создать новый пароль.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onBack}
            style={{ width: '100%' }}
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="card" ref={modalRef} style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h2>Восстановление пароля</h2>
          <p style={{ color: 'var(--secondary-text-color)', fontSize: '14px', margin: '8px 0' }}>
            Введите ваш email, и мы отправим ссылку для сброса пароля
          </p>
        </div>
        
        <form onSubmit={handlePasswordReset}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          
          {error && (
            <div className="error-message" style={{ color: 'crimson', marginTop: 8 }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button 
              type="button" 
              className="btn" 
              onClick={onBack}
              style={{ flex: 1 }}
            >
              Назад
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !email.trim()}
              style={{ flex: 1 }}
            >
              {loading ? 'Отправляем...' : 'Отправить ссылку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
