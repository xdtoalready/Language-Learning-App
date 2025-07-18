'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LightBulbIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useReview } from '@/store/useStore';
import { ReviewDirection, InputEvaluation, Hint } from '@/types/api';

interface TranslationInputProps {
  word: string;
  expectedAnswer: string;
  direction: ReviewDirection;
  wordId: string;
  transcription?: string;
  example?: string;
  onSubmit: (userInput: string, hintsUsed: number, timeSpent: number) => void;
  onRetry?: () => void;
  disabled?: boolean;
}

export function TranslationInput({
  word,
  expectedAnswer,
  direction,
  wordId,
  transcription,
  example,
  onSubmit,
  onRetry,
  disabled = false
}: TranslationInputProps) {
  const [userInput, setUserInput] = useState('');
  const [hints, setHints] = useState<Hint[]>([]);
  const [lengthHint, setLengthHint] = useState<string | null>(null);
  const [firstLetterHint, setFirstLetterHint] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<InputEvaluation | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { getHint } = useReview();

  // ✅ Обновляем время каждую секунду
  useEffect(() => {
    if (isSubmitted) return; // Останавливаем таймер после отправки
    
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isSubmitted]);

  // ✅ Фокус на поле ввода при загрузке
  useEffect(() => {
    if (inputRef.current && !disabled && !isSubmitted) {
      inputRef.current.focus();
    }
  }, [disabled, isSubmitted]);

  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полный сброс состояния при изменении слова
  useEffect(() => {
    console.log('🔄 TranslationInput: Сброс состояния для нового слова:', {
      newWordId: wordId,
      newWord: word
    });
    
    // Очищаем таймаут если он есть
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    
    // Полный сброс состояния
    setUserInput('');
    setHints([]);
    setLengthHint(null);
    setFirstLetterHint(null);
    setEvaluation(null);
    setIsSubmitted(false);
    setIsEvaluating(false);
    
    // Устанавливаем фокус на поле ввода
    setTimeout(() => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }, 100);
  }, [word, expectedAnswer, wordId, disabled]);

  // ✅ Очистка таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // ✅ ИСПРАВЛЕННАЯ функция получения подсказки
  const handleHint = async (type: 'length' | 'first_letter') => {
    if (!wordId) {
      console.error('❌ Нет wordId для подсказки');
      toast.error('Ошибка: неверные данные слова');
      return;
    }
    
    // Проверяем, не использовалась ли уже эта подсказка
    const alreadyUsed = hints.some(h => h.type === type);
    if (alreadyUsed) {
      toast.info('Эта подсказка уже использована');
      return;
    }
    
    try {
      console.log('💡 Запрос подсказки для слова:', {
        wordId,
        word,
        type,
        currentHints: hints.length
      });
      
      const hintResponse = await getHint(wordId, type);
      
      // Создаем объект подсказки
      const newHint: Hint = { 
        type, 
        content: hintResponse.content || hintResponse, // Поддержка разных форматов ответа
        used: true 
      };
      
      // Добавляем подсказку в локальный массив
      setHints(prev => [...prev, newHint]);
      
      // Сохраняем подсказку в соответствующее состояние
      if (type === 'length') {
        setLengthHint(newHint.content);
      } else {
        setFirstLetterHint(newHint.content);
      }
      
      console.log('✅ Подсказка получена:', newHint.content);
      toast.success(`Подсказка: ${newHint.content}`);
    } catch (error) {
      console.error('❌ Ошибка получения подсказки:', error);
      toast.error('Не удалось получить подсказку');
    }
  };

  const parseTranslations = (translationString: string): string[] => {
  return translationString
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
};

const getPrimaryTranslation = (): string => {
  const translations = parseTranslations(expectedAnswer);
  return translations[0] || expectedAnswer;
};

  // функция оценки
const evaluateInput = async (input: string): Promise<InputEvaluation> => {
  const cleanInput = (input || '').trim().toLowerCase();
  
  if (!cleanInput) {
    return {
      score: 1,
      reason: 'Ответ не может быть пустым',
      suggestions: ['Попробуйте ввести перевод']
    };
  }

  // Парсим все возможные переводы
  const possibleTranslations = parseTranslations(expectedAnswer);
  
  console.log('🔍 Проверяем ввод против вариантов:', {
    userInput: cleanInput,
    possibleTranslations,
    hintsUsed: hints.length
  });

  let bestResult: InputEvaluation | null = null;
  let bestScore = 0;

  // Проверяем ввод против каждого возможного перевода
  for (const translation of possibleTranslations) {
    const cleanTranslation = translation.trim().toLowerCase();
    const result = evaluateSingleTranslation(cleanInput, cleanTranslation);
    
    // Выбираем лучший результат
    if (result.score > bestScore) {
      bestScore = result.score;
      bestResult = result;
    }
    
    // Если нашли точное совпадение, можно не проверять остальные
    if (result.score === 4 || (result.score === 2 && hints.length > 0)) {
      break;
    }
  }

  // Применяем штраф за подсказки
  if (bestResult && hints.length > 0) {
    bestResult.score = Math.min(bestResult.score, 2);
    bestResult.reason = `${bestResult.reason} (с подсказками)`;
  }

  return bestResult || {
    score: 1,
    reason: 'Неправильный ответ',
    suggestions: possibleTranslations.slice(0, 3)
  };
};

