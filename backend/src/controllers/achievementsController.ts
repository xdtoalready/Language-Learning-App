// backend/src/controllers/achievementsController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Предустановленные достижения системы
 */
const SYSTEM_ACHIEVEMENTS = [
  {
    key: 'first_word',
    name: 'Первые шаги',
    description: 'Изучить первое слово',
    icon: 'AcademicCapIcon',
    color: 'green',
    category: 'LEARNING',
    requirement: { type: 'words_learned', value: 1 },
    points: 10
  },
  {
    key: 'week_streak',
    name: 'Неделя подряд',
    description: 'Изучать 7 дней подряд',
    icon: 'FireIcon',
    color: 'orange',
    category: 'STREAK',
    requirement: { type: 'current_streak', value: 7 },
    points: 50
  },
  {
    key: 'words_50',
    name: 'Знание',
    description: 'Изучить 50 слов',
    icon: 'BookOpenIcon',
    color: 'blue',
    category: 'LEARNING',
    requirement: { type: 'words_learned', value: 50 },
    points: 100
  },
  {
    key: 'words_100',
    name: 'Знаток слов',
    description: 'Изучить 100 слов',
    icon: 'TrophyIcon',
    color: 'purple',
    category: 'LEARNING',
    requirement: { type: 'words_learned', value: 100 },
    points: 200
  },
  {
    key: 'words_500',
    name: 'Эрудит',
    description: 'Изучить 500 слов',
    icon: 'StarIcon',
    color: 'yellow',
    category: 'LEARNING',
    requirement: { type: 'words_learned', value: 500 },
    points: 500
  },
  {
    key: 'month_streak',
    name: 'Месяц силы',
    description: 'Изучать 30 дней подряд',
    icon: 'FireIcon',
    color: 'red',
    category: 'STREAK',
    requirement: { type: 'current_streak', value: 30 },
    points: 300
  },
  {
    key: 'perfect_week',
    name: 'Идеальная неделя',
    description: 'Выполнить дневную цель 7 дней подряд',
    icon: 'CheckCircleIcon',
    color: 'green',
    category: 'PROGRESS',
    requirement: { type: 'perfect_week', value: 1 },
    points: 150
  },
  {
    key: 'social_butterfly',
    name: 'Социальная бабочка',
    description: 'Добавить 5 друзей',
    icon: 'HeartIcon',
    color: 'pink',
    category: 'SOCIAL',
    requirement: { type: 'friends_count', value: 5 },
    points: 75
  }
];

/**
 * Инициализация системных достижений (запускается при запуске сервера)
 */
export const initializeAchievements = async (): Promise<void> => {
  try {
    console.log('🏆 Инициализация системных достижений...');
    
    for (const achData of SYSTEM_ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { key: achData.key },
        update: {
          name: achData.name,
          description: achData.description,
          icon: achData.icon,
          color: achData.color,
          requirement: achData.requirement,
          points: achData.points
        },
        create: {
          key: achData.key,
          name: achData.name,
          description: achData.description,
          icon: achData.icon,
          color: achData.color,
          category: achData.category as any,
          requirement: achData.requirement,
          points: achData.points
        }
      });
    }
    
    console.log('✅ Достижения инициализированы');
  } catch (error) {
    console.error('❌ Ошибка инициализации достижений:', error);
  }
};

/**
 * Проверка и присвоение достижений пользователю
 */
