// backend/src/utils/achievements.ts
import { User } from '@prisma/client';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'streak' | 'words' | 'reviews' | 'special';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'streak' | 'totalWords' | 'totalReviews' | 'perfectDays' | 'consecutive' | 'special';
    value: number;
    condition?: string;
  };
  reward?: {
    points: number;
    badge: string;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Стрики
  {
    id: 'first_step',
    name: 'Первые шаги',
    description: 'Изучить первое слово',
    icon: '🌱',
    type: 'words',
    difficulty: 'bronze',
    requirement: { type: 'totalWords', value: 1 },
    reward: { points: 10, badge: 'beginner' }
  },
  {
    id: 'week_streak',
    name: 'Неделя подряд',
    description: 'Изучать 7 дней подряд',
    icon: '🔥',
    type: 'streak',
    difficulty: 'bronze',
    requirement: { type: 'streak', value: 7 },
    reward: { points: 50, badge: 'consistent' }
  },
  {
    id: 'month_streak',
    name: 'Месяц подряд',
    description: 'Изучать 30 дней подряд',
    icon: '🔥',
    type: 'streak',
    difficulty: 'silver',
    requirement: { type: 'streak', value: 30 },
    reward: { points: 200, badge: 'dedicated' }
  },
  {
    id: 'hundred_days',
    name: 'Сто дней',
    description: 'Изучать 100 дней подряд',
    icon: '🔥',
    type: 'streak',
    difficulty: 'gold',
    requirement: { type: 'streak', value: 100 },
    reward: { points: 500, badge: 'champion' }
  },
  
  // Количество слов
  {
    id: 'ten_words',
    name: 'Десятка',
    description: 'Изучить 10 слов',
    icon: '📚',
    type: 'words',
    difficulty: 'bronze',
    requirement: { type: 'totalWords', value: 10 },
    reward: { points: 25, badge: 'student' }
  },
  {
    id: 'fifty_words',
    name: 'Полтинник',
    description: 'Изучить 50 слов',
    icon: '📖',
    type: 'words',
    difficulty: 'bronze',
    requirement: { type: 'totalWords', value: 50 },
    reward: { points: 75, badge: 'learner' }
  },
  {
    id: 'hundred_words',
    name: 'Знаток слов',
    description: 'Изучить 100 слов',
    icon: '🏆',
    type: 'words',
    difficulty: 'silver',
    requirement: { type: 'totalWords', value: 100 },
    reward: { points: 150, badge: 'scholar' }
  },
  {
    id: 'five_hundred_words',
    name: 'Эрудит',
    description: 'Изучить 500 слов',
    icon: '🎓',
    type: 'words',
    difficulty: 'gold',
    requirement: { type: 'totalWords', value: 500 },
    reward: { points: 400, badge: 'expert' }
  },
  {
    id: 'thousand_words',
    name: 'Мастер слов',
    description: 'Изучить 1000 слов',
    icon: '👑',
    type: 'words',
    difficulty: 'platinum',
    requirement: { type: 'totalWords', value: 1000 },
    reward: { points: 1000, badge: 'master' }
  },
  
  // Повторения
  {
    id: 'hundred_reviews',
    name: 'Сто повторений',
    description: 'Сделать 100 повторений',
    icon: '💪',
    type: 'reviews',
    difficulty: 'bronze',
    requirement: { type: 'totalReviews', value: 100 },
    reward: { points: 50, badge: 'practitioner' }
  },
  {
    id: 'thousand_reviews',
    name: 'Тысяча повторений',
    description: 'Сделать 1000 повторений',
    icon: '🚀',
    type: 'reviews',
    difficulty: 'silver',
    requirement: { type: 'totalReviews', value: 1000 },
    reward: { points: 200, badge: 'veteran' }
  },
  
  // Специальные достижения
  {
    id: 'perfect_week',
    name: 'Идеальная неделя',
    description: 'Выполнить дневную цель 7 дней подряд',
    icon: '⭐',
    type: 'special',
    difficulty: 'silver',
    requirement: { type: 'perfectDays', value: 7 },
    reward: { points: 100, badge: 'perfectionist' }
  },
  {
    id: 'early_bird',
    name: 'Ранняя пташка',
    description: 'Изучать слова до 8 утра 5 дней подряд',
    icon: '🌅',
    type: 'special',
    difficulty: 'gold',
    requirement: { type: 'special', value: 5, condition: 'early_morning' },
    reward: { points: 150, badge: 'early_bird' }
  },
  {
    id: 'night_owl',
    name: 'Сова',
    description: 'Изучать слова после 22:00 в течение 5 дней',
    icon: '🌙',
    type: 'special',
    difficulty: 'gold',
    requirement: { type: 'special', value: 5, condition: 'late_night' },
    reward: { points: 150, badge: 'night_owl' }
  }
];

export interface UserAchievement {
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

export const checkAchievements = (
  user: User & { 
    totalReviews?: number; 
    perfectDays?: number; 
    earlyMorningDays?: number; 
    lateNightDays?: number; 
  }
): UserAchievement[] => {
  return ACHIEVEMENTS.map(achievement => {
    let progress = 0;
    let achieved = false;
    
    switch (achievement.requirement.type) {
      case 'streak':
        progress = user.currentStreak;
        achieved = user.currentStreak >= achievement.requirement.value;
        break;
        
      case 'totalWords':
        progress = user.totalWordsLearned;
        achieved = user.totalWordsLearned >= achievement.requirement.value;
        break;
        
      case 'totalReviews':
        progress = user.totalReviews || 0;
        achieved = (user.totalReviews || 0) >= achievement.requirement.value;
        break;
        
      case 'perfectDays':
        progress = user.perfectDays || 0;
        achieved = (user.perfectDays || 0) >= achievement.requirement.value;
        break;
        
      case 'special':
        switch (achievement.requirement.condition) {
          case 'early_morning':
            progress = user.earlyMorningDays || 0;
            achieved = (user.earlyMorningDays || 0) >= achievement.requirement.value;
            break;
          case 'late_night':
            progress = user.lateNightDays || 0;
            achieved = (user.lateNightDays || 0) >= achievement.requirement.value;
            break;
          default:
            progress = 0;
            achieved = false;
        }
        break;
    }
    
    return {
      ...achievement,
      achieved,
      progress,
      maxProgress: achievement.requirement.value,
      achievedAt: achieved ? new Date() : undefined
    };
  });
};

export const getAchievementsByType = (achievements: UserAchievement[], type: string) => {
  return achievements.filter(achievement => achievement.type === type);
};

export const getCompletedAchievements = (achievements: UserAchievement[]) => {
  return achievements.filter(achievement => achievement.achieved);
};

export const getAchievementProgress = (achievements: UserAchievement[]) => {
  const completed = getCompletedAchievements(achievements);
  return {
    completed: completed.length,
    total: achievements.length,
    percentage: Math.round((completed.length / achievements.length) * 100)
  };
};

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#C0C0C0';
    case 'gold': return '#FFD700';
    case 'platinum': return '#E5E4E2';
    default: return '#6B7280';
  }
};

export const getDifficultyBadgeVariant = (difficulty: string) => {
  switch (difficulty) {
    case 'bronze': return 'warning';
    case 'silver': return 'secondary';
    case 'gold': return 'success';
    case 'platinum': return 'primary';
    default: return 'secondary';
  }
};