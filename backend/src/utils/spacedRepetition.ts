/**
 * Алгоритм интервального повторения согласно ТЗ
 * Основан на фиксированных интервалах с адаптацией к прогрессу пользователя
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
      throw new Error(`Invalid rating: ${rating}. Must be 1-4.`);
  }
  
  // Получаем новый интервал
  const newInterval = MASTERY_INTERVALS[newMasteryLevel];
  
  // Вычисляем дату следующего повторения
  const nextReviewDate = new Date();
  if (newInterval > 0) {
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  }
  
  return {
    masteryLevel: newMasteryLevel,
    currentInterval: newInterval,
    nextReviewDate
  };
}

/**
 * Упрощенная версия функции для обратной совместимости
 * @param currentMasteryLevel Текущий уровень мастерства
 * @param rating Оценка (1-4)
 * @returns Обновленные параметры слова
 */
export function updateWordProgress(currentMasteryLevel: number, rating: number): UpdatedWordData {
  return updateWordAfterReview({
    wordId: '', // не используется в алгоритме
    rating,
    currentMasteryLevel,
    lastReviewDate: new Date()
  });
}

/**
 * Проверяет, нужно ли повторять слово сегодня
 * @param word Данные слова
 * @param currentDate Текущая дата (по умолчанию - сегодня)
 * @returns true, если слово нужно повторить
 */
export function isWordDueForReview(
  word: { nextReviewDate: Date; masteryLevel: number },
  currentDate: Date = new Date()
): boolean {
  // Исключаем выученные слова (mastery_level = 5)
  if (word.masteryLevel >= 5) {
    return false;
  }
  
  // Сравниваем только даты (без времени)
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const reviewDate = new Date(
    word.nextReviewDate.getFullYear(),
    word.nextReviewDate.getMonth(),
    word.nextReviewDate.getDate()
  );
  
  return today >= reviewDate;
}

/**
 * Создает параметры для нового слова
 * @returns Начальные параметры для нового слова
 */
export function createNewWordParams(): {
  masteryLevel: number;
  currentInterval: number;
  nextReviewDate: Date;
} {
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + 1); // завтра
  
  return {
    masteryLevel: 0,
    currentInterval: 1,
    nextReviewDate
  };
}

/**
 * Получает статистику прогресса по словам
 * @param words Массив слов пользователя
 * @returns Статистика прогресса
 */
export function getProgressStats(words: Array<{ masteryLevel: number; nextReviewDate: Date }>) {
  const today = new Date();
  
  const stats = {
    total: words.length,
    mastered: 0,
    dueToday: 0,
    byMasteryLevel: {
      0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    }
  };
  
  words.forEach(word => {
    // Подсчет по уровням мастерства
    stats.byMasteryLevel[word.masteryLevel as keyof typeof stats.byMasteryLevel]++;
    
    // Выученные слова
    if (word.masteryLevel >= 5) {
      stats.mastered++;
    } else if (isWordDueForReview(word, today)) {
      // Слова к повторению сегодня
      stats.dueToday++;
    }
  });
  
  return stats;
}