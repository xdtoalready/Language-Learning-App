// frontend/components/friends/FriendAchievements.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon, StarIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AchievementsGrid } from '@/components/ui/AchievementsGrid';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAchievements } from '@/store/useStore';
import { toast } from 'react-hot-toast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'streak' | 'words' | 'reviews' | 'special';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  achieved: boolean;
  progress: number;
  maxProgress: number;
  achievedAt?: Date;
}

interface FriendAchievementsProps {
  friendId: string;
  friendName: string;
  className?: string;
}

export const FriendAchievements: React.FC<FriendAchievementsProps> = ({
  friendId,
  friendName,
  className = ''
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { loadFriendAchievements } = useAchievements();

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        const friendAchievements = await loadFriendAchievements(friendId);
        setAchievements(friendAchievements);
      } catch (error) {
        console.error('Failed to load friend achievements:', error);
        toast.error('Не удалось загрузить достижения друга');
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [friendId, loadFriendAchievements]);

  const completedAchievements = achievements.filter(a => a.achieved);
  const achievementProgress = {
    completed: completedAchievements.length,
    total: achievements.length,
    percentage: achievements.length > 0 ? Math.round((completedAchievements.length / achievements.length) * 100) : 0
  };

  const displayedAchievements = showAll ? achievements : achievements.slice(0, 6);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold">Достижения</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Достижения {friendName}
          </h3>
          <div className="flex items-center space-x-2">
            <TrophyIcon className="h-5 w-5 text-yellow-500" />
            <Badge variant="secondary">
              {achievementProgress.completed} из {achievementProgress.total}
            </Badge>
          </div>
        </div>
        
        {achievementProgress.total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Общий прогресс</span>
              <span>{achievementProgress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${achievementProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {achievements.length === 0 ? (
          <div className="text-center py-8">
            <TrophyIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              У {friendName} пока нет достижений
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Статистика по типам достижений */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['streak', 'words', 'reviews', 'special'].map(type => {
                const typeAchievements = completedAchievements.filter(a => a.type === type);
                const typeIcon = {
                  streak: '🔥',
                  words: '📚',
                  reviews: '💪',
                  special: '⭐'
                }[type];
                
                return (
                  <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-1">{typeIcon}</div>
                    <div className="text-lg font-bold text-gray-900">
                      {typeAchievements.length}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                      {type}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Сетка достижений */}
            <AchievementsGrid 
              achievements={displayedAchievements}
              compact={true}
              showOnlyAchieved={false}
            />

            {/* Кнопка показать все */}
            {achievements.length > 6 && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll ? 'Скрыть' : `Показать все (${achievements.length})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Компонент для быстрого просмотра достижений (для карточки друга)
interface FriendAchievementsSummaryProps {
  friendId: string;
  className?: string;
}

export const FriendAchievementsSummary: React.FC<FriendAchievementsSummaryProps> = ({
  friendId,
  className = ''
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { loadFriendAchievements } = useAchievements();

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        const friendAchievements = await loadFriendAchievements(friendId);
        setAchievements(friendAchievements);
      } catch (error) {
        console.error('Failed to load friend achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievements();
  }, [friendId, loadFriendAchievements]);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
        <span className="text-sm text-gray-400">Загрузка...</span>
      </div>
    );
  }

  const completedAchievements = achievements.filter(a => a.achieved);
  const latestAchievements = completedAchievements.slice(0, 3);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <TrophyIcon className="h-4 w-4 text-yellow-500" />
      <span className="text-sm text-gray-600">
        {completedAchievements.length} достижений
      </span>
      {latestAchievements.length > 0 && (
        <div className="flex items-center space-x-1">
          {latestAchievements.map(achievement => (
            <span key={achievement.id} className="text-sm" title={achievement.name}>
              {achievement.icon}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};