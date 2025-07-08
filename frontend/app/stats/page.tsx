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
    loadUserStats();
  }, [loadUserStats]);

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

  if (isLoadingStats) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <LoadingSpinner size="lg" className="text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка статистики...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!userStats) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Не удалось загрузить статистику</p>
          <Button onClick={loadUserStats} className="mt-4">
            Попробовать снова
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Подготовка данных для графиков
  const masteryData = MASTERY_LEVELS.map(level => ({
    name: level.label,
    value: userStats.learningStats.masteryDistribution[level.value as keyof typeof userStats.learningStats.masteryDistribution],
    color: `hsl(${level.value * 60}, 70%, 60%)`
  })).filter(item => item.value > 0);

  const weeklyData = userStats.weeklyActivity.map(day => ({
    date: formatDateShort(day.date),
    reviews: day.reviewCount,
    rating: day.averageRating
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>
            <p className="text-gray-600 mt-2">
              Ваш прогресс в изучении языка
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setNewGoal(user?.dailyGoal?.toString() || '10');
              setShowGoalModal(true);
            }}
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Настроить цель
          </Button>
        </div>

        {/* Основные метрики */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">
                      Текущий стрик
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {userStats.user.currentStreak}
                    </p>
                    <p className="text-orange-100 text-sm">
                      {getStreakText(userStats.user.currentStreak)}
                    </p>
                  </div>
                  <div className="text-4xl">
                    {getStreakEmoji(userStats.user.currentStreak)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Всего слов
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {userStats.learningStats.totalWords}
                    </p>
                    <p className="text-blue-100 text-sm">
                      В изучении: {userStats.learningStats.wordsInProgress}
                    </p>
                  </div>
                  <AcademicCapIcon className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-green-400 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">
                      Выучено слов
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {userStats.learningStats.wordsMastered}
                    </p>
                    <p className="text-green-100 text-sm">
                      Рекорд: {userStats.user.longestStreak} дней
                    </p>
                  </div>
                  <TrophyIcon className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-purple-400 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">
                      Дневной прогресс
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {userStats.dailyProgress.percentage}%
                    </p>
                    <p className="text-purple-100 text-sm">
                      {userStats.dailyProgress.completed} / {userStats.dailyProgress.goal}
                    </p>
                  </div>
                  <CalendarDaysIcon className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* График активности за неделю */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-3 text-blue-600" />
                  Активность за неделю
                </h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="reviews" 
                        fill="#3B82F6" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Среднее за неделю: {userStats.weeklyAverageRating.toFixed(1)} ⭐
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Распределение по уровням мастерства */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <AcademicCapIcon className="h-6 w-6 mr-3 text-green-600" />
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
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {masteryData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Нет данных для отображения
                  </div>
                )}
                
                {/* Легенда */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {masteryData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Дополнительная статистика */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Общая информация */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Общая информация
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Дата регистрации:</span>
                <span className="font-medium">
                  {formatDate(userStats.user.joinDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Дней с нами:</span>
                <span className="font-medium">
                  {userStats.user.memberFor}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Последняя активность:</span>
                <span className="font-medium">
                  {userStats.user.lastActiveDate 
                    ? formatDate(userStats.user.lastActiveDate)
                    : 'Нет данных'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Всего повторений:</span>
                <span className="font-medium">
                  {userStats.totals.reviews}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Достижения */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Достижения
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <FireIcon className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-sm font-medium">Огненный стрик</span>
                </div>
                <Badge variant="warning">
                  {userStats.user.longestStreak} дней
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <TrophyIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium">Слов выучено</span>
                </div>
                <Badge variant="success">
                  {userStats.learningStats.wordsMastered}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium">Всего повторений</span>
                </div>
                <Badge variant="default">
                  {userStats.totals.reviews}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Настройки */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Настройки изучения
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Дневная цель:</span>
                <div className="flex items-center">
                  <span className="font-medium mr-2">
                    {user?.dailyGoal || 10} слов
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewGoal(user?.dailyGoal?.toString() || '10');
                      setShowGoalModal(true);
                    }}
                  >
                    Изменить
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Язык изучения:</span>
                <Badge variant="secondary">
                  {user?.learningLanguage || 'Не указан'}
                </Badge>
              </div>
              
              {/* Прогресс к цели */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Прогресс сегодня:</span>
                  <span className="font-medium">
                    {userStats.dailyProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${userStats.dailyProgress.percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Модальное окно настройки цели */}
        <Modal
          isOpen={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          title="Настроить дневную цель"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Установите количество слов, которые хотите повторять каждый день
            </p>
            <Input
              type="number"
              label="Дневная цель (слов)"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              min="1"
              max="100"
              placeholder="10"
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
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
      </div>
    </DashboardLayout>
  );
}