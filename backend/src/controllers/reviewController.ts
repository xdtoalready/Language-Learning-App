// backend/src/controllers/reviewController.ts - ОБНОВЛЕННЫЙ

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { updateUserActivity } from './friendshipController';
import { updateWordAfterReview } from '../utils/spacedRepetition';
import { evaluateInput, generateHint } from '../utils/inputEvaluation';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

// Типы для новых режимов
type ReviewMode = 'RECOGNITION' | 'TRANSLATION_INPUT' | 'REVERSE_INPUT' | 'MIXED';
type ReviewDirection = 'LEARNING_TO_NATIVE' | 'NATIVE_TO_LEARNING';
type SessionType = 'daily' | 'training';

interface CreateSessionRequest {
  mode: ReviewMode;
  sessionType: SessionType;
  filterBy?: {
    tags?: string[];
    masteryLevel?: number[];
    onlyActive?: boolean;
  };
}

interface SessionWord {
  id: string;
  word: string;
  translation: string;
  transcription?: string;
  example?: string;
  tags: string[];
  synonyms: string[];
  masteryLevel: number;
  direction: ReviewDirection;
  isCompleted: boolean;
}

// Хранилище активных сессий (в production лучше использовать Redis)
const activeSessions = new Map<string, {
  sessionId: string;
  userId: string;
  mode: ReviewMode;
  sessionType: SessionType;
  words: SessionWord[];
  currentWordIndex: number;
  currentRound: 1 | 2;
  startTime: Date;
  stats: {
    totalWords: number;
    completed: number;
    correct: number;
    averageRating: number;
    totalTime: number;
  };
}>();

/**
 * Создать новую сессию ревью
 */
