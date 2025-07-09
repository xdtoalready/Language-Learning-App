// frontend/app/friends/page.tsx (обновленная с SVG облачками)
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
  PaperAirplaneIcon,
  CheckIcon,
  UserIcon,
  XMarkIcon,
  ClockIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CloudStreak } from '@/components/ui/CloudStreak';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useFriends } from '@/store/useStore';
import { LANGUAGES } from '@/lib/utils';

type TabType = 'friends' | 'search' | 'requests';

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);

  const {
    friends,
    pendingRequests,
    isLoadingFriends,
    loadFriends,
    loadPendingRequests,
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend
  } = useFriends();

  // Загружаем данные при монтировании
  useEffect(() => {
    if (!hasLoadedInitially) {
      console.log('👥 FriendsPage: Первичная загрузка...');
      loadFriends();
      loadPendingRequests();
      setHasLoadedInitially(true);
    }
  }, [hasLoadedInitially, loadFriends, loadPendingRequests]);

  // Поиск пользователей с debounce
    useEffect(() => {
    const timeoutId = setTimeout(async () => {
        if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
            console.log('🔍 Поиск друзей:', searchQuery.trim());
            const results = await searchUsers(searchQuery.trim());
            console.log('✅ Результаты поиска:', results);
            setSearchResults(results);
        } catch (error) {
            console.error('❌ Ошибка поиска:', error);
            toast.error('Ошибка поиска пользователей');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
        } else {
        setSearchResults([]);
        setIsSearching(false);
        }
    }, 500);

    return () => clearTimeout(timeoutId);
    }, [searchQuery, searchUsers]);

    // Также можно добавить минимальную валидацию:
