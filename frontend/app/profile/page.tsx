// frontend/app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  CameraIcon,
  PencilIcon,
  CalendarIcon,
  FireIcon,
  BookOpenIcon,
  StarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth, useStats } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate, getStreakEmoji, LANGUAGES } from '@/lib/utils';

export default function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuth();
  const { userStats, loadUserStats } = useStats();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    learningLanguage: '',
    dailyGoal: 10
  });

  // Загружаем данные при монтировании
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        learningLanguage: user.learningLanguage || 'Korean',
        dailyGoal: user.dailyGoal || 10
      });
    }
    
    if (!userStats) {
      loadUserStats();
    }
  }, [user, userStats, loadUserStats]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Профиль обновлен!');
    } catch (error) {
      toast.error('Ошибка при обновлении профиля');
      console.error('Profile update error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dailyGoal' ? parseInt(value) || 10 : value
    }));
  };

  // Выбор аватара из эмодзи
  const avatarEmojis = ['😊', '🤓', '📚', '🌟', '🎯', '🔥', '💪', '🚀', '🎨', '🌸', '🦋', '⭐'];
  
  const handleAvatarSelect = async (emoji: string) => {
    try {
      await updateProfile({ avatar: emoji });
      setShowAvatarModal(false);
      toast.success('Аватар обновлен!');
    } catch (error) {
      toast.error('Ошибка при обновлении аватара');
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Мой профиль</h1>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "secondary" : "primary"}
            className="flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            {isEditing ? 'Отменить' : 'Редактировать'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная информация */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Основная информация</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Аватар и основные данные */}
                <div className="flex items-start gap-6">
                  {/* Аватар */}
                  <div className="relative">
                    <div 
                      className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setShowAvatarModal(true)}
                    >
                      {user.avatar ? (
                        <span className="text-3xl">{user.avatar}</span>
                      ) : (
                        <UserIcon className="h-12 w-12 text-white" />
                      )}
                    </div>
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                    >
                      <CameraIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Основные данные */}
                  <div className="flex-1 space-y-4">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Имя пользователя
                      </label>
                      {isEditing ? (
                        <Input
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="Введите имя пользователя"
                        />
                      ) : (
                        <p className="text-lg font-medium text-gray-900">{user.username}</p>
                      )}
                    </div>

                    {/* Email (неизменяемый) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-gray-600">{user.email}</p>
                    </div>

                    {/* Язык изучения */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Изучаемый язык
                      </label>
                      {isEditing ? (
                        <select
                          name="learningLanguage"
                          value={formData.learningLanguage}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(LANGUAGES).map(([key, value]) => (
                            <option key={key} value={key}>
                              {value.flag} {value.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{LANGUAGES[user.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}</span>
                          <span className="text-gray-900">{LANGUAGES[user.learningLanguage as keyof typeof LANGUAGES]?.name || user.learningLanguage}</span>
                        </div>
                      )}
                    </div>

                    {/* Дневная цель */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дневная цель (повторений)
                      </label>
                      {isEditing ? (
                        <Input
                          type="number"
                          name="dailyGoal"
                          value={formData.dailyGoal}
                          onChange={handleInputChange}
                          min="1"
                          max="100"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-medium text-gray-900">{user.dailyGoal}</span>
                          <span className="text-gray-600">повторений в день</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Кнопки действий при редактировании */}
                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Статистика */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Основные метрики */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Статистика</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Текущий стрик */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FireIcon className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-gray-600">Текущий стрик</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-lg">{user.currentStreak}</span>
                    <span className="text-lg">{getStreakEmoji(user.currentStreak)}</span>
                  </div>
                </div>

                {/* Лучший стрик */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StarIcon className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-gray-600">Лучший стрик</span>
                  </div>
                  <span className="font-bold text-lg">{user.longestStreak}</span>
                </div>

                {/* Выученные слова */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-gray-600">Выучено слов</span>
                  </div>
                  <span className="font-bold text-lg">{user.totalWordsLearned}</span>
                </div>

                {/* Дата регистрации */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-600">С нами с</span>
                  </div>
                  <span className="text-sm font-medium">{formatDate(user.joinDate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Достижения */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Достижения</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Стрик достижения */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    user.currentStreak >= 7 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <FireIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Неделя в деле</p>
                    <p className="text-xs text-gray-500">Стрик 7 дней</p>
                  </div>
                  {user.currentStreak >= 7 && (
                    <Badge variant="success" className="ml-auto">✓</Badge>
                  )}
                </div>

                {/* Слова достижения */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    user.totalWordsLearned >= 50 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <BookOpenIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Знаток слов</p>
                    <p className="text-xs text-gray-500">Выучить 50 слов</p>
                  </div>
                  {user.totalWordsLearned >= 50 && (
                    <Badge variant="success" className="ml-auto">✓</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Заглушка друзей */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Друзья</h3>
                  <Badge variant="secondary">Скоро</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-gray-500">
                  <UsersIcon className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Система друзей в разработке</p>
                  <p className="text-xs">Скоро можно будет добавлять друзей!</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Модальное окно выбора аватара */}
        <Modal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          title="Выберите аватар"
        >
          <div className="p-6">
            <div className="grid grid-cols-6 gap-3">
              {avatarEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarSelect(emoji)}
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => handleAvatarSelect('')}
                className="text-sm"
              >
                Убрать аватар
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}