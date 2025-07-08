// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/useStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const { isAuthenticated, initializeAuth } = useAuth();
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      console.log('🔄 HomePage: Инициализация аутентификации...');
      
      try {
        // Инициализируем аутентификацию
        initializeAuth();
        
        // Даем время на инициализацию
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Проверяем результат
        const currentAuth = useAuth.getState().isAuthenticated;
        console.log('📊 Результат инициализации:', { isAuthenticated: currentAuth });
        
        if (currentAuth) {
          console.log('✅ Пользователь авторизован, перенаправляем на дашборд');
          router.push('/dashboard');
        } else {
          console.log('ℹ️ Пользователь не авторизован, перенаправляем на страницу входа');
          router.push('/auth');
        }
      } catch (error) {
        console.error('💥 Ошибка инициализации HomePage:', error);
        router.push('/auth');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [initializeAuth, router]);

  // Показываем загрузку пока идет инициализация
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <LoadingSpinner size="lg" className="text-blue-600 mx-auto" />
            {/* Анимированные круги */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20"></div>
            <div className="absolute inset-2 rounded-full border-2 border-blue-300 animate-pulse opacity-30"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Language Learning App</h2>
            <p className="text-gray-600">Инициализация приложения...</p>
            <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
              <span>Проверка аутентификации</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Этот компонент не должен рендериться после инициализации,
  // так как пользователь будет перенаправлен
  return null;
}