// frontend/app/friends/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  FireIcon,
  BookOpenIcon,
  StarIcon,
  HeartIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CloudStreak } from '@/components/ui/CloudStreak';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate, getStreakEmoji, LANGUAGES } from '@/lib/utils';
import { useFriends } from '@/store/useStore';

interface FriendProfile {
  id: string;
  username: string;
  avatar: string | null;
  learningLanguage: string;
  currentStreak: number;
  longestStreak: number;
  totalWordsLearned: number;
  joinDate: string;
  lastActiveDate: string | null;
  friendshipDate: string;
  cloudStreak: number;
  longestCloudStreak: number;
  lastCloudActivity: string | null;
  isFriend: boolean;
}

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { removeFriend } = useFriends();
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  const friendId = params.id as string;

  // Загружаем профиль друга
  useEffect(() => {
    const loadFriendProfile = async () => {
      try {
        setIsLoading(true);
        
        // Вызов API для получения профиля друга
        const response = await fetch(`/api/friends/${friendId}/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Friend not found');
        }

        const data = await response.json();
        setFriendProfile(data.friend);
        
      } catch (error) {
        console.error('Error loading friend profile:', error);
        toast.error('Ошибка загрузки профиля друга');
        router.push('/friends');
      } finally {
        setIsLoading(false);
      }
    };

    if (friendId) {
      loadFriendProfile();
    }
  }, [friendId, router]);

  const handleRemoveFriend = async () => {
    if (!friendProfile) return;
    
    const confirmed = window.confirm(`Удалить ${friendProfile.username} из друзей?`);
    if (!confirmed) return;

    try {
      setIsRemoving(true);
      await removeFriend(friendProfile.id);
      toast.success(`${friendProfile.username} удален из друзей`);
      router.push('/friends');
    } catch (error) {
      toast.error('Ошибка при удалении друга');
    } finally {
      setIsRemoving(false);
    }
  };

  // Функция для отображения аватара
  const renderAvatar = (avatar: string | null, size: string = 'w-24 h-24') => {
    if (!avatar) {
      return (
        <div className={`${size} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold`}>
          {friendProfile?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
      );
    }

    if (avatar.startsWith('data:')) {
      return (
        <img 
          src={avatar} 
          alt="Avatar" 
          className={`${size} rounded-full object-cover border-4 border-white shadow-lg`}
        />
      );
    }

    return (
      <div className={`${size} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-4xl`}>
        {avatar}
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!friendProfile) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Профиль не найден</h2>
          <Button onClick={() => router.push('/friends')}>
            Вернуться к друзьям
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Шапка с кнопкой назад */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/friends')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Назад к друзьям
          </Button>
        </div>

        {/* Основная информация профиля */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Левая часть - аватар и основная информация */}
                <div className="flex flex-col items-center lg:items-start">
                  {renderAvatar(friendProfile.avatar, 'w-32 h-32')}
                  
                  <div className="text-center lg:text-left mt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">
                        {friendProfile.username}
                      </h1>
                      <span className="text-2xl">
                        {LANGUAGES[friendProfile.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      Изучает {LANGUAGES[friendProfile.learningLanguage as keyof typeof LANGUAGES]?.name || friendProfile.learningLanguage}
                    </p>

                    {friendProfile.isFriend && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Badge variant="success" className="flex items-center gap-2 justify-center">
                          <HeartIcon className="h-4 w-4" />
                          Ваш друг с {formatDate(friendProfile.friendshipDate)}
                        </Badge>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveFriend}
                          disabled={isRemoving}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinusIcon className="h-4 w-4 mr-2" />
                          {isRemoving ? 'Удаление...' : 'Удалить из друзей'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Правая часть - статистика */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <FireIcon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {friendProfile.currentStreak}
                    </div>
                    <div className="text-sm text-gray-600">Текущий стрик</div>
                  </div>

                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <BookOpenIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {friendProfile.totalWordsLearned}
                    </div>
                    <div className="text-sm text-gray-600">Слов изучено</div>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <StarIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {friendProfile.longestStreak}
                    </div>
                    <div className="text-sm text-gray-600">Лучший стрик</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CalendarIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.ceil((Date.now() - new Date(friendProfile.joinDate).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-sm text-gray-600">Дней с нами</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Облачко мотивации */}
        {friendProfile.isFriend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">
                  Ваше общее облачко мотивации
                </h2>
                <p className="text-gray-600 text-sm">
                  Облачко растет, когда вы оба выполняете дневную норму
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-8">
                <CloudStreak days={friendProfile.cloudStreak} size="lg" />
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {friendProfile.cloudStreak}
                    </div>
                    <div className="text-sm text-gray-600">Текущее облачко</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {friendProfile.longestCloudStreak}
                    </div>
                    <div className="text-sm text-gray-600">Лучшее облачко</div>
                  </div>
                </div>

                {friendProfile.lastCloudActivity && (
                  <p className="text-xs text-gray-500 mt-4">
                    Последняя совместная активность: {formatDate(friendProfile.lastCloudActivity)}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}