// frontend/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  CameraIcon,
  PencilIcon,
  CalendarIcon,
  FireIcon,
  BookOpenIcon,
  StarIcon,
  UsersIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth, useStats, useFriends } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CloudStreak } from '@/components/ui/CloudStreak';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate, getStreakEmoji, LANGUAGES } from '@/lib/utils';

export default function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuth();
  const { userStats, loadUserStats } = useStats();
  const { friends, loadFriends } = useFriends();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    // Загружаем друзей для отображения в профиле
    loadFriends();
  }, [user, userStats, loadUserStats, loadFriends]);

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

  // Загрузка файла аватара
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Конвертируем файл в base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        try {
          await updateProfile({ avatar: base64 });
          setShowAvatarModal(false);
          toast.success('Аватар обновлен!');
        } catch (error) {
          toast.error('Ошибка при загрузке аватара');
        } finally {
          setUploadingAvatar(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Ошибка чтения файла');
        setUploadingAvatar(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Ошибка при загрузке аватара');
      setUploadingAvatar(false);
    }
  };

  // Функция для отображения аватара
  const renderAvatar = (avatar: string | null, size: string = 'w-24 h-24') => {
    if (!avatar) {
      return (
        <div className={`${size} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
      );
    }

    // Если аватар начинается с data: (base64 изображение)
    if (avatar.startsWith('data:')) {
      return (
        <img 
          src={avatar} 
          alt="Avatar" 
          className={`${size} rounded-full object-cover border-2 border-white shadow-lg`}
        />
      );
    }

    // Если аватар - эмодзи
    return (
      <div className={`${size} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-4xl`}>
        {avatar}
      </div>
    );
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
                      className="cursor-pointer hover:scale-105 transition-transform relative group"
                      onClick={() => setShowAvatarModal(true)}
                    >
                      {renderAvatar(user.avatar)}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <CameraIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Основная информация */}
                  <div className="flex-1 space-y-4">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Имя пользователя
                          </label>
                          <Input
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Введите имя пользователя"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Изучаемый язык
                          </label>
                          <select
                            name="learningLanguage"
                            value={formData.learningLanguage}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {Object.entries(LANGUAGES).map(([key, lang]) => (
                              <option key={key} value={key}>
                                {lang.flag} {lang.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Дневная цель (повторений)
                          </label>
                          <Input
                            type="number"
                            name="dailyGoal"
                            value={formData.dailyGoal}
                            onChange={handleInputChange}
                            min="1"
                            max="100"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={handleSaveProfile} disabled={isLoading}>
                            {isLoading ? <LoadingSpinner size="sm" /> : 'Сохранить'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Отменить
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Имя пользователя</h3>
                          <p className="text-lg font-semibold text-gray-900">{user.username}</p>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Email</h3>
                          <p className="text-gray-600">{user.email}</p>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Изучаемый язык</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {LANGUAGES[user.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}
                            </span>
                            <span className="text-gray-900">
                              {LANGUAGES[user.learningLanguage as keyof typeof LANGUAGES]?.name || user.learningLanguage}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Дневная цель (повторений)</h3>
                          <p className="text-lg font-semibold text-gray-900">
                            {user.dailyGoal} повторений в день
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Статистика и достижения */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Статистика */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Статистика</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                    <FireIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Текущий стрик</p>
                    <p className="text-xl font-bold text-gray-900">
                      {user.currentStreak || 0} {getStreakEmoji(user.currentStreak || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                    <StarIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Лучший стрик</p>
                    <p className="text-xl font-bold text-gray-900">{user.longestStreak || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <BookOpenIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Выучено слов</p>
                    <p className="text-xl font-bold text-gray-900">{user.totalWordsLearned || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">С нами с</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(user.joinDate || new Date())}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Достижения */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Достижения</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  (user.currentStreak || 0) >= 7 ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    (user.currentStreak || 0) >= 7 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <FireIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Неделя в деле</p>
                    <p className="text-xs text-gray-500">Стрик 7 дней</p>
                  </div>
                  {(user.currentStreak || 0) >= 7 && (
                    <Badge variant="success" className="ml-auto">✓</Badge>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  (user.totalWordsLearned || 0) >= 50 ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    (user.totalWordsLearned || 0) >= 50 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <BookOpenIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Знаток слов</p>
                    <p className="text-xs text-gray-500">Выучить 50 слов</p>
                  </div>
                  {(user.totalWordsLearned || 0) >= 50 && (
                    <Badge variant="success" className="ml-auto">✓</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Друзья */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Друзья</h3>
                  <Badge variant="secondary">{friends.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <UsersIcon className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Пока нет друзей</p>
                    <p className="text-xs">Найдите друзей и изучайте вместе!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friends.slice(0, 3).map((friend: any) => (
                      <div key={friend.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          {friend.avatar?.startsWith('data:') ? (
                            <img 
                              src={friend.avatar} 
                              alt={friend.username} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">{friend.avatar || '👤'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{friend.username}</p>
                          <div className="flex items-center gap-2">
                            <CloudStreak days={friend.cloudStreak || 0} size="sm" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {friends.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        и еще {friends.length - 3} друзей
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Модальное окно выбора аватара */}
        <Modal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          title="Изменить аватар"
        >
          <div className="p-6 space-y-6">
            {/* Загрузка файла */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Загрузить изображение</h4>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-2"
                >
                  {uploadingAvatar ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <PhotoIcon className="h-4 w-4" />
                  )}
                  Выбрать файл
                </Button>
                <span className="text-xs text-gray-500">
                  JPG, PNG до 5MB
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Разделитель */}
            <div className="border-t border-gray-200"></div>

            {/* Выбор эмодзи */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Или выберите эмодзи</h4>
              <div className="grid grid-cols-6 gap-3">
                {avatarEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleAvatarSelect(emoji)}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-2xl transition-colors hover:scale-105"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Убрать аватар */}
            <div className="border-t border-gray-200 pt-4">
              <Button
                variant="ghost"
                onClick={() => handleAvatarSelect('')}
                className="text-sm w-full"
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