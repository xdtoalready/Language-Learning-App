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
  
  const { login, register, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Редирект если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

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
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-purple-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Логотип и заголовок */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              >
                <span className="text-2xl text-white font-bold">📚</span>
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Language Learning
              </h1>
              <p className="text-gray-600">
                Изучайте языки с системой интервального повторения
              </p>
            </div>

            {/* Переключатель вход/регистрация */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-blue-600 shadow-sm'
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
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Регистрация
              </button>
            </div>

            {/* Форма */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <Input
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />

                  {!isLogin && (
                    <Input
                      name="username"
                      type="text"
                      label="Имя пользователя"
                      placeholder="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                    />
                  )}

                  <Input
                    name="password"
                    type="password"
                    label="Пароль"
                    placeholder="Минимум 6 символов"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />

                  {!isLogin && (
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Язык изучения
                      </label>
                      <select
                        name="learningLanguage"
                        value={formData.learningLanguage}
                        onChange={handleInputChange}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        {Object.entries(LANGUAGES).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <Button
                type="submit"
                loading={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                size="lg"
              >
                {isLogin ? 'Войти' : 'Создать аккаунт'}
              </Button>
            </form>

            {/* Демо данные */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                🧪 Демо данные для тестирования:
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Email:</strong> test@example.com</p>
                <p><strong>Пароль:</strong> 123456</p>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      email: 'test@example.com',
                      password: '123456'
                    });
                    setIsLogin(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Заполнить автоматически
                </button>
              </div>
            </div>

            {/* Дополнительная информация */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  {isLogin ? 'Создать аккаунт' : 'Войти'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Информация о проекте */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500 mb-4">
            Создано командой из 3 друзей для изучения языков 🚀
          </p>
          <div className="flex justify-center space-x-4 text-2xl">
            <span title="Английский">🇺🇸</span>
            <span title="Корейский">🇰🇷</span>
            <span title="Китайский">🇨🇳</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}