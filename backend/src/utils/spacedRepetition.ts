// backend/src/utils/spacedRepetition.ts

/**
 * Алгоритм интервального повторения
 * Основан на фиксированных интервалах с адаптацией к прогрессу пользователя
 * ОБНОВЛЕН для поддержки новых режимов тренировки
 */

// Фиксированные интервалы повторения (в днях) в зависимости от mastery_level
const MASTERY_INTERVALS: Record<number, number> = {
  0: 1,   // новое слово
  1: 6,   // первый уровень
  2: 12,  // второй уровень
  3: 24,  // третий уровень
  4: 48,  // четвертый уровень
  5: -1   // выучено (исключается из повторений)
};

export interface WordReview {
  wordId: string;
  rating: number; // 1-4
  currentMasteryLevel: number;
  lastReviewDate: Date;
}

export interface UpdatedWordData {
  masteryLevel: number;
  currentInterval: number;
  nextReviewDate: Date;
}

// Новые интерфейсы для статистики ввода
export interface InputHistory {
  correct: number;    // Количество правильных ответов
  attempts: number;   // Общее количество попыток
  lastScore: number;  // Последняя оценка (1-4)
  averageTime?: number; // Среднее время ответа в секундах
}

export interface WordProgressStats {
  total: number;
  mastered: number;
  dueToday: number;
  active: number; // слова в изучении (masteryLevel < 5)
  byMasteryLevel: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  byInputAccuracy?: { // статистика ввода
    excellent: number; // 90%+ правильных
    good: number;      // 70-89%
    needs_practice: number; // <70%
  };
}

/**
 * Обновляет параметры слова после ревью
 * @param review Данные о ревью слова
 * @returns Обновленные параметры слова
 */
export function updateWordAfterReview(review: WordReview): UpdatedWordData {
  const { rating, currentMasteryLevel } = review;
  let newMasteryLevel = currentMasteryLevel;
  
  // Логика изменения mastery_level согласно ТЗ
  switch (rating) {
    case 1: // Забыл/Не знаю
      newMasteryLevel = 0;
      break;
      
    case 2: // Вспомнил с трудом
      // mastery_level остается прежним
      break;
      
    case 3: // Хорошо
      newMasteryLevel = Math.min(currentMasteryLevel + 1, 4);
      break;
      
    case 4: // Отлично
      newMasteryLevel = Math.min(currentMasteryLevel + 2, 5);
      break;
      
    default:
      throw new Error(`Invalid rating: ${rating}. Must be between 1 and 4.`);
  }
  
  // Получаем новый интервал
  const newInterval = MASTERY_INTERVALS[newMasteryLevel];
  if (newInterval === undefined) {
    throw new Error(`Invalid mastery level: ${newMasteryLevel}`);
  }
  
  // Вычисляем дату следующего повторения
  const nextReviewDate = new Date();
  if (newInterval > 0) {
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  }
  
  return {
    masteryLevel: newMasteryLevel,
    currentInterval: newInterval > 0 ? newInterval : 0,
    nextReviewDate
  };
}

/**
 * Создает параметры для нового слова
 * @returns Параметры для нового слова
 */
export function createNewWordParams(): {
  masteryLevel: number;
  currentInterval: number;
  lastReviewDate: Date;
  nextReviewDate: Date;
} {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    masteryLevel: 0,
    currentInterval: 1,
    lastReviewDate: now,
    nextReviewDate: tomorrow
  };
}

/**
 * Проверяет, готово ли слово к повторению
 * @param word Слово с датами повторения
 * @returns true если слово готово к повторению
 */
export function isWordDueForReview(word: {
  nextReviewDate: Date;
  masteryLevel: number;
}): boolean {
  if (word.masteryLevel >= 5) {
    return false; // выученные слова не повторяются
  }
  
  const now = new Date();
  return word.nextReviewDate <= now;
}

/**
 * НОВАЯ ФУНКЦИЯ: Получает статистику прогресса слов
 */