export const checkAndAwardAchievements = async (userId: string): Promise<string[]> => {
  try {
    // Получаем статистику пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        totalWordsLearned: true,
        _count: {
          select: {
            friends: true,
            reviews: true
          }
        }
      }
    });

    if (!user) return [];

    // Получаем все системные достижения
    const achievements = await prisma.achievement.findMany();
    
    // Получаем уже полученные достижения пользователя
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true }
    });
    
    const achievedIds = new Set(userAchievements.map(ua => ua.achievementId));
    const newAchievements: string[] = [];

    // Проверяем каждое достижение
    for (const achievement of achievements) {
      if (achievedIds.has(achievement.id)) continue; // уже получено

      const req = achievement.requirement as any;
      let shouldAward = false;

      switch (req.type) {
        case 'words_learned':
          shouldAward = user.totalWordsLearned >= req.value;
          break;
        case 'current_streak':
          shouldAward = user.currentStreak >= req.value;
          break;
        case 'friends_count':
          shouldAward = user._count.friends >= req.value;
          break;
        case 'perfect_week':
          // Это более сложная логика, пока пропустим
          shouldAward = false;
          break;
      }

      if (shouldAward) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id
          }
        });
        newAchievements.push(achievement.key);
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Ошибка проверки достижений:', error);
    return [];
  }
};

/**
 * Получить все достижения пользователя
 */
export const getUserAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Получаем все достижения с информацией о том, получены ли они пользователем
    const achievements = await prisma.achievement.findMany({
      include: {
        userAchievements: {
          where: { userId },
          select: {
            unlockedAt: true,
            progress: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { points: 'asc' }
      ]
    });

    // Проверяем и выдаем новые достижения
    const newAchievements = await checkAndAwardAchievements(userId);

    // Формируем ответ
    const achievementsWithStatus = achievements.map(achievement => ({
      id: achievement.id,
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      color: achievement.color,
      category: achievement.category,
      points: achievement.points,
      isUnlocked: achievement.userAchievements.length > 0,
      unlockedAt: achievement.userAchievements[0]?.unlockedAt || null,
      progress: achievement.userAchievements[0]?.progress || null,
      isSecret: achievement.isSecret && achievement.userAchievements.length === 0
    }));

    res.json({
      achievements: achievementsWithStatus,
      newAchievements,
      totalPoints: achievementsWithStatus
        .filter(a => a.isUnlocked)
        .reduce((sum, a) => sum + a.points, 0)
    });

  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить достижения конкретного пользователя (для профиля друга)
 */
export const getPublicUserAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;

    // Проверяем что пользователь существует
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Получаем только открытые достижения пользователя
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: targetUserId },
      include: {
        achievement: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            icon: true,
            color: true,
            category: true,
            points: true,
            isSecret: true
          }
        }
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    // Фильтруем секретные достижения
    const publicAchievements = userAchievements
      .filter(ua => !ua.achievement.isSecret)
      .map(ua => ({
        id: ua.achievement.id,
        key: ua.achievement.key,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        color: ua.achievement.color,
        category: ua.achievement.category,
        points: ua.achievement.points,
        unlockedAt: ua.unlockedAt
      }));

    const totalPoints = publicAchievements.reduce((sum, a) => sum + a.points, 0);

    res.json({
      user: targetUser,
      achievements: publicAchievements,
      totalPoints,
      totalCount: publicAchievements.length
    });

  } catch (error) {
    console.error('Get public user achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить прогресс к достижениям
 */
export const getAchievementProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Получаем статистику пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        _count: {
          select: {
            friends: true,
            reviews: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Получаем все достижения которые пользователь еще не получил
    const unlockedAchievementIds = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true }
    });

    const unlockedIds = new Set(unlockedAchievementIds.map(ua => ua.achievementId));

    const remainingAchievements = await prisma.achievement.findMany({
      where: {
        id: { notIn: Array.from(unlockedIds) },
        isSecret: false
      }
    });

    // Рассчитываем прогресс к каждому достижению
    const progress = remainingAchievements.map(achievement => {
      const req = achievement.requirement as any;
      let current = 0;
      let max = req.value;

      switch (req.type) {
        case 'words_learned':
          current = user.totalWordsLearned;
          break;
        case 'current_streak':
          current = user.currentStreak;
          break;
        case 'friends_count':
          current = user._count.friends;
          break;
      }

      return {
        achievementId: achievement.id,
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        color: achievement.color,
        current,
        required: max,
        percentage: Math.min(100, Math.round((current / max) * 100))
      };
    });

    res.json({ progress });

  } catch (error) {
    console.error('Get achievement progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};