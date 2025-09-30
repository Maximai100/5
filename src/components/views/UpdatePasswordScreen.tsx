import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface UpdatePasswordScreenProps {
  onSuccess: () => void;
}

export const UpdatePasswordScreen: React.FC<UpdatePasswordScreenProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  // Слушаем событие PASSWORD_RECOVERY от Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Пользователь перешел по ссылке для сброса пароля
        console.log('PASSWORD_RECOVERY event received');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Валидация паролей
    if (newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      } else {
        setSuccess(true);
        // Через 2 секунды перенаправляем на страницу входа
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message ?? 'Ошибка при обновлении пароля');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-screen">
        <div className="card" ref={modalRef} style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2>Пароль успешно изменен!</h2>
            <p style={{ margin: '16px 0', color: 'var(--secondary-text-color)' }}>
              Ваш пароль был успешно обновлен. Сейчас вы будете перенаправлены на страницу входа.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="card" ref={modalRef} style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h2>Создание нового пароля</h2>
          <p style={{ color: 'var(--secondary-text-color)', fontSize: '14px', margin: '8px 0' }}>
            Введите новый пароль для вашего аккаунта
          </p>
        </div>
        
        <form onSubmit={handleUpdatePassword}>
          <label htmlFor="newPassword">Новый пароль</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={6}
          />
          
          <label htmlFor="confirmPassword">Подтвердите пароль</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={6}
          />
          
          {error && (
            <div className="error-message" style={{ color: 'crimson', marginTop: 8 }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !newPassword || !confirmPassword}
            style={{ marginTop: 12, width: '100%' }}
          >
            {loading ? 'Сохраняем...' : 'Сохранить новый пароль'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordScreen;
