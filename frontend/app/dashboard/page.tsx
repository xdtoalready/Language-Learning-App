// app/dashboard/page.tsx
'use client';

import React, { useEffect, useCallback } from 'react';
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

  // Мемоизированная функция загрузки данных
  const loadDashboardData = useCallback(() => {
    console.log('📊 DashboardPage: Проверяем, что нужно загрузить...');
    
    // Загружаем данные только если они еще не загружены и не загружаются
    const promises = [];
    
    if (!wordsStats) {
      console.log('📊 Загружаем статистику слов...');
      promises.push(loadWordsStats().catch(console.error));
    }
    
    if (dueWords.length === 0) {
      console.log('📅 Загружаем слова к повторению...');
      promises.push(loadDueWords().catch(console.error));
    }
    
    if (!userStats) {
      console.log('👤 Загружаем статистику пользователя...');
      promises.push(loadUserStats().catch(console.error));
    }

    // Выполняем все загрузки параллельно, если есть что загружать
    if (promises.length > 0) {
      console.log(`🚀 Запускаем ${promises.length} загрузок...`);
      Promise.allSettled(promises).then(() => {
        console.log('✅ DashboardPage: Все загрузки завершены');
      });
    } else {
      console.log('✅ DashboardPage: Все данные уже загружены');
    }
  }, [wordsStats, dueWords.length, userStats, loadWordsStats, loadDueWords, loadUserStats]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
            Добро пожаловать, {user?.username}!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 mt-1"
          >
            {getStreakText(user?.currentStreak || 0)} Продолжайте изучение!
          </motion.p>
        </div>

        {/* Быстрая статистика */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickStats.map((stat, index) => (
            <motion.div
              key={`quick-stat-${index}-${stat.title}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card 
                className="hover:shadow-md transition-all duration-200 cursor-pointer border-0 shadow-sm"
                onClick={stat.action}
              >
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${
                      stat.color === 'blue' ? 'bg-blue-100' :
                      stat.color === 'green' ? 'bg-green-100' :
                      stat.color === 'purple' ? 'bg-purple-100' :
                      'bg-orange-100'
                    }`}>
                      <stat.icon className={`h-6 w-6 ${
                        stat.color === 'blue' ? 'text-blue-600' :
                        stat.color === 'green' ? 'text-green-600' :
                        stat.color === 'purple' ? 'text-purple-600' :
                        'text-orange-600'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <div className="flex items-center">
                        <p className="text-2xl font-bold text-gray-900 mr-2">
                          {stat.value}
                        </p>
                        {stat.title === 'Текущий стрик' && (
                          <span className="text-lg">
                            {getStreakEmoji(stat.value)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Основные действия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">
                Что хотите делать?
              </h2>
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
              {userStats?.dailyProgress && (
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
                  <p className="text-sm text-center text-gray-600 mt-2">
                    {userStats.dailyProgress.completed >= userStats.dailyProgress.goal
                      ? '🎉 Дневная цель достигнута!'
                      : `Осталось ${userStats.dailyProgress.goal - userStats.dailyProgress.completed} повторений до цели`
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Недавние слова */}
        {dueWords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Слова к повторению сегодня
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/words')}
                  >
                    Показать все
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dueWords.slice(0, 6).map((word, index) => (
                    <motion.div
                      key={`due-word-${word.id}-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">
                          {word.word}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          Уровень {word.masteryLevel}
                        </Badge>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">
                        {word.translation}
                      </p>
                      {word.tags && word.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {word.tags.slice(0, 2).map((tag, tagIndex) => (
                            <Badge key={`due-word-tag-${word.id}-${tagIndex}-${tag}`} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {word.tags.length > 2 && (
                            <Badge key={`due-word-more-${word.id}`} variant="outline" className="text-xs">
                              +{word.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}