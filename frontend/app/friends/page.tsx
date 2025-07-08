// frontend/app/friends/page.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
  PaperAirplaneIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { LANGUAGES } from '@/lib/utils';

// Мок данные для друзей (пока система не готова)
const mockFriends = [
  {
    id: '1',
    username: 'alex_lang',
    avatar: '🤓',
    learningLanguage: 'Korean',
    currentStreak: 12,
    totalWordsLearned: 245,
    cloudStreak: 8, // Совместная серия дней
    lastActive: '2 часа назад'
  },
  {
    id: '2', 
    username: 'maria_polyglot',
    avatar: '📚',
    learningLanguage: 'Chinese',
    currentStreak: 25,
    totalWordsLearned: 567,
    cloudStreak: 15, // Совместная серия дней
    lastActive: '1 день назад'
  },
  {
    id: '3',
    username: 'john_student',
    avatar: '🎯',
    learningLanguage: 'English',
    currentStreak: 3,
    totalWordsLearned: 89,
    cloudStreak: 2, // Совместная серия дней
    lastActive: '3 часа назад'
  }
];

// Функция для получения облачка в зависимости от серии
const getCloudStatus = (days: number) => {
  if (days >= 21) return { 
    emoji: '☁️✨', 
    size: 'large', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-50',
    label: 'Золотое облачко',
    description: '21+ дней совместного изучения!'
  };
  if (days >= 11) return { 
    emoji: '☁️🌟', 
    size: 'medium', 
    color: 'text-green-500', 
    bg: 'bg-green-50',
    label: 'Большое облачко',
    description: '11-20 дней вместе'
  };
  if (days >= 6) return { 
    emoji: '☁️💙', 
    size: 'small', 
    color: 'text-blue-500', 
    bg: 'bg-blue-50',
    label: 'Среднее облачко',
    description: '6-10 дней активности'
  };
  if (days >= 1) return { 
    emoji: '☁️', 
    size: 'tiny', 
    color: 'text-gray-500', 
    bg: 'bg-gray-50',
    label: 'Маленькое облачко',
    description: '1-5 дней изучения'
  };
  return { 
    emoji: '⭕', 
    size: 'none', 
    color: 'text-gray-300', 
    bg: 'bg-gray-50',
    label: 'Нет активности',
    description: 'Начните изучать вместе!'
  };
};

const FriendCard = ({ friend }: { friend: any }) => {
  const cloudStatus = getCloudStatus(friend.cloudStreak);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        {/* Левая часть - аватар и инфо */}
        <div className="flex items-center gap-4">
          {/* Аватар */}
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-2xl">{friend.avatar}</span>
          </div>

          {/* Информация */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900">{friend.username}</h3>
              <span className="text-xl">
                {LANGUAGES[friend.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                🔥 {friend.currentStreak} дней
              </span>
              <span className="flex items-center gap-1">
                📚 {friend.totalWordsLearned} слов
              </span>
            </div>
            
            <p className="text-xs text-gray-500">Активность: {friend.lastActive}</p>
          </div>
        </div>

        {/* Правая часть - облачко мотивации */}
        <div className="text-center">
          <div className={`${cloudStatus.bg} rounded-xl p-4 min-w-[120px]`}>
            <div className="text-3xl mb-2">{cloudStatus.emoji}</div>
            <div className={`font-bold text-lg ${cloudStatus.color}`}>
              {friend.cloudStreak} дней
            </div>
            <div className="text-xs font-medium text-gray-600 mt-1">
              {cloudStatus.label}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-[120px]">
            {cloudStatus.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');

  const handleAddFriend = () => {
    toast.success('Система добавления друзей скоро будет готова!');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Друзья</h1>
            <p className="text-gray-600 mt-1">
              Изучайте языки вместе и следите за прогрессом друг друга
            </p>
          </div>
          <Button onClick={handleAddFriend} className="flex items-center gap-2">
            <UserPlusIcon className="h-4 w-4" />
            Найти друзей
          </Button>
        </div>

        {/* Информация о системе облачков */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">💬</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Система облачков мотивации
                  </h3>
                  <p className="text-gray-700 text-sm mb-3">
                    Изучайте языки вместе с друзьями! Когда вы оба выполняете дневную норму (повторяете слова), 
                    ваше общее облачко растет и меняется:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☁️</span>
                      <span>1-5 дней</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☁️💙</span>
                      <span>6-10 дней</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☁️🌟</span>
                      <span>11-20 дней</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☁️✨</span>
                      <span>21+ дней</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Вкладки */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'friends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              Мои друзья
              <Badge variant="secondary" className="text-xs">
                {mockFriends.length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Поиск
            </button>
          </nav>
        </div>

        {/* Содержимое */}
        {activeTab === 'friends' ? (
          <motion.div
            key="friends"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {mockFriends.length > 0 ? (
              mockFriends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} />
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="font-medium text-lg mb-2">У вас пока нет друзей</h3>
                <p className="text-sm mb-4">Найдите друзей для совместного изучения языков!</p>
                <Button onClick={handleAddFriend}>
                  Найти друзей
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Поиск */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени пользователя или email..."
                className="pl-10"
              />
            </div>

            {/* Заглушка поиска */}
            <Card>
              <CardContent className="p-12 text-center">
                <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="font-medium text-lg mb-2 text-gray-700">Поиск друзей</h3>
                <p className="text-gray-500 mb-4">
                  Функция поиска и добавления друзей находится в разработке.
                </p>
                <p className="text-sm text-gray-400">
                  Скоро вы сможете искать друзей по имени пользователя и отправлять заявки!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}