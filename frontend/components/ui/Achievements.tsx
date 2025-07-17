// frontend/components/ui/Achievements.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AcademicCapIcon,
  FireIcon,
  BookOpenIcon,
  TrophyIcon,
  StarIcon,
  CheckCircleIcon,
  HeartIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { Badge } from './Badge';
import { formatDate } from '@/lib/utils';

// Мапинг иконок
const ICON_MAP = {
  AcademicCapIcon,
  FireIcon,
  BookOpenIcon,
  TrophyIcon,
  StarIcon,
  CheckCircleIcon,
  HeartIcon
};

// Цвета для категорий
const COLOR_MAP = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    badge: 'success'
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    badge: 'warning'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'primary'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    badge: 'primary'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    badge: 'warning'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'destructive'
  },
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    icon: 'text-pink-600',
    badge: 'secondary'
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-400',
    badge: 'secondary'
  }
};

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  points: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  progress?: any;
  isSecret?: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  current: number;
  required: number;
  percentage: number;
}

interface AchievementsListProps {
  achievements: Achievement[];
  progress?: AchievementProgress[];
  showProgress?: boolean;
  layout?: 'grid' | 'list';
  maxDisplay?: number;
  className?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  progress?: AchievementProgress;
  showProgress?: boolean;
  layout?: 'grid' | 'list';
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  progress,
  showProgress = false,
  layout = 'grid'
}) => {
  const IconComponent = ICON_MAP[achievement.icon as keyof typeof ICON_MAP] || AcademicCapIcon;
  const colors = achievement.isUnlocked 
    ? COLOR_MAP[achievement.color as keyof typeof COLOR_MAP] || COLOR_MAP.gray
    : COLOR_MAP.gray;

  if (layout === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
          achievement.isUnlocked ? colors.bg + ' ' + colors.border : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
          achievement.isUnlocked ? colors.bg : 'bg-gray-100'
        }`}>
          {achievement.isSecret && !achievement.isUnlocked ? (
            <LockClosedIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <IconComponent className={`h-5 w-5 ${colors.icon}`} />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-sm">
            {achievement.isSecret && !achievement.isUnlocked ? '???' : achievement.name}
          </h4>
          <p className="text-xs text-gray-600">
            {achievement.isSecret && !achievement.isUnlocked ? 'Секретное достижение' : achievement.description}
          </p>
          {achievement.isUnlocked && achievement.unlockedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Получено {formatDate(achievement.unlockedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {achievement.points > 0 && (
            <span className="text-xs text-gray-500">{achievement.points} очков</span>
          )}
          {achievement.isUnlocked ? (
            <Badge variant={colors.badge as any} size="sm">
              ✓
            </Badge>
          ) : showProgress && progress ? (
            <Badge variant="secondary" size="sm">
              {progress.current}/{progress.required}
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              Заблокировано
            </Badge>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border-2 ${
        achievement.isUnlocked ? colors.bg + ' ' + colors.border : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center mb-3">
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg mr-3 ${
          achievement.isUnlocked ? colors.bg : 'bg-gray-100'
        }`}>
          {achievement.isSecret && !achievement.isUnlocked ? (
            <LockClosedIcon className="h-6 w-6 text-gray-400" />
          ) : (
            <IconComponent className={`h-6 w-6 ${colors.icon}`} />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium">
            {achievement.isSecret && !achievement.isUnlocked ? '???' : achievement.name}
          </h4>
          {achievement.points > 0 && (
            <span className="text-sm text-gray-500">{achievement.points} очков</span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        {achievement.isSecret && !achievement.isUnlocked ? 'Секретное достижение' : achievement.description}
      </p>

      {showProgress && progress && !achievement.isUnlocked && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Прогресс</span>
            <span className="text-gray-700">{progress.current}/{progress.required}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                colors.icon.replace('text-', 'bg-')
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        {achievement.isUnlocked && achievement.unlockedAt && (
          <p className="text-xs text-gray-500">
            {formatDate(achievement.unlockedAt)}
          </p>
        )}
        
        <Badge 
          variant={achievement.isUnlocked ? (colors.badge as any) : 'secondary'}
          className="ml-auto"
        >
          {achievement.isUnlocked ? 'Выполнено' : showProgress && progress ? `${progress.percentage}%` : 'Заблокировано'}
        </Badge>
      </div>
    </motion.div>
  );
};

export const AchievementsList: React.FC<AchievementsListProps> = ({
  achievements,
  progress = [],
  showProgress = false,
  layout = 'grid',
  maxDisplay,
  className = ''
}) => {
  const displayAchievements = maxDisplay ? achievements.slice(0, maxDisplay) : achievements;
  const progressMap = new Map(progress.map(p => [p.achievementId, p]));

  if (layout === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        {displayAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            progress={progressMap.get(achievement.id)}
            showProgress={showProgress}
            layout="list"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {displayAchievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          progress={progressMap.get(achievement.id)}
          showProgress={showProgress}
          layout="grid"
        />
      ))}
    </div>
  );
};

// Компонент для отображения кратких достижений (для профиля)
interface AchievementsSummaryProps {
  achievements: Achievement[];
  totalPoints: number;
  maxDisplay?: number;
}

export const AchievementsSummary: React.FC<AchievementsSummaryProps> = ({
  achievements,
  totalPoints,
  maxDisplay = 3
}) => {
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const displayAchievements = unlockedAchievements.slice(0, maxDisplay);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Достижения</h4>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" size="sm">
            {unlockedAchievements.length}/{achievements.filter(a => !a.isSecret).length}
          </Badge>
          {totalPoints > 0 && (
            <Badge variant="primary" size="sm">
              {totalPoints} очков
            </Badge>
          )}
        </div>
      </div>

      {displayAchievements.length > 0 ? (
        <AchievementsList
          achievements={displayAchievements}
          layout="list"
        />
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          Пока нет достижений
        </p>
      )}

      {unlockedAchievements.length > maxDisplay && (
        <p className="text-xs text-gray-500 text-center">
          и еще {unlockedAchievements.length - maxDisplay} достижений...
        </p>
      )}
    </div>
  );
};