export const createReviewSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { mode, sessionType, filterBy }: CreateSessionRequest = req.body;

    // Валидация
    if (!mode || !sessionType) {
      res.status(400).json({ 
        error: 'Mode and sessionType are required' 
      });
      return;
    }

    const validModes: ReviewMode[] = ['RECOGNITION', 'TRANSLATION_INPUT', 'REVERSE_INPUT', 'MIXED'];
    if (!validModes.includes(mode)) {
      res.status(400).json({ 
        error: 'Invalid review mode' 
      });
      return;
    }

    // Формируем запрос для получения слов
    const where: any = { userId };

    if (sessionType === 'daily') {
      // Ежедневные слова: готовые к повторению
      where.masteryLevel = { lt: 5 };
      where.nextReviewDate = { lte: new Date() };
    } else if (sessionType === 'training') {
      // Тренировочные слова: активные (в изучении)
      if (filterBy?.onlyActive) {
        where.masteryLevel = { lt: 5 };
      }
      
      if (filterBy?.tags && filterBy.tags.length > 0) {
        where.tags = { hasSome: filterBy.tags };
      }
      
      if (filterBy?.masteryLevel && filterBy.masteryLevel.length > 0) {
        where.masteryLevel = { in: filterBy.masteryLevel };
      }
    }

    // Получаем слова
    const words = await prisma.word.findMany({
      where,
      orderBy: sessionType === 'daily' 
        ? [{ nextReviewDate: 'asc' }, { createdAt: 'asc' }]
        : [{ createdAt: 'desc' }],
      take: sessionType === 'daily' ? 50 : 20, // ограничиваем количество
      select: {
        id: true,
        word: true,
        translation: true,
        transcription: true,
        example: true,
        tags: true,
        synonyms: true,
        masteryLevel: true
      }
    });

    if (words.length === 0) {
      res.json({
        session: null,
        currentWord: null,
        hasMore: false,
        message: sessionType === 'daily' 
          ? 'No words due for review today' 
          : 'No words found for training'
      });
      return;
    }

    // Создаем сессию
    const sessionId = `session_${userId}_${Date.now()}`;
    
    // Подготавливаем слова для сессии
    let sessionWords: SessionWord[] = [];

    if (mode === 'TRANSLATION_INPUT') {
      // Двураундовая сессия: сначала с изучаемого на родной, потом наоборот
      const round1Words = words.map(word => ({
        ...word,
        direction: 'LEARNING_TO_NATIVE' as ReviewDirection,
        isCompleted: false
      }));
      
      const round2Words = words.map(word => ({
        ...word,
        direction: 'NATIVE_TO_LEARNING' as ReviewDirection,
        isCompleted: false
      }));
      
      sessionWords = [...round1Words, ...round2Words];
    } else if (mode === 'REVERSE_INPUT') {
      // Только обратное направление: с родного на изучаемый
      sessionWords = words.map(word => ({
        ...word,
        direction: 'NATIVE_TO_LEARNING' as ReviewDirection,
        isCompleted: false
      }));
    } else {
      // RECOGNITION или MIXED: стандартное направление
      sessionWords = words.map(word => ({
        ...word,
        direction: 'LEARNING_TO_NATIVE' as ReviewDirection,
        isCompleted: false
      }));
    }

    // Сохраняем сессию
    activeSessions.set(sessionId, {
      sessionId,
      userId,
      mode,
      sessionType,
      words: sessionWords,
      currentWordIndex: 0,
      currentRound: 1,
      startTime: new Date(),
      stats: {
        totalWords: sessionWords.length,
        completed: 0,
        correct: 0,
        averageRating: 0,
        totalTime: 0
      }
    });

    // Возвращаем первое слово
    const currentWord = sessionWords[0];
    
    res.json({
      session: {
        sessionId,
        mode,
        sessionType,
        currentRound: mode === 'TRANSLATION_INPUT' ? (currentWord.direction === 'LEARNING_TO_NATIVE' ? 1 : 2) : 1,
        currentWordIndex: 0,
        totalWords: sessionWords.length,
        startTime: new Date().toISOString()
      },
      currentWord,
      hasMore: sessionWords.length > 1,
      remaining: sessionWords.length - 1
    });

  } catch (error) {
    console.error('Create review session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить текущее слово сессии
 */
export const getCurrentWord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;

    const session = activeSessions.get(sessionId);
    
    if (!session || session.userId !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const currentWord = session.words[session.currentWordIndex];
    
    if (!currentWord) {
      res.json({
        currentWord: null,
        hasMore: false,
        completed: true,
        sessionStats: session.stats
      });
      return;
    }

    res.json({
      currentWord,
      hasMore: session.currentWordIndex < session.words.length - 1,
      remaining: session.words.length - session.currentWordIndex - 1,
      sessionInfo: {
        sessionId,
        mode: session.mode,
        currentRound: session.currentRound,
        totalWords: session.words.length
      }
    });

  } catch (error) {
    console.error('Get current word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Отправить ревью (новая версия с поддержкой всех режимов)
 */
export const submitReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { 
      sessionId,
      wordId, 
      rating, 
      userInput, 
      hintsUsed = 0,
      timeSpent = 0,
      reviewMode = 'RECOGNITION',
      direction = 'LEARNING_TO_NATIVE'
    } = req.body;

    // Валидация
    if (!wordId) {
      res.status(400).json({ 
        error: 'wordId is required' 
      });
      return;
    }

    // Получаем сессию
    const session = activeSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Получаем слово
    const word = await prisma.word.findFirst({
      where: { id: wordId, userId }
    });

    if (!word) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    let finalRating = rating;
    let autoEvaluated = false;

    // Для режимов ввода автоматически оцениваем ответ
    if ((reviewMode === 'TRANSLATION_INPUT' || reviewMode === 'REVERSE_INPUT') && userInput !== undefined) {
      const correctAnswer = direction === 'LEARNING_TO_NATIVE' 
        ? word.translation 
        : word.word;
      
      const evaluation = evaluateInput(
        userInput,
        correctAnswer,
        word.synonyms || [],
        hintsUsed
      );
      
      finalRating = evaluation.score;
      autoEvaluated = true;
    }

    // Валидация рейтинга
    if (!finalRating || finalRating < 1 || finalRating > 4) {
      res.status(400).json({ 
        error: 'Rating must be between 1 and 4' 
      });
      return;
    }

    // Обновляем слово в базе данных только для ежедневных сессий
    if (session.sessionType === 'daily') {
      // Рассчитываем новые параметры через алгоритм интервального повторения
      const updatedParams = updateWordAfterReview({
        wordId,
        rating: finalRating,
        currentMasteryLevel: word.masteryLevel,
        lastReviewDate: word.lastReviewDate || new Date()
      });

      // Обновляем в транзакции
      await prisma.$transaction(async (tx) => {
        // Создаем запись о ревью
        await tx.review.create({
          data: {
            rating: finalRating,
            reviewMode,
            direction,
            userInput,
            hintsUsed,
            timeSpent,
            wordId,
            userId
          }
        });

        // Обновляем параметры слова
        await tx.word.update({
          where: { id: wordId },
          data: {
            masteryLevel: updatedParams.masteryLevel,
            currentInterval: updatedParams.currentInterval,
            lastReviewDate: new Date(),
            nextReviewDate: updatedParams.nextReviewDate,
            // Обновляем историю ввода для режимов ввода
            ...(userInput !== undefined && {
              inputHistory: {
                correct: word.inputHistory ? 
                  (word.inputHistory as any).correct + (finalRating >= 3 ? 1 : 0) : 
                  (finalRating >= 3 ? 1 : 0),
                attempts: word.inputHistory ? 
                  (word.inputHistory as any).attempts + 1 : 
                  1,
                lastScore: finalRating,
                averageTime: word.inputHistory ?
                  (((word.inputHistory as any).averageTime || 0) + timeSpent) / 2 :
                  timeSpent
              }
            })
          }
        });
      });

      // Обновляем активность пользователя
      await updateUserActivity(userId);
    } else {
      // Для тренировочных сессий просто записываем ревью без изменения алгоритма
      await prisma.review.create({
        data: {
          rating: finalRating,
          reviewMode,
          direction,
          userInput,
          hintsUsed,
          timeSpent,
          wordId,
          userId
        }
      });
    }

    // Обновляем сессию
    session.stats.completed++;
    session.stats.correct += finalRating >= 3 ? 1 : 0;
    session.stats.averageRating = 
      (session.stats.averageRating * (session.stats.completed - 1) + finalRating) / session.stats.completed;
    session.stats.totalTime += timeSpent;

    // Отмечаем текущее слово как завершенное
    if (session.currentWordIndex < session.words.length) {
      session.words[session.currentWordIndex].isCompleted = true;
    }

    // Переходим к следующему слову
    session.currentWordIndex++;

    // Проверяем, нужно ли переключить раунд для двураундовых режимов
    if (session.mode === 'TRANSLATION_INPUT') {
      const halfPoint = session.words.length / 2;
      if (session.currentWordIndex === halfPoint) {
        session.currentRound = 2;
      }
    }

    // Получаем следующее слово
    const nextWord = session.currentWordIndex < session.words.length 
      ? session.words[session.currentWordIndex] 
      : null;

    const hasMore = nextWord !== null;

    // Если сессия завершена, удаляем её
    if (!hasMore) {
      activeSessions.delete(sessionId);
    }

    res.json({
      success: true,
      evaluation: autoEvaluated ? {
        score: finalRating,
        autoEvaluated: true,
        userInput,
        correctAnswer: direction === 'LEARNING_TO_NATIVE' ? word.translation : word.word
      } : undefined,
      nextWord,
      hasMore,
      remaining: hasMore ? session.words.length - session.currentWordIndex : 0,
      sessionStats: session.stats,
      completed: !hasMore
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить подсказку для слова
 */
export const getHint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { wordId, hintType, currentHintsUsed = 0 } = req.body;

    if (!wordId || !hintType) {
      res.status(400).json({ 
        error: 'wordId and hintType are required' 
      });
      return;
    }

    const word = await prisma.word.findFirst({
      where: { id: wordId, userId }
    });

    if (!word) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    // Определяем, для какого направления нужна подсказка
    const { direction = 'LEARNING_TO_NATIVE' } = req.body;
    const targetText = direction === 'LEARNING_TO_NATIVE' ? word.translation : word.word;

    const hint = generateHint(targetText, hintType, currentHintsUsed);

    res.json({
      hint: {
        type: hintType,
        content: hint.content,
        used: true
      },
      penaltyApplied: hint.penalty,
      maxScoreNow: hint.penalty ? 2 : 4
    });

  } catch (error) {
    console.error('Get hint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить слова для тренировочного полигона
 */
export const getTrainingWords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { tags, masteryLevel, limit = 20 } = req.query;

    const where: any = { 
      userId,
      masteryLevel: { lt: 5 } // только активные слова
    };

    if (tags) {
      const tagArray = (tags as string).split(',');
      where.tags = { hasSome: tagArray };
    }

    if (masteryLevel) {
      const levels = (masteryLevel as string).split(',').map(Number);
      where.masteryLevel = { in: levels };
    }

    const words = await prisma.word.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        word: true,
        translation: true,
        transcription: true,
        example: true,
        tags: true,
        synonyms: true,
        masteryLevel: true,
        inputHistory: true
      }
    });

    // Группируем по тегам для статистики
    const byTags: Record<string, number> = {};
    words.forEach(word => {
      word.tags.forEach(tag => {
        byTags[tag] = (byTags[tag] || 0) + 1;
      });
    });

    res.json({
      words,
      count: words.length,
      byTags
    });

  } catch (error) {
    console.error('Get training words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Завершить сессию (принудительно)
 */
export const endSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;

    const session = activeSessions.get(sessionId);
    
    if (!session || session.userId !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Удаляем сессию
    activeSessions.delete(sessionId);

    res.json({
      success: true,
      sessionStats: session.stats,
      message: 'Session ended successfully'
    });

  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// LEGACY: Старый метод для обратной совместимости
export const startReviewSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    
    // Получаем случайное слово для повторения (старая логика)
    const words = await prisma.word.findMany({
      where: { 
        userId,
        masteryLevel: { lt: 5 },
        nextReviewDate: { lte: new Date() }
      },
      take: 1,
      orderBy: [
        { nextReviewDate: 'asc' },
        { createdAt: 'asc' }
      ]
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