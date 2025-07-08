// app/auth/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { LANGUAGES } from '@/lib/utils';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    learningLanguage: 'Korean'
  });
  
  const { login, register, isLoading, isAuthenticated, isInitialized, initializeAuth } = useAuth();
  const router = useRouter();

  // Инициализируем auth если еще не инициализирован
  useEffect(() => {
    if (!isInitialized) {
      console.log('🔄 AuthPage: Запуск инициализации...');
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Редирект если уже авторизован (только после инициализации)
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      console.log('✅ AuthPage: Пользователь уже авторизован, переход на dashboard');
      router.push('/dashboard');
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Добро пожаловать!');
      } else {
        await register(
          formData.email,
          formData.username,
          formData.password,
          formData.learningLanguage
        );
        toast.success('Аккаунт успешно создан!');
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error instanceof Error ? 
        error.message : 
        'Произошла ошибка при авторизации'
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Показываем загрузку если еще не инициализировано или если уже авторизован
  if (!isInitialized || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">
            {!isInitialized ? 'Инициализация...' : 'Перенаправление...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Логотип и заголовок */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4"
          >
            <span className="text-white text-2xl font-bold">📚</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-gray-900"
          >
            Language Learning App
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-gray-600"
          >
            {isLogin 
              ? 'Войдите в свой аккаунт для продолжения изучения'
              : 'Создайте аккаунт и начните изучать новые слова'
            }
          </motion.p>
        </div>

        {/* Форма */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              {/* Переключатель режима */}
              <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    isLogin
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    !isLogin
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Регистрация
                </button>
              </div>

              {/* Форма авторизации */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLogin ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      <Input
                        label="Email или имя пользователя"
                        type="text"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Введите email или имя пользователя"
                        autoFocus
                      />
                      <Input
                        label="Пароль"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Введите пароль"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="Введите ваш email"
                        autoFocus
                      />
                      <Input
                        label="Имя пользователя"
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        placeholder="Выберите имя пользователя"
                      />
                      <Input
                        label="Пароль"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Создайте пароль"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Изучаемый язык
                        </label>
                        <select
                          name="learningLanguage"
                          value={formData.learningLanguage}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.name}>
                              {lang.flag} {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full mt-6"
                  size="lg"
                >
                  {isLogin ? 'Войти' : 'Создать аккаунт'}
                </Button>
              </form>

              {/* Дополнительная информация */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 p-3 bg-blue-50 rounded-lg"
                >
                  <p className="text-sm text-blue-700">
                    💡 <strong>Совет:</strong> Выберите язык, который хотите изучать. 
                    Вы сможете изменить его позже в настройках.
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Дополнительная информация */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="text-sm text-gray-500">
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              {isLogin ? 'Зарегистрируйтесь' : 'Войдите'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}