const evaluateSingleTranslation = (userInput: string, expectedTranslation: string): InputEvaluation => {
  // Точное совпадение
  if (userInput === expectedTranslation) {
    return {
      score: 4,
      reason: 'Точный ответ!',
      similarity: 1.0
    };
  }

  // Проверяем пробелы (критически важно)
  const userSpaces = (userInput.match(/\s/g) || []).length;
  const expectedSpaces = (expectedTranslation.match(/\s/g) || []).length;
  
  if (userSpaces !== expectedSpaces) {
    return {
      score: 1,
      reason: expectedSpaces > 0 
        ? 'В ответе должны быть пробелы'
        : 'В ответе не должно быть пробелов',
      similarity: calculateSimilarity(userInput, expectedTranslation)
    };
  }

  // Алгоритм Левенштейна для определения близости
  const similarity = calculateSimilarity(userInput, expectedTranslation);
  
  // Определяем допустимое количество ошибок
  const maxLength = Math.max(userInput.length, expectedTranslation.length);
  const allowedErrors = Math.floor(maxLength * 0.2); // 20% ошибок максимум
  const distance = calculateLevenshteinDistance(userInput, expectedTranslation);
  
  if (distance <= allowedErrors && similarity > 0.7) {
    return {
      score: 3,
      reason: 'Хорошо! (небольшие опечатки)',
      similarity,
      suggestions: [expectedTranslation]
    };
  }

  return {
    score: 1,
    reason: 'Неправильный ответ',
    similarity,
    suggestions: [expectedTranslation]
  };
};

// Вспомогательные функции для расчета схожести
const calculateSimilarity = (str1: string, str2: string): number => {
  const distance = calculateLevenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
};

const calculateLevenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1, 
          matrix[i - 1][j] + 1 
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!wordId || !expectedAnswer) {
      console.error('❌ Отсутствуют критически важные данные:', { wordId, expectedAnswer });
      toast.error('Ошибка: неполные данные слова');
      return;
    }
    
    if (!userInput.trim() || isEvaluating || isSubmitted || disabled) {
      return;
    }

    console.log('📝 TranslationInput: Отправка ответа:', {
      userInput: userInput.trim(),
      hintsUsed: hints.length,
      timeSpent,
      wordId
    });

    setIsEvaluating(true);
    setIsSubmitted(true);

    try {
      const result = await evaluateInput(userInput);
      setEvaluation(result);
      
      console.log('✅ TranslationInput: Оценка получена:', result);
      
      // ✅ ИСПРАВЛЕНИЕ: убираем setTimeout - отправляем сразу после показа результата
      // Показываем результат 1.5 секунды, затем отправляем
      submitTimeoutRef.current = setTimeout(() => {
        console.log('📤 TranslationInput: Отправка результата родителю');
        onSubmit(userInput.trim(), hints.length, timeSpent);
        submitTimeoutRef.current = null;
      }, 1500);
      
    } catch (error) {
      console.error('❌ Ошибка оценки ввода:', error);
      setIsEvaluating(false);
      setIsSubmitted(false);
      toast.error('Ошибка при оценке ответа');
    }
  };

  const handleRetry = () => {
    // Очищаем таймаут
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
    
    setUserInput('');
    setIsSubmitted(false);
    setIsEvaluating(false);
    setEvaluation(null);
    
    // Фокус на поле ввода
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    if (onRetry) onRetry();
  };

  const getScoreColor = (score: number) => {
    switch (score) {
      case 4: return 'text-green-600 bg-green-100';
      case 3: return 'text-blue-600 bg-blue-100';
      case 2: return 'text-orange-600 bg-orange-100';
      case 1: return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreText = (score: number) => {
    switch (score) {
      case 4: return 'Отлично!';
      case 3: return 'Хорошо!';
      case 2: return 'Неплохо';
      case 1: return 'Неправильно';
      default: return 'Оценка';
    }
  };

  const getDirectionText = () => {
    return direction === 'LEARNING_TO_NATIVE' 
      ? 'Переведите на русский:'
      : 'Переведите на изучаемый язык:';
  };

  const getScoreIcon = (score: number) => {
    switch (score) {
      case 4:
      case 3:
        return <CheckCircleIcon className="h-6 w-6" />;
      case 2:
        return <QuestionMarkCircleIcon className="h-6 w-6" />;
      case 1:
        return <XCircleIcon className="h-6 w-6" />;
      default:
        return null;
    }
  };

const createHintVisualization = () => {
  // Показываем прочерки только если есть подсказка длины
  if (!lengthHint) {
    return (
      <div className="text-gray-500 text-sm">
        Используйте подсказку "Длина" чтобы увидеть структуру слова
      </div>
    );
  }
  
  // Используем основной (первый) перевод для визуализации
  const primaryTranslation = getPrimaryTranslation();
  const answer = primaryTranslation.toLowerCase();
  const words = answer.split(' ');
  
  return (
    <div className="space-y-2">
      {/* Показываем все возможные варианты ответа */}
      <div className="text-xs text-gray-500">
        {parseTranslations(expectedAnswer).length > 1 && (
          <span>Принимается любой из вариантов: {parseTranslations(expectedAnswer).join(', ')}</span>
        )}
      </div>
      
      {/* Визуализация основного варианта */}
      <div className="flex flex-wrap justify-center items-center gap-1">
        {words.map((word, wordIndex) => (
          <div key={wordIndex} className="inline-flex items-center">
            {word.split('').map((char, charIndex) => {
              const globalIndex = words.slice(0, wordIndex).join(' ').length + 
                                 (wordIndex > 0 ? 1 : 0) + charIndex;
              
              // Показываем первую букву если есть подсказка
              const showFirstLetter = firstLetterHint && globalIndex === 0;
              
              return (
                <div
                  key={charIndex}
                  className="inline-flex items-center justify-center w-8 h-10 mx-0.5 
                             border-b-2 border-gray-400 text-lg font-mono"
                >
                  {showFirstLetter ? (
                    <span className="text-blue-600 font-bold">{char.toUpperCase()}</span>
                  ) : (
                    <span className="text-transparent">_</span>
                  )}
                </div>
              );
            })}
            {wordIndex < words.length - 1 && (
              <div className="w-4 h-10 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-gray-400"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

return (
  <div className="w-full max-w-2xl mx-auto space-y-6">
    {/* Заголовок и таймер */}
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-medium text-gray-900">
        {getDirectionText()}
      </h2>
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <ClockIcon className="h-4 w-4" />
        <span>{timeSpent}с</span>
      </div>
    </div>

    {/* Визуализация подсказок - "Поле чудес" */}
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-sm text-gray-600 font-medium">
            Загаданное слово:
          </div>
          
          {/* Прочерки с подсказками */}
          <div className="flex flex-wrap justify-center items-center gap-1 min-h-[40px]">
            {createHintVisualization()}
          </div>
          
          {/* Информация о подсказках */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {lengthHint && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                💡 {lengthHint}
              </Badge>
            )}
            {firstLetterHint && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                🎯 Первая буква открыта
              </Badge>
            )}
            {hints.length === 0 && (
              <span className="text-gray-500">Используйте подсказки для помощи</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Поле ввода */}
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Введите перевод..."
          disabled={disabled || isSubmitted}
          wrapperClassName="mb-0" // Убираем отступ снизу
          className={`text-lg py-3 pr-12 ${
            isSubmitted && evaluation 
              ? `border-2 ${evaluation.score >= 3 ? 'border-green-400' : 'border-red-400'}`
              : ''
          }`}
        />
        
        {/* Индикатор загрузки или результата */}
        {isEvaluating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {evaluation && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className={`p-1 rounded-full ${getScoreColor(evaluation.score)}`}>
              {getScoreIcon(evaluation.score)}
            </div>
          </div>
        )}
      </div>

      {/* Кнопки подсказок и действий */}
      <div className="flex flex-wrap gap-3 justify-center">
        {/* Подсказки */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleHint('length')}
            disabled={disabled || isSubmitted || hints.some(h => h.type === 'length')}
            className="flex items-center gap-2"
          >
            <LightBulbIcon className="h-4 w-4" />
            Длина
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleHint('first_letter')}
            disabled={disabled || isSubmitted || hints.some(h => h.type === 'first_letter')}
            className="flex items-center gap-2"
          >
            <LightBulbIcon className="h-4 w-4" />
            Первая буква
          </Button>
        </div>

        {/* Кнопка отправки/повтора */}
        {!isSubmitted ? (
          <Button
            type="submit"
            disabled={!userInput.trim() || disabled || isEvaluating}
            className="px-8"
          >
            {isEvaluating ? 'Проверяем...' : 'Проверить'}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            className="px-8"
          >
            Попробовать еще раз
          </Button>
        )}
      </div>
    </form>

    {/* Результат оценки */}
    <AnimatePresence>
      {evaluation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="text-center"
        >
          <Card className={`border-2 ${
            evaluation.score >= 3 ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
          }`}>
            <CardContent className="p-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold ${getScoreColor(evaluation.score)}`}>
                {getScoreIcon(evaluation.score)}
                {getScoreText(evaluation.score)}
              </div>
              
              {evaluation.reason && (
                <p className="mt-2 text-sm text-gray-600">
                  {evaluation.reason}
                </p>
              )}
              
              {evaluation.correctAnswer && evaluation.correctAnswer !== userInput && (
                <p className="mt-2 text-sm">
                  <span className="text-gray-600">Правильный ответ: </span>
                  <span className="font-semibold text-green-700">{evaluation.correctAnswer}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Индикаторы использованных подсказок */}
    {hints.length > 0 && !isSubmitted && (
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
          <LightBulbIcon className="h-4 w-4" />
          Использовано подсказок: {hints.length}/2
          <span className="text-xs">(макс. 2 балла)</span>
        </div>
      </div>
    )}
  </div>
)};