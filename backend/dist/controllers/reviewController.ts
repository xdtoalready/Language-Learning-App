import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { updateWordProgress } from '../utils/spacedRepetition';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Зафиксировать результат повторения слова
 */
export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { wordId, rating } = req.body;

    // Валидация
    if (!wordId || !rating) {
      res.status(400).json({ 
        error: 'wordId and rating are required' 
      });
      return;
    }

    if (rating < 1 || rating > 4) {
      res.status(400).json({ 
        error: 'Rating must be between 1 and 4' 
      });
      return;
    }

    // Проверяем, что слово принадлежит пользователю
    const word = await prisma.word.findFirst({
      where: { 
        id: wordId, 
        userId 
      }
    });

    if (!word) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    // Рассчитываем новые параметры через алгоритм интервального повторения
    const updatedParams = updateWordProgress(word.masteryLevel, rating);

    // Обновляем слово в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем запись о ревью
      const review = await tx.review.create({
        data: {
          rating,
          wordId,
          userId
        }
      });

      // Обновляем параметры слова
      const updatedWord = await tx.word.update({
        where: { id: wordId },
        data: {
          masteryLevel: updatedParams.masteryLevel,
          currentInterval: updatedParams.currentInterval,
          nextReviewDate: updatedParams.nextReviewDate,
          lastReviewDate: new Date()
        }
      });

      // Обновляем статистику пользователя
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { 
          currentStreak: true, 
          lastActiveDate: true,
          totalWordsLearned: true
        }
      });

      let updateData: any = {};
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const lastActiveString = user?.lastActiveDate?.toISOString().split('T')[0];

      // Обновляем стрик, если это первое повторение сегодня
      if (lastActiveString !== todayString) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        if (lastActiveString === yesterdayString) {
          // Продолжаем стрик
          updateData.currentStreak = (user?.currentStreak || 0) + 1;
        } else {
          // Начинаем новый стрик
          updateData.currentStreak = 1;
        }
        
        updateData.lastActiveDate = today;
        updateData.longestStreak = Math.max(
          updateData.currentStreak, 
          user?.currentStreak || 0
        );
      }

      // Если слово достигло максимального уровня мастерства
      if (updatedParams.masteryLevel >= 5 && word.masteryLevel < 5) {
        updateData.totalWordsLearned = (user?.totalWordsLearned || 0) + 1;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: updateData
        });
      }

      return {
        review,
        updatedWord,
        progressUpdate: {
          masteryLevel: updatedParams.masteryLevel,
          nextReviewDate: updatedParams.nextReviewDate,
          currentInterval: updatedParams.currentInterval,
          isWordMastered: updatedParams.masteryLevel >= 5
        }
      };
    });

    res.json({
      message: 'Review submitted successfully',
      ...result
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить историю ревью для слова
 */
export const getWordReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { wordId } = req.params;

    // Проверяем, что слово принадлежит пользователю
    const word = await prisma.word.findFirst({
      where: { id: wordId, userId }
    });

    if (!word) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    // Получаем историю ревью
    const reviews = await prisma.review.findMany({
      where: { wordId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Последние 50 ревью
    });

    res.json({ reviews });

  } catch (error) {
    console.error('Get word reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить статистику ревью пользователя
 */
export const getReviewStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { days = '30' } = req.query;

    const daysCount = parseInt(days as string);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysCount);

    // Получаем ревью за указанный период
    const reviews = await prisma.review.findMany({
      where: {
        userId,
        createdAt: {
          gte: fromDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Анализируем статистику
    const stats = {
      totalReviews: reviews.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
      reviewsByDay: {} as Record<string, number>,
      successRate: 0 // процент ответов 3-4
    };

    if (reviews.length > 0) {
      // Рассчитываем среднюю оценку
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      stats.averageRating = Number((totalRating / reviews.length).toFixed(2));

      // Распределение по оценкам
      reviews.forEach(review => {
        stats.ratingDistribution[review.rating as keyof typeof stats.ratingDistribution]++;
        
        // Группируем по дням
        const dayKey = review.createdAt.toISOString().split('T')[0];
        stats.reviewsByDay[dayKey] = (stats.reviewsByDay[dayKey] || 0) + 1;
      });

      // Процент успешных ответов (3-4)
      const successfulReviews = stats.ratingDistribution[3] + stats.ratingDistribution[4];
      stats.successRate = Number(((successfulReviews / reviews.length) * 100).toFixed(1));
    }

    res.json({ stats });

  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Начать сессию повторения (получить следующее слово)
 */
export const startReviewSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    
    // Получаем случайное слово для повторения
    const words = await prisma.word.findMany({
      where: { 
        userId,
        masteryLevel: { lt: 5 },
        nextReviewDate: { lte: new Date() }
      },
      take: 1,
      orderBy: { nextReviewDate: 'asc' }
    });

    if (words.length === 0) {
      res.json({ 
        message: 'No words due for review today',
        word: null,
        hasMore: false
      });
      return;
    }

    const word = words[0];

    // Проверяем, есть ли еще слова для повторения
    const remainingCount = await prisma.word.count({
      where: { 
        userId,
        masteryLevel: { lt: 5 },
        nextReviewDate: { lte: new Date() },
        id: { not: word.id }
      }
    });

    res.json({
      word: {
        id: word.id,
        word: word.word,
        translation: word.translation,
        transcription: word.transcription,
        example: word.example,
        tags: word.tags,
        masteryLevel: word.masteryLevel
      },
      hasMore: remainingCount > 0,
      remaining: remainingCount
    });

  } catch (error) {
    console.error('Start review session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};