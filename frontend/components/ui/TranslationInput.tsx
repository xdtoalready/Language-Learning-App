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
  wordId: string; // ИСПРАВЛЕНО: добавлен wordId prop
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
  wordId, // ИСПРАВЛЕНО: добавлен wordId prop
  transcription,
  example,
  onSubmit,
  onRetry,
  disabled = false
}: TranslationInputProps) {
  const [userInput, setUserInput] = useState('');
  const [hints, setHints] = useState<Hint[]>([]);
  const [lengthHint, setLengthHint] = useState<string | null>(null); // ИСПРАВЛЕНО: добавлено состояние
  const [firstLetterHint, setFirstLetterHint] = useState<string | null>(null); // ИСПРАВЛЕНО: добавлено состояние
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<InputEvaluation | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { getHint } = useReview();

  // Обновляем время каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Фокус на поле ввода при загрузке
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Сброс состояния при изменении слова
  useEffect(() => {
    setUserInput('');
    setHints([]);
    setLengthHint(null); // ИСПРАВЛЕНО: сброс состояния подсказок
    setFirstLetterHint(null); // ИСПРАВЛЕНО: сброс состояния подсказок
    setEvaluation(null);
    setIsSubmitted(false);
  }, [word, expectedAnswer, wordId]);

  // ИСПРАВЛЕНО: полностью переписанная функция handleHint
  const handleHint = async (type: 'length' | 'first_letter') => {
    // Валидация wordId
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
        type
      });
      
      const hint = await getHint(wordId, type);
      
      // Добавляем подсказку в локальный массив
      const newHint: Hint = { type, content: hint.content, used: true };
      setHints(prev => [...prev, newHint]);
      
      // Сохраняем подсказку в соответствующее состояние
      if (type === 'length') {
        setLengthHint(hint.content);
      } else {
        setFirstLetterHint(hint.content);
      }
      
      toast.success(`Подсказка: ${hint.content}`);
    } catch (error) {
      console.error('Ошибка получения подсказки:', error);
      toast.error('Не удалось получить подсказку');
    }
  };

  const evaluateInput = async (input: string): Promise<InputEvaluation> => {
    // Простая клиентская оценка (в реальном проекте лучше через API)
    const cleanInput = input.trim().toLowerCase();
    const cleanExpected = expectedAnswer.trim().toLowerCase();
    
    if (cleanInput === cleanExpected) {
      return {
        score: hints.length > 0 ? 3 : 4,
        reason: hints.length > 0 ? 'hint_used' : 'exact',
        similarity: 1.0
      };
    }
    
    // Проверяем опечатки (простая проверка)
    const similarity = calculateSimilarity(cleanInput, cleanExpected);
    
    if (similarity >= 0.8) {
      return {
        score: hints.length > 0 ? 2 : 3,
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!userInput.trim() || isEvaluating || isSubmitted || disabled) {
      return;
    }

    setIsEvaluating(true);
    setIsSubmitted(true);

    try {
      const result = await evaluateInput(userInput);
      setEvaluation(result);
      
      // Отправляем результат родительскому компоненту
      setTimeout(() => {
        onSubmit(userInput, hints.length, timeSpent);
      }, 2000); // Показываем результат 2 секунды
      
    } catch (error) {
      console.error('Ошибка оценки ввода:', error);
      setIsEvaluating(false);
      setIsSubmitted(false);
    }
  };

  const handleRetry = () => {
    setUserInput('');
    setIsSubmitted(false);
    setEvaluation(null);
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
            className="text-center text-lg py-3"
            autoComplete="off"
          />
          
          {/* Индикатор оценки */}
          <AnimatePresence>
            {isEvaluating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-md"
              >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Подсказки */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleHint('length')}
            disabled={disabled || isSubmitted || hints.some(h => h.type === 'length')}
            className="flex items-center space-x-1"
          >
            <LightBulbIcon className="h-4 w-4" />
            <span>Длина</span>
            {lengthHint && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleHint('first_letter')}
            disabled={disabled || isSubmitted || hints.some(h => h.type === 'first_letter')}
            className="flex items-center space-x-1"
          >
            <QuestionMarkCircleIcon className="h-4 w-4" />
            <span>Первая буква</span>
            {firstLetterHint && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </Button>
        </div>

        {/* Отображение полученных подсказок */}
        {(lengthHint || firstLetterHint) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm text-yellow-800">
              <strong>Подсказки:</strong>
              {lengthHint && <div>• Длина: {lengthHint}</div>}
              {firstLetterHint && <div>• Первая буква: {firstLetterHint}</div>}
            </div>
          </div>
        )}

        {/* Кнопка отправки */}
        {!isSubmitted && (
          <Button
            type="submit"
            className="w-full"
            disabled={!userInput.trim() || disabled}
          >
            Проверить
          </Button>
        )}
      </form>

      {/* Результат оценки */}
      <AnimatePresence>
        {evaluation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card className={`border-2 ${evaluation.score >= 3 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  {evaluation.score >= 3 ? (
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-8 w-8 text-red-600" />
                  )}
                  <Badge className={getScoreColor(evaluation.score)}>
                    {getScoreText(evaluation.score)}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Ваш ответ:</strong> {userInput}</p>
                  <p><strong>Правильный ответ:</strong> {expectedAnswer}</p>
                  {hints.length > 0 && (
                    <p><strong>Использовано подсказок:</strong> {hints.length}</p>
                  )}
                  <p><strong>Время:</strong> {timeSpent}с</p>
                </div>
              </CardContent>
            </Card>

            {evaluation.score < 3 && (
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full"
              >
                Попробовать снова
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}