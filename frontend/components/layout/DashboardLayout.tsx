// components/layout/DashboardLayout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  BookOpenIcon,
  ChartBarIcon,
  PlusIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth, useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Дашборд', href: '/dashboard', icon: HomeIcon },
  { name: 'Мои слова', href: '/words', icon: BookOpenIcon },
  { name: 'Статистика', href: '/stats', icon: ChartBarIcon },
  { name: 'Добавить слово', href: '/words/new', icon: PlusIcon },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAuthenticated, logout, initializeAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Предотвращаем множественные инициализации
    if (hasInitialized) {
      console.log('🛑 DashboardLayout: Инициализация уже выполнена, пропускаем');
      setIsInitializing(false);
      return;
    }

    const initialize = async () => {
      console.log('🔄 DashboardLayout: Инициализация...');
      
      try {
        // Инициализируем аутентификацию только один раз
        initializeAuth();
        setHasInitialized(true);
        
        // Даем небольшое время на проверку токена и загрузку профиля
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ИСПРАВЛЕНО: используем useStore.getState() вместо useAuth.getState()
        const currentAuth = useStore.getState().isAuthenticated;
        const currentUser = useStore.getState().user;
        
        console.log('📊 Результат инициализации:', { 
          isAuthenticated: currentAuth,
          hasUser: !!currentUser,
          userEmail: currentUser?.email
        });
        
        if (!currentAuth) {
          console.log('❌ Пользователь не авторизован, редирект на /auth');
          router.push('/auth');
          return;
        }
        
        // Если авторизован, но нет пользователя - даем время на загрузку
        if (currentAuth && !currentUser) {
          console.log('⏳ Ожидаем загрузку профиля пользователя...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // ИСПРАВЛЕНО: используем useStore.getState() вместо useAuth.getState()
          const finalUser = useStore.getState().user;
          if (!finalUser) {
            console.log('❌ Не удалось загрузить профиль, редирект на /auth');
            logout();
            router.push('/auth');
            return;
          }
        }
        
        console.log('✅ Инициализация завершена успешно');
      } catch (error) {
        console.error('💥 Ошибка инициализации DashboardLayout:', error);
        router.push('/auth');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [initializeAuth, logout, router, hasInitialized]);

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из аккаунта');
    router.push('/auth');
  };

  // Показываем загрузку во время инициализации
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Language Learning App</h2>
            <p className="text-gray-600">Проверка аутентификации...</p>
          </div>
        </div>
      </div>
    );
  }

  // Показываем загрузку если нет пользователя
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Боковое меню */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200">
        {/* Логотип */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">📚</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-gray-900">
              Language App
            </span>
          </div>
        </div>

        {/* Навигация */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Профиль пользователя */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => router.push('/profile')}
            >
              <UserIcon className="h-4 w-4 mr-1" />
              Профиль
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="ml-64">
        <main className="py-8 px-8">
          {children}
        </main>
      </div>
    </div>
  );
}