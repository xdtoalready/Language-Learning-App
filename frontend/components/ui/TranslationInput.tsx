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

  // ✅ Улучшенная функция оценки
  const evaluateInput = async (input: string): Promise<InputEvaluation> => {
    const cleanInput = input.trim().toLowerCase();
    const cleanExpected = expectedAnswer.trim().toLowerCase();
    
    if (cleanInput === cleanExpected) {
      return {
        score: hints.length > 0 ? Math.max(2, 4 - hints.length) : 4,
        reason: hints.length > 0 ? 'hint_used' : 'exact',
        similarity: 1.0
      };
    }
    
    // Проверяем опечатки
    const similarity = calculateSimilarity(cleanInput, cleanExpected);
    
    if (similarity >= 0.8) {
      return {
        score: hints.length > 0 ? Math.max(1, 3 - hints.length) : 3,
        reason: 'typo',
        similarity
      };
    }
    
    return {
      score: 1,
      reason: 'wrong',
      similarity
    };
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const levenshteinDistance = (s1: string, s2: string): number => {
      const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
      
      for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
          if (s1[i - 1] === s2[j - 1]) {
            matrix[j][i] = matrix[j - 1][i - 1];
          } else {
            matrix[j][i] = Math.min(
              matrix[j - 1][i - 1] + 1,
              matrix[j][i - 1] + 1,
              matrix[j - 1][i] + 1
            );
          }
        }
      }
      
      return matrix[s2.length][s1.length];
    };
    
    return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
  };

  // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: убираем setTimeout и делаем мгновенную отправку
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
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

      {/* Карточка слова */}
      <Card className="border-2 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">{word}</h3>
            {transcription && (
              <p className="text-gray-600 text-sm">[{transcription}]</p>
            )}
            {example && (
              <p className="text-gray-500 text-sm italic">"{example}"</p>
            )}
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
            className={`text-lg py-3 pr-12 ${
              isSubmitted && evaluation 
                ? `border-2 ${evaluation.score >= 3 ? 'border-green-500' : 'border-red-500'}`
                : 'border-gray-300'
            }`}
          />
          {isEvaluating && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Кнопки подсказок и отправки */}
        <div className="flex flex-wrap gap-3">
          {/* Кнопка подсказки длины */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleHint('length')}
            disabled={disabled || isSubmitted || hints.some(h => h.type === 'length')}
            className="flex items-center space-x-2"
          >
            <LightBulbIcon className="h-4 w-4" />
            <span>Длина</span>
            {lengthHint && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </Button>

          {/* Кнопка подсказки первой буквы */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleHint('first_letter')}
            disabled={disabled || isSubmitted || hints.some(h => h.type === 'first_letter')}
            className="flex items-center space-x-2"
          >
            <LightBulbIcon className="h-4 w-4" />
            <span>Первая буква</span>
            {firstLetterHint && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </Button>

          {/* Кнопка отправки */}
          <Button
            type="submit"
            disabled={!userInput.trim() || isEvaluating || isSubmitted || disabled}
            className="ml-auto"
          >
            {isEvaluating ? 'Проверка...' : 'Проверить'}
          </Button>
        </div>
      </form>

      {/* Результат оценки */}
      <AnimatePresence>
        {evaluation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={`border-2 ${
              evaluation.score >= 3 ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getScoreColor(evaluation.score)}`}>
                    {getScoreIcon(evaluation.score)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{getScoreText(evaluation.score)}</span>
                      <Badge variant="outline">{evaluation.score}/4</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {evaluation.reason === 'exact' && 'Точный ответ'}
                      {evaluation.reason === 'typo' && 'Есть опечатки'}
                      {evaluation.reason === 'hint_used' && `Использовано подсказок: ${hints.length}`}
                      {evaluation.reason === 'wrong' && `Правильный ответ: ${expectedAnswer}`}
                    </div>
                  </div>
                  {evaluation.score < 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      className="shrink-0"
                    >
                      Попробовать еще
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Показываем использованные подсказки */}
      {hints.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            <LightBulbIcon className="h-4 w-4" />
            <span>Использовано подсказок: {hints.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}