// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/useStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const { isAuthenticated, isLoading, isInitialized, initializeAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        console.log('🔄 HomePage: Запуск инициализации...');
        await initializeAuth();
      }
    };

    initialize();
  }, [isInitialized, initializeAuth]);

  // Выполняем редирект после завершения инициализации
  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (isAuthenticated) {
        console.log('✅ HomePage: Пользователь авторизован, переход на dashboard');
        router.push('/dashboard');
      } else {
        console.log('ℹ️ HomePage: Пользователь не авторизован, переход на auth');
        router.push('/auth');
      }
    }
  }, [isInitialized, isLoading, isAuthenticated, router]);

  // Показываем загрузку пока идет инициализация
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <LoadingSpinner size="lg" className="text-blue-600 mx-auto" />
          {/* Анимированные круги */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20"></div>
          <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-pulse opacity-40"></div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Language Learning App</h2>
          <p className="text-gray-600">
            {!isInitialized ? 'Инициализация приложения...' : 
             isLoading ? 'Проверка авторизации...' : 
             'Перенаправление...'}
          </p>
          <div className="flex items-center justify-center space-x-1 text-sm text-gray-500">
            <span>
              {!isInitialized ? 'Запуск системы' : 
               isLoading ? 'Загрузка профиля' : 
               'Переход к приложению'}
            </span>
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}