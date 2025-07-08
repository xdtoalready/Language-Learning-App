// app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  PlusIcon,
  ChartBarIcon,
  FireIcon,
  BookOpenIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useAuth, useWords, useStats, useReview } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { getStreakEmoji, getStreakText, formatDate } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  const { user } = useAuth();
  const { dueWords, wordsStats, loadDueWords, loadWordsStats } = useWords();
  const { userStats, loadUserStats } = useStats();
  const { startReviewSession } = useReview();
  const router = useRouter();

  useEffect(() => {
    loadDueWords();
    loadWordsStats();
    loadUserStats();
  }, [loadDueWords, loadWordsStats, loadUserStats]);

  const handleStartReview = async () => {
    try {
      await startReviewSession();
      router.push('/review');
    } catch (error) {
      console.error('Failed to start review session:', error);
    }
  };

  const quickStats = [
    {
      title: 'Слов к повторению',
      value: wordsStats?.dueToday || 0,
      icon: PlayIcon,
      color: 'blue',
      action: () => handleStartReview()
    },
    {
      title: 'Всего слов',
      value: wordsStats?.total || 0,
      icon: BookOpenIcon,
      color: 'green',
      action: () => router.push('/words')
    },
    {
      title: 'Выучено',
      value: wordsStats?.mastered || 0,
      icon: AcademicCapIcon,
      color: 'purple',
      action: () => router.push('/stats')
    },
    {
      title: 'Текущий стрик',
      value: user?.currentStreak || 0,
      icon: FireIcon,
      color: 'orange',
      action: () => router.push('/stats')
    }
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-gray-900"
          >
            Добро пожаловать, {user?.username}! 👋
          </motion.h1>
          <p className="text-gray-600 mt-2">
            Сегодня {formatDate(new Date().toISOString())}
          </p>
        </div>

        {/* Быстрая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={stat.action}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                      <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Главные действия */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">
                  Начать изучение
                </h2>
                <p className="text-gray-600">
                  Выберите, что хотите сделать сегодня
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Повторение слов */}
                  <div className="p-6 border-2 border-dashed border-blue-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="text-center">
                      <PlayIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Повторить слова
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {wordsStats?.dueToday || 0} слов готово к повторению
                      </p>
                      <Button
                        onClick={handleStartReview}
                        disabled={!wordsStats?.dueToday}
                        className="w-full"
                      >
                        {wordsStats?.dueToday ? 'Начать повторение' : 'Нет слов к повторению'}
                      </Button>
                    </div>
                  </div>

                  {/* Добавить слово */}
                  <div className="p-6 border-2 border-dashed border-green-200 rounded-lg hover:border-green-300 transition-colors">
                    <div className="text-center">
                      <PlusIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Добавить слово
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Пополните свой словарь новыми словами
                      </p>
                      <Button
                        onClick={() => router.push('/words/new')}
                        variant="secondary"
                        className="w-full"
                      >
                        Добавить слово
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Дневной прогресс */}
                {userStats && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        Дневной прогресс
                      </h4>
                      <span className="text-sm text-gray-600">
                        {userStats.dailyProgress.completed} / {userStats.dailyProgress.goal}
                      </span>
                    </div>
                    <ProgressBar
                      value={userStats.dailyProgress.completed}
                      max={userStats.dailyProgress.goal}
                      color="blue"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Статистика */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Стрик */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-gray-900">
                  Ваш стрик {getStreakEmoji(user?.currentStreak || 0)}
                </h3>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">
                    {user?.currentStreak || 0}
                  </div>
                  <p className="text-gray-600 mb-4">
                    {getStreakText(user?.currentStreak || 0)}
                  </p>
                  <Badge variant="warning">
                    Рекорд: {user?.longestStreak || 0} дней
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Распределение по уровням */}
            {wordsStats && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium text-gray-900">
                    Распределение слов
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(wordsStats.byMasteryLevel).map(([level, count]) => {
                      const levelNames = ['Новые', 'Изучаю', 'Знакомые', 'Знаю', 'Хорошо', 'Выучено'];
                      const colors = ['gray', 'red', 'orange', 'yellow', 'blue', 'green'];
                      
                      return (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full bg-${colors[parseInt(level)]}-400 mr-2`}></div>
                            <span className="text-sm text-gray-600">
                              {levelNames[parseInt(level)]}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Быстрые ссылки */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-gray-900">
                  Быстрые действия
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/words')}
                >
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  Мои слова
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/stats')}
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Подробная статистика
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}