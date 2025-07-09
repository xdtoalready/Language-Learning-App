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
    limit?: number;
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

    // Валидация входных данных
    if (!mode || !sessionType) {
      res.status(400).json({ error: 'mode and sessionType are required' });
      return;
    }

    console.log(`Creating ${sessionType} session for user ${userId} with mode ${mode}`);

    // Получаем слова в зависимости от типа сессии
    let words: any[];
    
    if (sessionType === 'daily') {
      // Для ежедневных повторений - только слова, готовые к повторению
      words = await prisma.word.findMany({
        where: {
          userId,
          masteryLevel: { lt: 5 }, // не выученные
          nextReviewDate: { lte: new Date() } // готовые к повторению
        },
        orderBy: { nextReviewDate: 'asc' },
        take: 20,
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
    } else {
      // Для тренировочного полигона - активные слова с фильтрацией
      const where: any = {
        userId,
        masteryLevel: { lt: 5 }
      };

      if (filterBy?.tags?.length) {
        where.tags = { hasSome: filterBy.tags };
      }

      if (filterBy?.masteryLevel?.length) {
        where.masteryLevel = { in: filterBy.masteryLevel };
      }

      words = await prisma.word.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filterBy?.limit || 20,
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
    }

    // ✅ ИСПРАВЛЕНИЕ: Правильная обработка пустого списка слов
    if (words.length === 0) {
      console.log(`No words found for ${sessionType} session`);
      
      // ✅ Возвращаем структурированный ответ для пустой сессии
      res.json({
        session: null, // ✅ Явно указываем что сессии нет
        currentWord: null,
        hasMore: false,
        hasMoreWords: false,
        remaining: 0,
        remainingWords: 0,
        completed: true, // ✅ Указываем что "сессия" завершена (т.к. слов нет)
        message: sessionType === 'daily' 
          ? 'No words due for review today' 
          : 'No words found for training'
      });
      return;
    }

    // ✅ Создаем сессию только если есть слова
    const sessionId = `session_${userId}_${Date.now()}`;
    
    // Подготавливаем слова для сессии
    let sessionWords: SessionWord[] = [];

    if (mode === 'TRANSLATION_INPUT') {
      // Двураундовая сессия: сначала с изучаемого на родной, потом наоборот
      const round1Words = words.map(word => ({
        ...word,
        transcription: word.transcription || undefined,
        example: word.example || undefined,
        direction: 'LEARNING_TO_NATIVE' as ReviewDirection,
        isCompleted: false
      }));
      
      const round2Words = words.map(word => ({
        ...word,
        transcription: word.transcription || undefined,
        example: word.example || undefined,
        direction: 'NATIVE_TO_LEARNING' as ReviewDirection,
        isCompleted: false
      }));
      
      sessionWords = [...round1Words, ...round2Words];
    } else if (mode === 'REVERSE_INPUT') {
      // Только обратное направление: с родного на изучаемый
      sessionWords = words.map(word => ({
        ...word,
        transcription: word.transcription || undefined,
        example: word.example || undefined,
        direction: 'NATIVE_TO_LEARNING' as ReviewDirection,
        isCompleted: false
      }));
    } else {
      // RECOGNITION или MIXED: стандартное направление
      sessionWords = words.map(word => ({
        ...word,
        transcription: word.transcription || undefined,
        example: word.example || undefined,
        direction: 'LEARNING_TO_NATIVE' as ReviewDirection,
        isCompleted: false
      }));
    }

    // Убеждаемся что у нас есть слова после обработки
    if (sessionWords.length === 0) {
      res.json({
        session: null,
        currentWord: null,
        hasMore: false,
        hasMoreWords: false,
        remaining: 0,
        remainingWords: 0,
        completed: true,
        message: 'No words available after processing'
      });
      return;
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
    const remainingCount = sessionWords.length - 1; // слов осталось после первого
    const hasMoreWords = sessionWords.length > 1;
    
    // Возвращаем правильную структуру ответа
    res.json({
      session: {
        sessionId,
        mode,
        sessionType,
        totalWords: sessionWords.length,
        currentRound: mode === 'TRANSLATION_INPUT' ?
          (currentWord.direction === 'LEARNING_TO_NATIVE' ? 1 : 2) : 1,
        currentWordIndex: 0,
        startTime: new Date().toISOString()
      },
      currentWord,
      hasMore: hasMoreWords,
      hasMoreWords: hasMoreWords,
      remaining: remainingCount,
      remainingWords: remainingCount,
      completed: false // При создании сессии она НЕ завершена
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
    
    // Правильная обработка завершения сессии
    if (!currentWord || session.currentWordIndex >= session.words.length) {
      // Сессия завершена - возвращаем статистику
      const stats = session.stats;
      
      // Удаляем сессию из памяти при завершении
      activeSessions.delete(sessionId);
      
      res.json({
        currentWord: null,
        hasMore: false,
        hasMoreWords: false,
        remaining: 0,
        remainingWords: 0,
        completed: true,
        sessionStats: stats
      });
      return;
    }

    const hasMoreWords = session.currentWordIndex < session.words.length - 1;
    const remainingCount = session.words.length - session.currentWordIndex - 1;

    res.json({
      currentWord,
      hasMore: hasMoreWords,
      hasMoreWords: hasMoreWords,
      remaining: remainingCount,
      remainingWords: remainingCount,
      completed: false,
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
 * Отправить ревью
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

    const hasMoreWords = nextWord !== null;
    const remainingCount = hasMoreWords ? session.words.length - session.currentWordIndex : 0;

    // Если сессия завершена, удаляем её
    if (!hasMoreWords) {
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
      currentWord: nextWord,
      hasMore: hasMoreWords,
      hasMoreWords: hasMoreWords,
      remaining: remainingCount,
      remainingWords: remainingCount,
      sessionStats: session.stats,
      completed: !hasMoreWords,
      currentRound: session.currentRound
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

    // Получаем финальную статистику
    const finalStats = {
      totalWords: session.stats.totalWords,
      completed: session.stats.completed,
      correct: session.stats.correct,
      averageRating: session.stats.completed > 0 
        ? session.stats.averageRating / session.stats.completed 
        : 0,
      totalTime: session.stats.totalTime,
      sessionType: session.sessionType,
      mode: session.mode
    };

    // Удаляем сессию из памяти
    activeSessions.delete(sessionId);

    console.log(`Session ${sessionId} ended manually by user ${userId}`);

    res.json({
      message: 'Session ended successfully',
      sessionStats: finalStats
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