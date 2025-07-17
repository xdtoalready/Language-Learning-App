// backend/src/controllers/statsController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getProgressStats } from '../utils/spacedRepetition';
import { checkAchievements, getAchievementProgress } from '../utils/achievements';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Получить общую статистику пользователя с достижениями
 */
export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Получаем пользователя с основными метриками
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        dailyGoal: true,
        joinDate: true,
        lastActiveDate: true,
        _count: {
          select: {
            words: true,
            reviews: true,
            friends: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Получаем все слова для анализа прогресса
    const words = await prisma.word.findMany({
      where: { userId },
      select: {
        masteryLevel: true,
        nextReviewDate: true,
        createdAt: true
      }
    });

    // Получаем статистику прогресса через утилиту
    const progressStats = getProgressStats(words);

    // Получаем ревью за последние 30 дней для анализа активности
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const recentReviews = await prisma.review.findMany({
      where: {
        userId,
        createdAt: { gte: monthAgo }
      },
      select: {
        rating: true,
        createdAt: true
      }
    });

    // Рассчитываем общее количество ревью
    const totalReviews = user._count.reviews;

    // Анализируем активность по дням недели (последние 7 дней)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyReviews = recentReviews.filter(review => review.createdAt >= weekAgo);
    
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayReviews = weeklyReviews.filter(review => 
        review.createdAt.toISOString().split('T')[0] === dateKey
      );

      return {
        date: dateKey,
        reviews: dayReviews.length,
        averageRating: dayReviews.length > 0 
          ? Number((dayReviews.reduce((sum, r) => sum + r.rating, 0) / dayReviews.length).toFixed(1))
          : 0
      };
    }).reverse();

    // Рассчитываем прогресс к дневной цели
    const today = new Date().toISOString().split('T')[0];
    const todayReviews = recentReviews.filter(review => 
      review.createdAt.toISOString().split('T')[0] === today
    );

    const dailyProgress = {
      completed: todayReviews.length,
      goal: user.dailyGoal,
      percentage: Math.min(100, Math.round((todayReviews.length / user.dailyGoal) * 100))
    };

    // Рассчитываем количество идеальных дней (выполнена дневная цель)
    const perfectDays = calculatePerfectDays(recentReviews, user.dailyGoal);

    // Рассчитываем статистику изучения времени (для специальных достижений)
    const timeStats = calculateTimeStats(recentReviews);

    // Рассчитываем общую статистику изучения
    const learningStats = {
      wordsInProgress: progressStats.total - progressStats.mastered,
      wordsMastered: progressStats.mastered,
      wordsToday: progressStats.dueToday,
      totalWords: progressStats.total,
      masteryDistribution: progressStats.byMasteryLevel
    };

    // Создаем расширенный объект пользователя для проверки достижений
    const userWithStats = {
      ...user,
      totalReviews,
      perfectDays,
      earlyMorningDays: timeStats.earlyMorningDays,
      lateNightDays: timeStats.lateNightDays
    };

    // Проверяем достижения
    const achievements = checkAchievements(userWithStats);
    const achievementProgress = getAchievementProgress(achievements);

    // Рассчитываем средний рейтинг за неделю
    const weeklyAverageRating = weeklyReviews.length > 0
      ? Number((weeklyReviews.reduce((sum, r) => sum + r.rating, 0) / weeklyReviews.length).toFixed(1))
      : 0;

    res.json({
      stats: {
        user: {
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          totalWordsLearned: user.totalWordsLearned,
          joinDate: user.joinDate,
          lastActiveDate: user.lastActiveDate,
          memberFor: Math.floor((Date.now() - user.joinDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        dailyProgress,
        learningStats,
        weeklyProgress: weeklyActivity,
        weeklyAverageRating,
        achievements,
        achievementProgress,
        totals: {
          words: user._count.words,
          reviews: user._count.reviews,
          friends: user._count.friends
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить только достижения пользователя
 */
export const getUserAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalWordsLearned: true,
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Получаем ревью за последние 30 дней
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const recentReviews = await prisma.review.findMany({
      where: {
        userId,
        createdAt: { gte: monthAgo }
      },
      select: {
        rating: true,
        createdAt: true
      }
    });

    const perfectDays = calculatePerfectDays(recentReviews, user.dailyGoal || 10);
    const timeStats = calculateTimeStats(recentReviews);

    const userWithStats = {
      ...user,
      totalReviews: user._count.reviews,
      perfectDays,
      earlyMorningDays: timeStats.earlyMorningDays,
      lateNightDays: timeStats.lateNightDays
    };

    const achievements = checkAchievements(userWithStats);
    const achievementProgress = getAchievementProgress(achievements);

    res.json({
      achievements,
      progress: achievementProgress
    });

  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Обновить дневную цель пользователя
 */
export const updateDailyGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { dailyGoal } = req.body;

    if (!dailyGoal || dailyGoal < 1 || dailyGoal > 100) {
      res.status(400).json({ 
        error: 'Daily goal must be between 1 and 100' 
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { dailyGoal: parseInt(dailyGoal) }
    });

    res.json({ 
      message: 'Daily goal updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update daily goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить топ слов по сложности
 */
export const getDifficultWords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { limit = '10' } = req.query;

    const difficultWords = await prisma.word.findMany({
      where: { 
        userId,
        masteryLevel: { lt: 5 }
      },
      include: {
        reviews: {
          select: { rating: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    const wordsWithDifficulty = difficultWords.map(word => {
      const reviews = word.reviews;
      if (reviews.length === 0) return { ...word, difficulty: 0, reviewCount: 0 };

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const difficulty = 5 - avgRating;

      return {
        id: word.id,
        word: word.word,
        translation: word.translation,
        masteryLevel: word.masteryLevel,
        reviewCount: reviews.length,
        averageRating: Number(avgRating.toFixed(1)),
        difficulty: Number(difficulty.toFixed(1))
      };
    })
    .filter(word => word.reviewCount > 0)
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, parseInt(limit as string));

    res.json({ difficultWords });

  } catch (error) {
    console.error('Get difficult words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Утилиты для расчета дополнительных метрик

/**
 * Рассчитывает количество дней, когда была выполнена дневная цель
 */
function calculatePerfectDays(reviews: any[], dailyGoal: number): number {
  const reviewsByDay = reviews.reduce((acc, review) => {
    const day = review.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.values(reviewsByDay).filter(count => count >= dailyGoal).length;
}

/**
 * Рассчитывает статистику времени изучения
 */
function calculateTimeStats(reviews: any[]): { earlyMorningDays: number; lateNightDays: number } {
  const activityByDay = reviews.reduce((acc, review) => {
    const date = new Date(review.createdAt);
    const day = date.toISOString().split('T')[0];
    const hour = date.getHours();
    
    if (!acc[day]) {
      acc[day] = { earlyMorning: false, lateNight: false };
    }
    
    if (hour < 8) {
      acc[day].earlyMorning = true;
    }
    
    if (hour >= 22) {
      acc[day].lateNight = true;
    }
    
    return acc;
  }, {} as Record<string, { earlyMorning: boolean; lateNight: boolean }>);

  return {
    earlyMorningDays: Object.values(activityByDay).filter(day => day.earlyMorning).length,
    lateNightDays: Object.values(activityByDay).filter(day => day.lateNight).length
  };
}