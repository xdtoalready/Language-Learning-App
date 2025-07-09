// backend/src/utils/inputEvaluation.ts

export interface InputEvaluation {
  score: 1 | 2 | 3 | 4;
  reason: 'exact' | 'typo' | 'synonym' | 'hint_used' | 'wrong';
  similarity: number; // 0-1
  suggestions?: string[];
}

/**
 * Вычисляет расстояние Левенштейна между двумя строками
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Инициализация матрицы
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Заполнение матрицы
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // замена
          matrix[i][j - 1] + 1,     // вставка
          matrix[i - 1][j] + 1      // удаление
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Нормализует строку для сравнения
 */
function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // множественные пробелы заменяем на один
}

/**
 * Проверяет, является ли строка опечаткой (схожесть > 70%)
 */
function isTypo(userInput: string, correctAnswer: string): boolean {
  const normalized1 = normalizeString(userInput);
  const normalized2 = normalizeString(correctAnswer);
  
  if (normalized1.length === 0 || normalized2.length === 0) {
    return false;
  }
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - (distance / maxLength);
  
  // Считаем опечаткой если схожесть больше 70% и расстояние разумное
  // Для коротких слов (до 4 букв) - максимум 1 ошибка
  // Для средних слов (5-8 букв) - максимум 2 ошибки  
  // Для длинных слов (9+ букв) - максимум 3 ошибки
  let maxDistance = 1;
  if (maxLength >= 5 && maxLength <= 8) {
    maxDistance = 2;
  } else if (maxLength > 8) {
    maxDistance = 3;
  }
  
  return similarity >= 0.7 && distance <= maxDistance;
}

/**
 * Вычисляет схожесть между строками (0-1)
 */
function calculateSimilarity(userInput: string, correctAnswer: string): number {
  const normalized1 = normalizeString(userInput);
  const normalized2 = normalizeString(correctAnswer);
  
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  if (normalized1.length === 0 || normalized2.length === 0) {
    return 0.0;
  }
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  return 1 - (distance / maxLength);
}

/**
 * Проверяет пробелы согласно требованию:
 * "если в правильном ответе есть пробелы, то они должны быть и в пользовательском вводе"
 * Учитывает нормализацию множественных пробелов
 */
function validateSpaces(userInput: string, correctAnswer: string): boolean {
  // Нормализуем строки для проверки пробелов
  const normalizedUser = normalizeString(userInput);
  const normalizedCorrect = normalizeString(correctAnswer);
  
  const userSpaces = (normalizedUser.match(/\s/g) || []).length;
  const correctSpaces = (normalizedCorrect.match(/\s/g) || []).length;
  
  // Если в правильном ответе есть пробелы, они должны быть и в пользовательском вводе
  if (correctSpaces > 0 && userSpaces !== correctSpaces) {
    return false;
  }
  
  // Если в правильном ответе нет пробелов, в пользовательском тоже не должно быть
  if (correctSpaces === 0 && userSpaces > 0) {
    return false;
  }
  
  return true;
}

/**
 * Проверяет, является ли пользовательский ввод синонимом
 */
function isSynonym(userInput: string, synonyms: string[]): boolean {
  const normalizedInput = normalizeString(userInput);
  
  return synonyms.some(synonym => 
    normalizeString(synonym) === normalizedInput
  );
}

/**
 * Генерирует подсказки для исправления
 */
function generateSuggestions(userInput: string, correctAnswer: string, synonyms: string[]): string[] {
  const suggestions: string[] = [];
  
  // Добавляем правильный ответ
  suggestions.push(correctAnswer);
  
  // Добавляем синонимы, если они есть
  synonyms.forEach(synonym => {
    if (synonym.toLowerCase() !== correctAnswer.toLowerCase()) {
      suggestions.push(synonym);
    }
  });
  
  return suggestions.slice(0, 3); // максимум 3 предложения
}

/**
 * Основная функция оценки ввода пользователя
 * 
 * Система оценки:
 * - Точное совпадение = 4
 * - С опечатками = 3  
 * - Синонимы = 3
 * - Подсказка = 2
 * - Не знаю = 1
 */