export function getProgressStats(words: Array<{
  masteryLevel: number;
  nextReviewDate: Date;
  inputHistory?: any;
}>): WordProgressStats {
  const stats: WordProgressStats = {
    total: words.length,
    mastered: 0,
    dueToday: 0,
    active: 0,
    byMasteryLevel: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    byInputAccuracy: { excellent: 0, good: 0, needs_practice: 0 }
  };
  
  const today = new Date();
  today.setHours(23, 59, 59, 999); // конец дня
  
  words.forEach(word => {
    // Подсчет по уровням мастерства
    stats.byMasteryLevel[word.masteryLevel as keyof typeof stats.byMasteryLevel]++;
    
    // Подсчет выученных слов
    if (word.masteryLevel >= 5) {
      stats.mastered++;
    } else {
      stats.active++;
      
      // Подсчет слов к повторению сегодня
      if (word.nextReviewDate <= today) {
        stats.dueToday++;
      }
    }
    
    // НОВОЕ: Статистика точности ввода
    if (word.inputHistory) {
      const history = word.inputHistory as InputHistory;
      if (history.attempts > 0) {
        const accuracy = history.correct / history.attempts;
        if (accuracy >= 0.9) {
          stats.byInputAccuracy!.excellent++;
        } else if (accuracy >= 0.7) {
          stats.byInputAccuracy!.good++;
        } else {
          stats.byInputAccuracy!.needs_practice++;
        }
      }
    }
  });
  
  return stats;
}

/**
 * НОВАЯ ФУНКЦИЯ: Получает слова готовые к повторению
 */
export function getDueWords(words: Array<{
  id: string;
  nextReviewDate: Date;
  masteryLevel: number;
}>): typeof words {
  const now = new Date();
  
  return words
    .filter(word => word.masteryLevel < 5 && word.nextReviewDate <= now)
    .sort((a, b) => {
      // Сортируем по дате повторения (сначала самые "просроченные")
      return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
    });
}

/**
 * НОВАЯ ФУНКЦИЯ: Получает активные слова для тренировочного полигона
 */
