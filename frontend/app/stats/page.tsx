// app/stats/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ClockIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useStats, useAuth } from '@/store/useStore';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  formatDate,
  formatDateShort,
  getStreakEmoji,
  getStreakText,
  MASTERY_LEVELS
} from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function StatsPage() {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  
  const { userStats, isLoadingStats, loadUserStats, updateDailyGoal } = useStats();
  const { user } = useAuth();

  useEffect(() => {
    if (!userStats) {
      console.log('📈 StatsPage: Загружаем статистику...');
      loadUserStats();
    }
  }, [loadUserStats, userStats]);

  const handleUpdateGoal = async () => {
    const goal = parseInt(newGoal);
    if (goal < 1 || goal > 100) {
      toast.error('Цель должна быть от 1 до 100');
      return;
    }

    try {
      await updateDailyGoal(goal);
      toast.success('Дневная цель обновлена!');
      setShowGoalModal(false);
      setNewGoal('');
    } catch (error) {
      toast.error('Ошибка при обновлении цели');
    }
  };

  const openGoalModal = () => {
    setNewGoal(user?.dailyGoal?.toString() || '10');
    setShowGoalModal(true);
  };

  // Данные для графиков
  const masteryData = userStats?.masteryDistribution ? Object.entries(userStats.masteryDistribution).map(([level, count]) => ({
    name: MASTERY_LEVELS[parseInt(level)]?.name || `Уровень ${level}`,
    value: count,
    color: MASTERY_LEVELS[parseInt(level)]?.color || '#gray-500'
  })) : [];

  const weeklyData = userStats?.weeklyProgress || [];

  // Цвета для графиков
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-gray-900"
            >
              Статистика
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 mt-1"
            >
              Отслеживайте ваш прогресс в изучении языка
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              onClick={openGoalModal}
              variant="outline"
              className="flex items-center"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Настроить цель
            </Button>
          </motion.div>
        </div>

        {isLoadingStats ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Основные метрики */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              {/* Общие слова */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <AcademicCapIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Изучено слов</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {user?.totalWordsLearned || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Текущий стрик */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <FireIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Текущий стрик</p>
                      <div className="flex items-center">
                        <p className="text-2xl font-bold text-gray-900 mr-2">
                          {user?.currentStreak || 0}
                        </p>
                        <span className="text-lg">
                          {getStreakEmoji(user?.currentStreak || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Лучший стрик */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <TrophyIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Лучший стрик</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {user?.longestStreak || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Дни изучения */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CalendarDaysIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Дней изучения</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {userStats?.totalStudyDays || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Дневной прогресс */}
            {userStats?.dailyProgress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Дневной прогресс
                      </h3>
                      <Badge variant="primary">
                        {userStats.dailyProgress.completed} / {userStats.dailyProgress.goal}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Повторения сегодня
                          </span>
                          <span className="text-sm text-gray-600">
                            {Math.round((userStats.dailyProgress.completed / userStats.dailyProgress.goal) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((userStats.dailyProgress.completed / userStats.dailyProgress.goal) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          {userStats.dailyProgress.completed >= userStats.dailyProgress.goal
                            ? '🎉 Дневная цель достигнута!'
                            : `Осталось ${userStats.dailyProgress.goal - userStats.dailyProgress.completed} повторений до цели`
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Графики */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Распределение по уровням мастерства */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Распределение по уровням
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {masteryData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={masteryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {masteryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <p>Нет данных для отображения</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Еженедельный прогресс */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Активность за неделю
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {weeklyData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => formatDateShort(new Date(value))}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value) => formatDate(new Date(value))}
                              formatter={(value) => [value, 'Повторений']}
                            />
                            <Bar dataKey="reviews" fill="#3B82F6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <p>Нет данных для отображения</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Достижения */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ваши достижения
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Достижение: Первые слова */}
                    <div className={`p-4 rounded-lg border-2 ${
                      (user?.totalWordsLearned || 0) >= 1 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center mb-2">
                        <AcademicCapIcon className={`h-6 w-6 mr-2 ${
                          (user?.totalWordsLearned || 0) >= 1 ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <h4 className="font-medium">Первые шаги</h4>
                      </div>
                      <p className="text-sm text-gray-600">Изучить первое слово</p>
                      <div className="mt-2">
                        <Badge variant={
                          (user?.totalWordsLearned || 0) >= 1 ? 'success' : 'secondary'
                        }>
                          {(user?.totalWordsLearned || 0) >= 1 ? 'Выполнено' : 'В процессе'}
                        </Badge>
                      </div>
                    </div>

                    {/* Достижение: Стрик */}
                    <div className={`p-4 rounded-lg border-2 ${
                      (user?.currentStreak || 0) >= 7 
                        ? 'border-orange-200 bg-orange-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center mb-2">
                        <FireIcon className={`h-6 w-6 mr-2 ${
                          (user?.currentStreak || 0) >= 7 ? 'text-orange-600' : 'text-gray-400'
                        }`} />
                        <h4 className="font-medium">Неделя подряд</h4>
                      </div>
                      <p className="text-sm text-gray-600">Изучать 7 дней подряд</p>
                      <div className="mt-2">
                        <Badge variant={
                          (user?.currentStreak || 0) >= 7 ? 'warning' : 'secondary'
                        }>
                          {(user?.currentStreak || 0) >= 7 ? 'Выполнено' : `${user?.currentStreak || 0}/7`}
                        </Badge>
                      </div>
                    </div>

                    {/* Достижение: Много слов */}
                    <div className={`p-4 rounded-lg border-2 ${
                      (user?.totalWordsLearned || 0) >= 100 
                        ? 'border-purple-200 bg-purple-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center mb-2">
                        <TrophyIcon className={`h-6 w-6 mr-2 ${
                          (user?.totalWordsLearned || 0) >= 100 ? 'text-purple-600' : 'text-gray-400'
                        }`} />
                        <h4 className="font-medium">Знаток слов</h4>
                      </div>
                      <p className="text-sm text-gray-600">Изучить 100 слов</p>
                      <div className="mt-2">
                        <Badge variant={
                          (user?.totalWordsLearned || 0) >= 100 ? 'primary' : 'secondary'
                        }>
                          {(user?.totalWordsLearned || 0) >= 100 
                            ? 'Выполнено' 
                            : `${user?.totalWordsLearned || 0}/100`
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      {/* Модальное окно настройки цели */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Настроить дневную цель"
      >
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество повторений в день
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Введите количество"
            />
            <p className="text-sm text-gray-500 mt-1">
              Рекомендуем начать с 10-20 повторений в день
            </p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowGoalModal(false)}
            >
              Отмена
            </Button>
            <Button onClick={handleUpdateGoal}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}