// const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//   const value = e.target.value;
//   if (value.length <= 50) { // Максимальная длина поиска
//     setSearchQuery(value);
//   }
// };

  const handleSendFriendRequest = async (friendId: string) => {
    try {
      await sendFriendRequest(friendId);
      toast.success('Заявка в друзья отправлена!');
      // Обновляем результаты поиска
      if (searchQuery.trim().length >= 2) {
        const results = await searchUsers(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка отправки заявки');
    }
  };

  const handleRespondToRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    try {
      await respondToFriendRequest(friendshipId, action);
      toast.success(action === 'accept' ? 'Заявка принята!' : 'Заявка отклонена');
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка ответа на заявку');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, username: string) => {
    if (confirm(`Удалить ${username} из друзей?`)) {
      try {
        await removeFriend(friendshipId);
        toast.success('Друг удален');
      } catch (error: any) {
        toast.error(error?.message || 'Ошибка удаления друга');
      }
    }
  };

  const formatLastActive = (lastActiveDate: string | Date | null) => {
    if (!lastActiveDate) return 'давно';
    
    const date = new Date(lastActiveDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'сейчас';
    if (diffHours < 24) return `${diffHours} ч. назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString();
  };

  // Функция для отображения аватара
  const renderAvatar = (avatar: string | null, size: string = 'w-16 h-16') => {
    if (!avatar) {
      return (
        <div className={`${size} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold`}>
          👤
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

    // Если аватар - эмодзи или текст
    return (
      <div className={`${size} bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl`}>
        {avatar}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Друзья</h1>
            <p className="text-gray-600 mt-1">
              Изучайте языки вместе и следите за прогрессом друг друга
            </p>
          </div>
          <Button 
            onClick={() => setActiveTab('search')} 
            className="flex items-center gap-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            Найти друзей
          </Button>
        </div>

        {/* Вкладки */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'friends'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              Мои друзья ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Поиск
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              Заявки ({pendingRequests.length})
            </button>
          </nav>
        </div>

        {/* Контент вкладок */}
        <AnimatePresence mode="wait">
            {activeTab === 'friends' && (
            <motion.div
                key="friends"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
            >
                {isLoadingFriends ? (
                <div className="flex justify-center py-8">
                    <LoadingSpinner />
                </div>
                ) : friends.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                    <UsersIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Пока нет друзей</h3>
                    <p className="text-gray-500 mb-6">
                        Найдите друзей и изучайте языки вместе! Вместе веселее и эффективнее.
                    </p>
                    <Button onClick={() => setActiveTab('search')}>
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        Найти друзей
                    </Button>
                    </CardContent>
                </Card>
                ) : (
                // ИЗМЕНИЛИ: теперь используем 3 колонки вместо 2
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friends.map((friend) => (
                    <FriendCard 
                        key={friend.id} 
                        friend={friend} 
                        onRemove={() => handleRemoveFriend(friend.friendshipId, friend.username)}
                        formatLastActive={formatLastActive}
                        renderAvatar={renderAvatar}
                    />
                    ))}
                </div>
                )}
            </motion.div>
            )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Поиск по имени пользователя или email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}

                  {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <p className="text-sm text-gray-500 mt-3">
                      Введите минимум 2 символа для поиска
                    </p>
                  )}

                  {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                    <p className="text-sm text-gray-500 mt-3">
                      Пользователи не найдены
                    </p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {searchResults.map((user) => (
                        <UserSearchCard 
                          key={user.id} 
                          user={user} 
                          onSendRequest={() => handleSendFriendRequest(user.id)}
                          renderAvatar={renderAvatar}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Нет заявок</h3>
                    <p className="text-gray-500">
                      У вас пока нет входящих заявок в друзья
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <PendingRequestCard 
                      key={request.id} 
                      request={request} 
                      onRespond={(action) => handleRespondToRequest(request.id, action)}
                      renderAvatar={renderAvatar}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

// Компонент карточки друга с красивым облачком
const FriendCard = ({ friend, onRemove, formatLastActive, renderAvatar }: { 
  friend: any; 
  onRemove: () => void;
  formatLastActive: (date: string | Date | null) => string; // Добавили этот тип
  renderAvatar: (avatar: string | null, size?: string) => JSX.Element;
}) => {
  const router = useRouter(); // Добавьте эту строку

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        {/* Левая часть - аватар и инфо */}
        <div className="flex items-center gap-4">
          {renderAvatar(friend.avatar)}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900">{friend.username}</h3>
              <span className="text-xl">
                {LANGUAGES[friend.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}
              </span>
              {/* Маленькое облачко рядом с ником */}
              <CloudStreak days={friend.cloudStreak || 0} size="xs" />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                🔥 {friend.currentStreak || 0} дней
              </span>
              <span className="flex items-center gap-1">
                📚 {friend.totalWordsLearned || 0} слов
              </span>
            </div>
            
            <p className="text-xs text-gray-500">
              Активность: {formatLastActive(friend.lastActiveDate)}
            </p>
          </div>
        </div>

        {/* Кнопка удаления */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500"
        >
          <XMarkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Кнопка просмотра профиля */}
      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            router.push(`/friends/${friend.id}`);
          }}
          className="flex items-center gap-2"
        >
          <UserIcon className="h-4 w-4" />
          Посмотреть профиль
        </Button>
      </div>
    </motion.div>
  );
};

// Компонент карточки поиска пользователя
const UserSearchCard = ({ user, onSendRequest, renderAvatar }: { 
  user: any; 
  onSendRequest: () => void;
  renderAvatar: (avatar: string | null, size?: string) => JSX.Element;
}) => {
  const getStatusButton = () => {
    switch (user.friendshipStatus) {
      case 'friends':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <HeartIcon className="h-3 w-3" />
            Друзья
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="secondary">Заявка отправлена</Badge>
        );
      case 'received':
        return (
          <Badge variant="warning">Есть заявка</Badge>
        );
      case 'blocked':
        return (
          <Badge variant="destructive">Заблокирован</Badge>
        );
      default:
        return (
          <Button size="sm" onClick={onSendRequest} className="flex items-center gap-1">
            <PaperAirplaneIcon className="h-3 w-3" />
            Добавить
          </Button>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {renderAvatar(user.avatar, 'w-12 h-12')}
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{user.username}</h4>
            <span className="text-sm">
              {LANGUAGES[user.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>🔥 {user.currentStreak || 0}</span>
            <span>📚 {user.totalWordsLearned || 0}</span>
            <span>Изучает {LANGUAGES[user.learningLanguage as keyof typeof LANGUAGES]?.name || user.learningLanguage}</span>
          </div>
        </div>
      </div>
      {getStatusButton()}
    </div>
  );
};

// Компонент карточки входящей заявки
const PendingRequestCard = ({ request, onRespond, renderAvatar }: { 
  request: any; 
  onRespond: (action: 'accept' | 'reject') => void;
  renderAvatar: (avatar: string | null, size?: string) => JSX.Element;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {renderAvatar(request.user.avatar)}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900">{request.user.username}</h3>
              <span className="text-xl">
                {LANGUAGES[request.user.learningLanguage as keyof typeof LANGUAGES]?.flag || '🌍'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                🔥 {request.user.currentStreak || 0} дней
              </span>
              <span className="flex items-center gap-1">
                📚 {request.user.totalWordsLearned || 0} слов
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Заявка отправлена {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onRespond('accept')}
            className="flex items-center gap-1"
            size="sm"
          >
            <CheckIcon className="h-4 w-4" />
            Принять
          </Button>
          <Button
            onClick={() => onRespond('reject')}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <XMarkIcon className="h-4 w-4" />
            Отклонить
          </Button>
        </div>
      </div>
    </motion.div>
  );
};