export function evaluateInput(
  userInput: string,
  correctAnswer: string,
  synonyms: string[] = [],
  hintsUsed: number = 0
): InputEvaluation {
  // Очищаем входные данные
  const cleanUserInput = userInput?.trim() || '';
  const cleanCorrectAnswer = correctAnswer?.trim() || '';
  
  // Пустой ввод = не знаю
  if (!cleanUserInput) {
    return {
      score: 1,
      reason: 'wrong',
      similarity: 0,
      suggestions: generateSuggestions(cleanUserInput, cleanCorrectAnswer, synonyms)
    };
  }
  
  // Проверяем пробелы
  if (!validateSpaces(cleanUserInput, cleanCorrectAnswer)) {
    return {
      score: 1,
      reason: 'wrong',
      similarity: calculateSimilarity(cleanUserInput, cleanCorrectAnswer),
      suggestions: generateSuggestions(cleanUserInput, cleanCorrectAnswer, synonyms)
    };
  }
  
  const similarity = calculateSimilarity(cleanUserInput, cleanCorrectAnswer);
  
  // Точное совпадение (игнорируем регистр)
  if (normalizeString(cleanUserInput) === normalizeString(cleanCorrectAnswer)) {
    // Если использовались подсказки, максимум 2 балла
    return {
      score: hintsUsed > 0 ? 2 : 4,
      reason: hintsUsed > 0 ? 'hint_used' : 'exact',
      similarity: 1.0
    };
  }
  
  // Проверяем синонимы
  if (isSynonym(cleanUserInput, synonyms)) {
    return {
      score: hintsUsed > 0 ? 2 : 3,
      reason: hintsUsed > 0 ? 'hint_used' : 'synonym',
      similarity: 1.0
    };
  }
  
  // Проверяем опечатки
  if (isTypo(cleanUserInput, cleanCorrectAnswer)) {
    return {
      score: hintsUsed > 0 ? 2 : 3,
      reason: hintsUsed > 0 ? 'hint_used' : 'typo',
      similarity,
      suggestions: generateSuggestions(cleanUserInput, cleanCorrectAnswer, synonyms)
    };
  }
  
  // Неправильный ответ
  return {
    score: 1,
    reason: 'wrong',
    similarity,
    suggestions: generateSuggestions(cleanUserInput, cleanCorrectAnswer, synonyms)
  };
}

/**
 * Генерирует подсказку для слова
 */
export function generateHint(
  word: string,
  hintType: 'length' | 'first_letter',
  hintsUsed: number
): { content: string; penalty: boolean } {
  switch (hintType) {
    case 'length':
      // Первая подсказка: количество символов
      const charCount = word.length;
      const spaceCount = (word.match(/\s/g) || []).length;
      let lengthHint = `${charCount} символов`;
      
      if (spaceCount > 0) {
        lengthHint += ` (включая ${spaceCount} пробел${spaceCount > 1 ? 'а' : ''})`;
      }
      
      return {
        content: lengthHint,
        penalty: hintsUsed === 0 // штраф только за первую подсказку
      };
      
    case 'first_letter':
      // Вторая подсказка: первая буква
      const firstChar = word.charAt(0);
      return {
        content: `Начинается с: "${firstChar}"`,
        penalty: true
      };
      
    default:
      return {
        content: '',
        penalty: false
      };
  }
}

/**
 * Валидация пользовательского ввода в реальном времени
 */
export function validateInputRealtime(
  userInput: string,
  correctAnswer: string
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Проверка длины (не слишком длинный)
  if (userInput.length > correctAnswer.length * 2) {
    warnings.push('Ответ кажется слишком длинным');
  }
  
  // Нормализуем для проверки пробелов
  const normalizedUser = normalizeString(userInput);
  const normalizedCorrect = normalizeString(correctAnswer);
  
  // Проверка пробелов после нормализации
  const userSpaces = (normalizedUser.match(/\s/g) || []).length;
  const correctSpaces = (normalizedCorrect.match(/\s/g) || []).length;
  
  if (correctSpaces > 0 && userSpaces === 0) {
    errors.push('В ответе должны быть пробелы');
  } else if (correctSpaces === 0 && userSpaces > 0) {
    errors.push('В ответе не должно быть пробелов');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Статистика точности ввода для слова
 */
export function calculateInputAccuracy(inputHistory: {
  correct: number;
  attempts: number;
}): {
  accuracy: number;
  level: 'excellent' | 'good' | 'needs_practice';
} {
  if (inputHistory.attempts === 0) {
    return { accuracy: 0, level: 'needs_practice' };
  }
  
  const accuracy = inputHistory.correct / inputHistory.attempts;
  
  let level: 'excellent' | 'good' | 'needs_practice';
  if (accuracy >= 0.9) {
    level = 'excellent';
  } else if (accuracy >= 0.7) {
    level = 'good';
  } else {
    level = 'needs_practice';
  }
  
  return { accuracy, level };
}