import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase.js';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Ошибка получения сессии:', error);
          navigate('/?error=auth_failed');
          return;
        }

        if (data.session) {
          // Успешная авторизация
          navigate('/voting');
        } else {
          navigate('/?error=no_session');
        }
      } catch (error) {
        console.error('Ошибка обработки callback:', error);
        navigate('/?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
        <p className="text-gray-400 font-mono">Обработка авторизации...</p>
      </div>
    </div>
  );
}

