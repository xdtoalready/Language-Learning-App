// frontend/app/stats/page.tsx - Обновленная версия с достижениями

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ClockIcon,
  Cog6ToothIcon,
  StarIcon
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
import { AchievementsGrid, AchievementsSummary } from '@/components/ui/AchievementsGrid';
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
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'progress'>('overview');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  
  const { userStats, isLoadingStats, loadUserStats, updateDailyGoal } = useStats();
  const { user } = useAuth();

  // Мемоизированная функция загрузки статистики
  const loadStatsOnce = useCallback(() => {
    if (!hasLoadedInitially && !userStats && !isLoadingStats) {
      console.log('📈 StatsPage: Первичная загрузка статистики...');
      loadUserStats().catch(console.error);
      setHasLoadedInitially(true);
    }
  }, [hasLoadedInitially, userStats, isLoadingStats, loadUserStats]);

  useEffect(() => {
    loadStatsOnce();
  }, []);

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
  const masteryData = userStats?.masteryDistribution ? 
    Object.entries(userStats.masteryDistribution).map(([level, count]) => ({
      name: MASTERY_LEVELS[parseInt(level)]?.name || `Уровень ${level}`,
      value: count,
      color: MASTERY_LEVELS[parseInt(level)]?.color || '#gray-500'
    })) : [];

  const weeklyData = userStats?.weeklyProgress || [];
  const achievements = userStats?.achievements || [];
  const achievementProgress = userStats?.achievementProgress || { completed: 0, total: 0, percentage: 0 };

  // Фильтрация достижений
  const filteredAchievements = achievements.filter(achievement => {
    switch (achievementFilter) {
      case 'completed':
        return achievement.achieved;
      case 'incomplete':
        return !achievement.achieved;
      default:
        return true;
    }
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (isLoadingStats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

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
            className="flex items-center gap-3"
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

        {/* Вкладки */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ChartBarIcon className="h-4 w-4 inline mr-2" />
                Обзор
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'achievements'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrophyIcon className="h-4 w-4 inline mr-2" />
                Достижения ({achievementProgress.completed}/{achievementProgress.total})
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'progress'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CalendarDaysIcon className="h-4 w-4 inline mr-2" />
                Прогресс
              </button>
            </nav>
          </div>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
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
                            {userStats.dailyProgress.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(userStats.dailyProgress.percentage, 100)}%`
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

            {/* Сводка достижений */}
            {achievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <AchievementsSummary achievements={achievements} />
              </motion.div>
            )}

            {/* Графики */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Распределение по уровням мастерства */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
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

              {/* Недельный прогресс */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
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
          </div>
        )}

        {/* Вкладка достижений */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            {/* Фильтры достижений */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Показать:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAchievementFilter('all')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      achievementFilter === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Все ({achievements.length})
                  </button>
                  <button
                    onClick={() => setAchievementFilter('completed')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      achievementFilter === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Выполнено ({achievementProgress.completed})
                  </button>
                  <button
                    onClick={() => setAchievementFilter('incomplete')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      achievementFilter === 'incomplete'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    В процессе ({achievements.length - achievementProgress.completed})
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <StarIcon className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">
                  Прогресс: {achievementProgress.percentage}%
                </span>
              </div>
            </div>

            {/* Сетка достижений */}
            <AchievementsGrid 
              achievements={filteredAchievements}
              showOnlyAchieved={achievementFilter === 'completed'}
            />
          </div>
        )}

        {/* Вкладка прогресса */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Общая статистика */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Общая статистика
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Всего слов</span>
                      <span className="font-medium">{userStats?.totals.words || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Всего повторений</span>
                      <span className="font-medium">{userStats?.totals.reviews || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Друзей</span>
                      <span className="font-medium">{userStats?.totals.friends || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Достижений</span>
                      <span className="font-medium">{achievementProgress.completed}/{achievementProgress.total}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Статистика стрика */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Стрик изучения
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">
                        {getStreakEmoji(userStats?.user.currentStreak || 0)}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {userStats?.user.currentStreak || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        дней подряд
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Лучший стрик</span>
                      <span className="font-medium">{userStats?.user.longestStreak || 0} дней</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Статистика изучения */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Изучение слов
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Выучено</span>
                      <span className="font-medium text-green-600">
                        {userStats?.learningStats.wordsMastered || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">В процессе</span>
                      <span className="font-medium text-blue-600">
                        {userStats?.learningStats.wordsInProgress || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">На сегодня</span>
                      <span className="font-medium text-orange-600">
                        {userStats?.learningStats.wordsToday || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
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