export function getActiveWords(words: Array<{
  id: string;
  masteryLevel: number;
  createdAt: Date;
  tags: string[];
}>): typeof words {
  return words
    .filter(word => word.masteryLevel < 5)
    .sort((a, b) => {
      // Сортируем по дате создания (сначала новые)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

/**
 * НОВАЯ ФУНКЦИЯ: Фильтрует слова по тегам и уровню мастерства
 */
export function filterWords(
  words: Array<{
    id: string;
    tags: string[];
    masteryLevel: number;
  }>,
  filters: {
    tags?: string[];
    masteryLevels?: number[];
    onlyActive?: boolean;
  }
): typeof words {
  return words.filter(word => {
    // Фильтр по тегам
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => word.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    // Фильтр по уровню мастерства
    if (filters.masteryLevels && filters.masteryLevels.length > 0) {
      if (!filters.masteryLevels.includes(word.masteryLevel)) return false;
    }
    
    // Фильтр только активные слова
    if (filters.onlyActive && word.masteryLevel >= 5) {
      return false;
    }
    
    return true;
  });
}

/**
 * НОВАЯ ФУНКЦИЯ: Рассчитывает рекомендуемое время тренировки
 */
export function calculateRecommendedStudyTime(
  dueWordsCount: number,
  averageTimePerWord: number = 30 // секунд
): {
  totalMinutes: number;
  estimatedWords: number;
  recommendation: 'light' | 'normal' | 'heavy';
} {
  const totalSeconds = dueWordsCount * averageTimePerWord;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  
  let recommendation: 'light' | 'normal' | 'heavy';
  if (dueWordsCount <= 10) {
    recommendation = 'light';
  } else if (dueWordsCount <= 30) {
    recommendation = 'normal';
  } else {
    recommendation = 'heavy';
  }
  
  return {
    totalMinutes,
    estimatedWords: dueWordsCount,
    recommendation
  };
}

/**
 * НОВАЯ ФУНКЦИЯ: Получает статистику сессии ревью
 */
export function calculateSessionStats(reviews: Array<{
  rating: number;
  timeSpent: number;
  reviewMode: string;
}>): {
  totalReviews: number;
  averageRating: number;
  totalTime: number;
  successRate: number; // процент оценок >= 3
  modeBreakdown: Record<string, number>;
} {
  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      totalTime: 0,
      successRate: 0,
      modeBreakdown: {}
    };
  }
  
  const totalReviews = reviews.length;
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / totalReviews;
  const totalTime = reviews.reduce((sum, review) => sum + review.timeSpent, 0);
  const successfulReviews = reviews.filter(review => review.rating >= 3).length;
  const successRate = (successfulReviews / totalReviews) * 100;
  
  // Подсчет по режимам
  const modeBreakdown: Record<string, number> = {};
  reviews.forEach(review => {
    modeBreakdown[review.reviewMode] = (modeBreakdown[review.reviewMode] || 0) + 1;
  });
  
  return {
    totalReviews,
    averageRating: Math.round(averageRating * 100) / 100,
    totalTime,
    successRate: Math.round(successRate * 100) / 100,
    modeBreakdown
  };
}

/**
 * НОВАЯ ФУНКЦИЯ: Анализирует эффективность изучения слова
 */
export function analyzeWordEfficiency(word: {
  masteryLevel: number;
  inputHistory?: InputHistory;
  reviews: Array<{ rating: number; createdAt: Date; }>;
}): {
  efficiency: 'excellent' | 'good' | 'average' | 'poor';
  recommendations: string[];
  daysToMastery?: number;
} {
  const recommendations: string[] = [];
  let efficiency: 'excellent' | 'good' | 'average' | 'poor' = 'average';
  
  // Анализ истории ревью
  const recentReviews = word.reviews
    .filter(review => {
      const daysDiff = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30; // последние 30 дней
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  if (recentReviews.length === 0) {
    return { efficiency: 'average', recommendations: ['Недостаточно данных для анализа'] };
  }
  
  // Анализ тренда оценок
  const averageRating = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
  const lastThreeRatings = recentReviews.slice(0, 3).map(r => r.rating);
  const isImproving = lastThreeRatings.length >= 2 && 
    lastThreeRatings[0] > lastThreeRatings[lastThreeRatings.length - 1];
  
  // Анализ точности ввода
  let inputAccuracy = 0;
  if (word.inputHistory && word.inputHistory.attempts > 0) {
    inputAccuracy = word.inputHistory.correct / word.inputHistory.attempts;
  }
  
  // Определяем эффективность
  if (averageRating >= 3.5 && inputAccuracy >= 0.9) {
    efficiency = 'excellent';
  } else if (averageRating >= 3 && inputAccuracy >= 0.7) {
    efficiency = 'good';
  } else if (averageRating >= 2.5) {
    efficiency = 'average';
  } else {
    efficiency = 'poor';
  }
  
  // Рекомендации
  if (efficiency === 'poor') {
    recommendations.push('Это слово дается с трудом. Попробуйте больше тренироваться в режиме ввода.');
    recommendations.push('Обратите внимание на примеры использования и контекст.');
  } else if (efficiency === 'average') {
    recommendations.push('Неплохой прогресс! Продолжайте регулярные повторения.');
    if (inputAccuracy < 0.7) {
      recommendations.push('Стоит поработать над точностью написания.');
    }
  } else if (efficiency === 'good') {
    recommendations.push('Отличный прогресс! Скоро слово будет полностью выучено.');
  } else {
    recommendations.push('Превосходно! Вы отлично знаете это слово.');
  }
  
  // Оценка времени до мастерства
  let daysToMastery: number | undefined;
  if (word.masteryLevel < 5) {
    const levelsLeft = 5 - word.masteryLevel;
    const improvementRate = isImproving ? 1.2 : 1;
    daysToMastery = Math.ceil((levelsLeft * 7) / improvementRate); // примерная оценка
  }
  
  return {
    efficiency,
    recommendations,
    daysToMastery
  };
}