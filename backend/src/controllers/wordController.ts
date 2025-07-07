import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createNewWordParams, isWordDueForReview, getProgressStats } from '../utils/spacedRepetition';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Получить все слова пользователя с фильтрацией и поиском
 */
export const getWords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { 
      search, 
      tags, 
      masteryLevel,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Подготавливаем фильтры
    const where: any = { userId };

    // Поиск по слову, переводу, транскрипции или примеру
    if (search) {
      where.OR = [
        { word: { contains: search as string, mode: 'insensitive' } },
        { translation: { contains: search as string, mode: 'insensitive' } },
        { transcription: { contains: search as string, mode: 'insensitive' } },
        { example: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Фильтр по тегам
    if (tags) {
      const tagArray = (tags as string).split(',');
      where.tags = {
        hasSome: tagArray
      };
    }

    // Фильтр по уровню мастерства
    if (masteryLevel) {
      where.masteryLevel = parseInt(masteryLevel as string);
    }

    // Пагинация и сортировка
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    // Получаем слова
    const [words, totalCount] = await Promise.all([
      prisma.word.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        select: {
          id: true,
          word: true,
          translation: true,
          transcription: true,
          example: true,
          tags: true,
          masteryLevel: true,
          currentInterval: true,
          lastReviewDate: true,
          nextReviewDate: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.word.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      words,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить слова для повторения сегодня
 */
export const getDueWords = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const today = new Date();

    // Получаем все слова пользователя
    const words = await prisma.word.findMany({
      where: { 
        userId,
        masteryLevel: { lt: 5 } // Исключаем выученные слова
      },
      select: {
        id: true,
        word: true,
        translation: true,
        transcription: true,
        example: true,
        tags: true,
        masteryLevel: true,
        nextReviewDate: true
      }
    });

    // Фильтруем слова, которые нужно повторить сегодня
    const dueWords = words.filter(word => 
      isWordDueForReview({ 
        nextReviewDate: word.nextReviewDate, 
        masteryLevel: word.masteryLevel 
      }, today)
    );

    // Перемешиваем слова для разнообразия
    const shuffledWords = dueWords.sort(() => Math.random() - 0.5);

    res.json({
      words: shuffledWords,
      count: shuffledWords.length,
      date: today.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Get due words error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить одно слово по ID
 */
export const getWordById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const word = await prisma.word.findFirst({
      where: { 
        id, 
        userId 
      }
    });

    if (!word) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    res.json({ word });

  } catch (error) {
    console.error('Get word by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Добавить новое слово
 */
export const createWord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { word, translation, transcription, example, tags } = req.body;

    // Валидация обязательных полей
    if (!word || !translation) {
      res.status(400).json({ 
        error: 'Word and translation are required' 
      });
      return;
    }

    // Проверяем, что такого слова еще нет у пользователя
    const existingWord = await prisma.word.findFirst({
      where: {
        userId,
        word: { equals: word, mode: 'insensitive' }
      }
    });

    if (existingWord) {
      res.status(409).json({ 
        error: 'Word already exists in your vocabulary' 
      });
      return;
    }

    // Создаем параметры для нового слова
    const newWordParams = createNewWordParams();

    // Создаем слово
    const newWord = await prisma.word.create({
      data: {
        word: word.trim(),
        translation: translation.trim(),
        transcription: transcription?.trim() || null,
        example: example?.trim() || null,
        tags: tags || [],
        userId,
        ...newWordParams
      }
    });

    // Обновляем счетчик слов у пользователя
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalWordsLearned: {
          increment: 1
        }
      }
    });

    res.status(201).json({ 
      message: 'Word created successfully',
      word: newWord 
    });

  } catch (error) {
    console.error('Create word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Обновить слово
 */
export const updateWord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { word, translation, transcription, example, tags } = req.body;

    // Проверяем, что слово принадлежит пользователю
    const existingWord = await prisma.word.findFirst({
      where: { id, userId }
    });

    if (!existingWord) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    // Валидация обязательных полей
    if (!word || !translation) {
      res.status(400).json({ 
        error: 'Word and translation are required' 
      });
      return;
    }

    // Обновляем слово
    const updatedWord = await prisma.word.update({
      where: { id },
      data: {
        word: word.trim(),
        translation: translation.trim(),
        transcription: transcription?.trim() || null,
        example: example?.trim() || null,
        tags: tags || []
      }
    });

    res.json({ 
      message: 'Word updated successfully',
      word: updatedWord 
    });

  } catch (error) {
    console.error('Update word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Удалить слово
 */
export const deleteWord = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Проверяем, что слово принадлежит пользователю
    const existingWord = await prisma.word.findFirst({
      where: { id, userId }
    });

    if (!existingWord) {
      res.status(404).json({ error: 'Word not found' });
      return;
    }

    // Удаляем слово (каскадно удалятся связанные записи reviews)
    await prisma.word.delete({
      where: { id }
    });

    // Обновляем счетчик слов у пользователя
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalWordsLearned: {
          decrement: 1
        }
      }
    });

    res.json({ message: 'Word deleted successfully' });

  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Получить статистику слов пользователя
 */
export const getWordsStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Получаем все слова пользователя
    const words = await prisma.word.findMany({
      where: { userId },
      select: {
        masteryLevel: true,
        nextReviewDate: true
      }
    });

    // Получаем статистику через утилиту
    const stats = getProgressStats(words);

    res.json({ stats });

  } catch (error) {
    console.error('Get words stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};