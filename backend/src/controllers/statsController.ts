import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getProgressStats } from '../utils/spacedRepetition';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Получить общую статистику пользователя
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

    // Получаем ревью за последние 7 дней для анализа активности
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentReviews = await prisma.review.findMany({
      where: {
        userId,
        createdAt: { gte: weekAgo }
      },
      select: {
        rating: true,
        createdAt: true
      }
    });

    // Анализируем активность по дням недели
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const dayReviews = recentReviews.filter(review => 
        review.createdAt.toISOString().split('T')[0] === dateKey
      );

      return {
        date: dateKey,
        reviewCount: dayReviews.length,
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

    // Рассчитываем общую статистику изучения
    const learningStats = {
      wordsInProgress: progressStats.total - progressStats.mastered,
      wordsMastered: progressStats.mastered,
      wordsToday: progressStats.dueToday,
      totalWords: progressStats.total,
      masteryDistribution: progressStats.byMasteryLevel
    };

    // Рассчитываем средний рейтинг за неделю
    const weeklyAverageRating = recentReviews.length > 0
      ? Number((recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length).toFixed(1))
      : 0;

    res.json({
      user: {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalWordsLearned: user.totalWordsLearned,
        joinDate: user.joinDate,
        lastActiveDate: user.lastActiveDate,
        memberFor: Math.floor((Date.now() - user.joinDate.getTime()) / (1000 * 60 * 60 * 24)) // дней с регистрации
      },
      dailyProgress,
      learningStats,
      weeklyActivity,
      weeklyAverageRating,
      totals: {
        words: user._count.words,
        reviews: user._count.reviews,
        friends: user._count.friends
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
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
      data: { dailyGoal: parseInt(dailyGoal) },
      select: { dailyGoal: true }
    });

    res.json({ 
      message: 'Daily goal updated successfully',
      dailyGoal: updatedUser.dailyGoal 
    });

  } catch (error) {
    console.error('Update daily goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить топ слов по сложности (наибольшее количество неудачных попыток)
 */
export const getDifficultWords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { limit = '10' } = req.query;

    // Получаем слова с наибольшим количеством плохих оценок
    const difficultWords = await prisma.word.findMany({
      where: { 
        userId,
        masteryLevel: { lt: 5 } // Исключаем выученные
      },
      include: {
        reviews: {
          select: { rating: true },
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 ревью
        }
      }
    });

    // Рассчитываем сложность для каждого слова
    const wordsWithDifficulty = difficultWords.map(word => {
      const reviews = word.reviews;
      if (reviews.length === 0) return { ...word, difficulty: 0 };

      // Рассчитываем средний рейтинг (чем ниже, тем сложнее)
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const difficulty = 5 - avgRating; // Инвертируем: чем ниже рейтинг, тем выше сложность

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
    .filter(word => word.reviewCount > 0) // Только слова с ревью
    .sort((a, b) => b.difficulty - a.difficulty) // Сортируем по сложности
    .slice(0, parseInt(limit as string));

    res.json({ difficultWords });

  } catch (error) {
    console.error('Get difficult words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};