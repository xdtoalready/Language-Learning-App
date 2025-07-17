// frontend/components/ui/AchievementsGrid.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Card, CardContent } from '@/components/ui/Card';

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
  reward?: {
    points: number;
    badge: string;
  };
}

interface AchievementsGridProps {
  achievements: Achievement[];
  showOnlyAchieved?: boolean;
  compact?: boolean;
  className?: string;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'silver': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getDifficultyIcon = (difficulty: string) => {
  switch (difficulty) {
    case 'bronze': return '🥉';
    case 'silver': return '🥈';
    case 'gold': return '🥇';
    case 'platinum': return '💎';
    default: return '🏅';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'streak': return 'text-orange-600 bg-orange-50';
    case 'words': return 'text-blue-600 bg-blue-50';
    case 'reviews': return 'text-green-600 bg-green-50';
    case 'special': return 'text-purple-600 bg-purple-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export const AchievementsGrid: React.FC<AchievementsGridProps> = ({
  achievements,
  showOnlyAchieved = false,
  compact = false,
  className = ''
}) => {
  const filteredAchievements = showOnlyAchieved 
    ? achievements.filter(achievement => achievement.achieved)
    : achievements;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  if (filteredAchievements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {showOnlyAchieved ? 'Пока нет достижений' : 'Достижения не найдены'}
        </h3>
        <p className="text-gray-600">
          {showOnlyAchieved 
            ? 'Продолжайте изучать слова, чтобы получить первые достижения!'
            : 'Проблема с загрузкой достижений'
          }
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={`grid gap-4 ${compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {filteredAchievements.map((achievement) => (
        <motion.div
          key={achievement.id}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card className={`h-full transition-all duration-200 ${
            achievement.achieved 
              ? 'border-2 border-green-200 bg-green-50/50 shadow-md' 
              : 'border-gray-200 bg-white hover:shadow-md'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {/* Иконка достижения */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  achievement.achieved ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {achievement.achieved ? achievement.icon : '🔒'}
                </div>

                {/* Информация о достижении */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium text-sm ${
                      achievement.achieved ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {achievement.name}
                    </h4>
                    
                    {/* Сложность */}
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">
                        {getDifficultyIcon(achievement.difficulty)}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getDifficultyColor(achievement.difficulty)}`}
                      >
                        {achievement.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <p className={`text-xs mb-2 ${
                    achievement.achieved ? 'text-gray-700' : 'text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>

                  {/* Прогресс */}
                  {!achievement.achieved && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Прогресс</span>
                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                      </div>
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Статус */}
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={achievement.achieved ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {achievement.achieved ? 'Выполнено' : 'В процессе'}
                    </Badge>

                    {/* Тип достижения */}
                    <div className={`px-2 py-1 rounded-full text-xs ${getTypeColor(achievement.type)}`}>
                      {achievement.type === 'streak' && '🔥'}
                      {achievement.type === 'words' && '📚'}
                      {achievement.type === 'reviews' && '💪'}
                      {achievement.type === 'special' && '⭐'}
                    </div>
                  </div>

                  {/* Дата получения */}
                  {achievement.achieved && achievement.achievedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      Получено: {new Date(achievement.achievedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

// Компонент для отображения сводки достижений
interface AchievementsSummaryProps {
  achievements: Achievement[];
  className?: string;
}

export const AchievementsSummary: React.FC<AchievementsSummaryProps> = ({
  achievements,
  className = ''
}) => {
  const completed = achievements.filter(a => a.achieved).length;
  const total = achievements.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byDifficulty = achievements.reduce((acc, achievement) => {
    if (achievement.achieved) {
      acc[achievement.difficulty] = (acc[achievement.difficulty] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const byType = achievements.reduce((acc, achievement) => {
    if (achievement.achieved) {
      acc[achievement.type] = (acc[achievement.type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Ваши достижения
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {completed}/{total}
          </div>
          <div className="text-sm text-gray-600">
            {percentage}% завершено
          </div>
        </div>
      </div>

      <div className="mb-4">
        <Progress value={percentage} className="h-3" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* По сложности */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">По сложности</h4>
          <div className="space-y-1">
            {Object.entries(byDifficulty).map(([difficulty, count]) => (
              <div key={difficulty} className="flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1">
                  <span>{getDifficultyIcon(difficulty)}</span>
                  <span className="capitalize">{difficulty}</span>
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* По типу */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">По типу</h4>
          <div className="space-y-1">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1">
                  <span>
                    {type === 'streak' && '🔥'}
                    {type === 'words' && '📚'}
                    {type === 'reviews' && '💪'}
                    {type === 'special' && '⭐'}
                  </span>
                  <span className="capitalize">{type}</span>
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};