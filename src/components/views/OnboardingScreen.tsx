import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface OnboardingData {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
}

export const OnboardingScreen: React.FC = () => {
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    phone: '',
    city: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>('input, button');
      focusable[0]?.focus();
    }
  }, []);

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Сохраняем данные в user_meta_data
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim()
        }
      });

      if (error) throw error;

      // После успешного сохранения перенаправляем в основное приложение
      // Это произойдет автоматически через onAuthStateChange в App.tsx
      
    } catch (err: any) {
      setError(err.message ?? 'Ошибка при сохранении данных');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="card" ref={modalRef} style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Добро пожаловать!</h2>
        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--hint-color)' }}>
          Расскажите немного о себе, чтобы мы могли настроить ваш профиль
        </p>
        
        <form onSubmit={handleSubmit}>
          <label htmlFor="firstName">Имя</label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={e => handleInputChange('firstName', e.target.value)}
            placeholder="Ваше имя"
            required
          />
          
          <label htmlFor="lastName">Фамилия</label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={e => handleInputChange('lastName', e.target.value)}
            placeholder="Ваша фамилия"
            required
          />
          
          <label htmlFor="phone">Телефон</label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={e => handleInputChange('phone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
            required
          />
          
          <label htmlFor="city">Город</label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={e => handleInputChange('city', e.target.value)}
            placeholder="Ваш город"
            required
          />
          
          {error && (
            <div className="error-message" style={{ color: 'var(--danger-color)', marginTop: 8 }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading} 
            style={{ marginTop: 12, width: '100%' }}
          >
            {loading ? 'Сохранение...' : 'Продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingScreen;
