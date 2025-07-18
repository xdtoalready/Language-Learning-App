'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  HomeIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useReview, useAuth } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { TranslationInput } from '@/components/ui/TranslationInput';
import { ReviewMode, ReviewDirection } from '@/types/api';

// Опции для режима Recognition
const RATING_OPTIONS = [
  { value: 1, label: 'Сложно', emoji: '😫', color: 'bg-red-500 hover:bg-red-600', description: 'Не помню' },
  { value: 2, label: 'Трудно', emoji: '😐', color: 'bg-orange-500 hover:bg-orange-600', description: 'С трудом' },
  { value: 3, label: 'Хорошо', emoji: '😊', color: 'bg-blue-500 hover:bg-blue-600', description: 'Помню' },
  { value: 4, label: 'Легко', emoji: '😎', color: 'bg-green-500 hover:bg-green-600', description: 'Легко' }
];

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const { 
    currentSession,
    sessionType,
    reviewMode,
    currentDirection,
    currentRound,
    isReviewSession, 
    currentReviewWord, 
    hasMoreWords, 
    remainingWords,
    createReviewSession,
    submitReviewInSession,
    endSessionNew,
    isSessionCompleted
  } = useReview();

  // Состояние для режима Recognition
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Статистика сессии
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    totalWords: 0,
    ratings: { 1: 0, 2: 0, 3: 0, 4: 0 }
  });

  // 🔒 Защита от двойного вызова
  const sessionCreatedRef = useRef(false);
  const isCreatingSession = useRef(false);
  const [forceShowResults, setForceShowResults] = useState(false);
  
  // Читаем параметры из URL
  const urlSessionType = searchParams.get('sessionType') as 'daily' | 'training' || 'daily';
  const urlMode = searchParams.get('mode') as ReviewMode || 'RECOGNITION';

  // ✅ ИСПРАВЛЕНИЕ: Сброс флагов при изменении URL параметров
  useEffect(() => {
    console.log('🔄 URL параметры изменились, сброс флагов и состояния');
    sessionCreatedRef.current = false;
    isCreatingSession.current = false;
    setForceShowResults(false);
    setShowTranslation(false);
  }, [urlSessionType, urlMode]);

  // ✅ ИСПРАВЛЕНИЕ: Улучшенная логика сброса флагов
  useEffect(() => {
    // Сбрасываем флаги в любом из случаев:
    // 1. Нет активной сессии И нет состояния ревью
    // 2. Показаны результаты (завершение сессии)
    if ((!currentSession && !isReviewSession) || isSessionCompleted) {
      console.log('🧹 Очистка флагов сессии:', {
        hasSession: !!currentSession,
        isReviewSession,
        isSessionCompleted
      });
      sessionCreatedRef.current = false;
      isCreatingSession.current = false;
      
      // ✅ НОВОЕ: Сбрасываем forceShowResults при очистке
      if (isSessionCompleted && !currentSession) {
        setForceShowResults(false);
      }
    }
  }, [currentSession, isReviewSession, isSessionCompleted]);

  // инициализация сессии
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    // ✅ ИСПРАВЛЕНИЕ: Улучшенная защита с логированием
    if (sessionCreatedRef.current || isCreatingSession.current) {
      console.log('🛡️ Защита: сессия уже создается или создана', {
        sessionCreated: sessionCreatedRef.current,
        isCreating: isCreatingSession.current
      });
      return;
    }

    // Создаем сессию только если её действительно нет
    const shouldCreateSession = !currentSession && 
                                !isReviewSession && 
                                !isSessionCompleted &&
                                (searchParams.get('sessionType') || searchParams.get('mode'));

    if (shouldCreateSession) {
      console.log('🔄 ReviewPage: Создание новой сессии...', {
        sessionType: urlSessionType,
        mode: urlMode,
        hasCurrentSession: !!currentSession,
        isReviewSession,
        isSessionCompleted
      });
      
      // ✅ ИСПРАВЛЕНИЕ: Дополнительная очистка перед созданием
      setForceShowResults(false);
      setSessionStats({ total: 0, correct: 0, totalWords: 0, ratings: { 1: 0, 2: 0, 3: 0, 4: 0 } });
      
      isCreatingSession.current = true;
      sessionCreatedRef.current = true;
      
      createReviewSession(urlMode, urlSessionType)
        .then((response) => {
          console.log('✅ Сессия успешно создана');
          
          // Правильная инициализация статистики
          if (response?.session && response.session.sessionId) {
            // Для полноценной сессии
            const totalWords = response.session.totalWords || 
                             (response.remainingWords + (response.currentWord ? 1 : 0));
            setSessionStats(prev => ({
              ...prev,
              totalWords,
              total: 0,
              correct: 0
            }));
            console.log('📊 Инициализация статистики для полной сессии:', { totalWords });
          } else {
            // Для пустой сессии (нет слов для повторения)
            setSessionStats(prev => ({
              ...prev,
              totalWords: 0,
              total: 0,
              correct: 0
            }));
            console.log('📊 Инициализация статистики для пустой сессии');
          }
        })
        .catch((error) => {
          console.error('❌ Ошибка создания сессии:', error);
          toast.error('Не удалось создать сессию повторения');
          router.push('/dashboard');
        })
        .finally(() => {
          isCreatingSession.current = false;
        });
    }
  }, [isAuthenticated, currentSession, isReviewSession, isSessionCompleted, searchParams]);

  useEffect(() => {
    console.log('🔍 Состояние компонента изменилось:', {
      isSessionCompleted,
      hasMoreWords,
      currentReviewWord: !!currentReviewWord,
      sessionStats,
      forceShowResults,
      isCompleted: isCompleted
    });
  }, [isSessionCompleted, hasMoreWords, currentReviewWord, sessionStats, forceShowResults]);

  // проверка состояния загрузки
  const isLoading = isCreatingSession.current || 
                   (sessionCreatedRef.current && !currentSession && !isSessionCompleted) ||
                   (!currentReviewWord && hasMoreWords && !isSessionCompleted);

  // Проверка завершения с улучшенной логикой
  const isCompleted = isSessionCompleted || 
                     forceShowResults ||
                     (sessionStats.totalWords > 0 && sessionStats.total >= sessionStats.totalWords) ||
                     (!hasMoreWords && !currentReviewWord && sessionStats.total > 0);

  console.log('🔍 Детальная проверка состояния:', {
    isSessionCompleted,
    hasMoreWords,
    isReviewSession,
    isLoading,
    sessionCreated: sessionCreatedRef.current,
    sessionStats,
    currentReviewWord: !!currentReviewWord,
    currentSession: !!currentSession,
    isCompleted,
    creating: isCreatingSession.current
  });

  // ✅ ИСПРАВЛЕНИЕ: Экстренная активация результатов с отложенным таймером
  useEffect(() => {
    if (sessionStats.totalWords > 0 && sessionStats.total >= sessionStats.totalWords && !isCompleted) {
      console.log('🚨 Экстренная активация результатов по таймеру');
      const timer = setTimeout(() => {
        setForceShowResults(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionStats.total, sessionStats.totalWords, isCompleted]);

  const validateSession = () => {
    if (!currentSession) {
      console.error('❌ Нет активной сессии');
      toast.error('Сессия не найдена. Перенаправляем на главную.');
      router.push('/dashboard');
      return false;
    }

    if (!currentReviewWord && !isSessionCompleted) {
      console.error('❌ Нет текущего слова');
      toast.error('Слово не загружено. Попробуйте еще раз.');
      return false;
    }

    console.log('✅ Валидация сессии прошла:', {
      sessionId: currentSession.sessionId,
      wordId: currentReviewWord?.id,
      word: currentReviewWord?.word,
      isCompleted: isSessionCompleted
    });

    return true;
  };

  // Обработка оценки для режима Recognition
  const handleSubmitRating = async (rating: number) => {
    if (!currentReviewWord || !currentSession) return;

    try {
      // Обновляем статистику ПЕРЕД отправкой
      setSessionStats(prev => ({
        ...prev,
        total: prev.total + 1,
        correct: prev.correct + (rating >= 3 ? 1 : 0),
        ratings: {
          ...prev.ratings,
          [rating]: prev.ratings[rating as keyof typeof prev.ratings] + 1
        }
      }));

      const response = await submitReviewInSession({
        wordId: currentReviewWord.id,
        rating,
        reviewMode: 'RECOGNITION',
        direction: currentDirection,
        timeSpent: 0
      });

      // ✅ Проверяем завершение и принудительно активируем результаты
      if (response?.completed || !response?.hasMoreWords || !response?.currentWord) {
        console.log('🏁 Recognition сессия завершена');
        setForceShowResults(true);
      }

      setShowTranslation(false);
      
    } catch (error) {
      console.error('❌ Ошибка отправки оценки:', error);
      toast.error('Ошибка при сохранении результата');
    }
  };

  // обработка ввода для режимов Translation/Reverse
  const handleTranslationSubmit = async (userInput: string, hintsUsed: number, timeSpent: number) => {
    if (!validateSession()) return;

    try {
      const response = await submitReviewInSession({
        wordId: currentReviewWord!.id,
        userInput,
        hintsUsed,
        timeSpent,
        reviewMode,
        direction: currentDirection
      });

      console.log('✅ Ответ получен:', response);

      // ✅ ПРИНУДИТЕЛЬНАЯ активация результатов
      if (response.completed || !response.hasMoreWords || !response.currentWord) {
        console.log('🏁 Сессия завершена, активируем результаты');
        
        // Обновляем статистику
        setSessionStats(prev => ({
          ...prev,
          total: prev.total + 1,
          correct: prev.correct + (response.evaluation?.score >= 3 ? 1 : 0),
          ratings: {
            ...prev.ratings,
            [response.evaluation?.score || 3]: prev.ratings[response.evaluation?.score as keyof typeof prev.ratings] + 1
          }
        }));
        
        // ✅ ПРИНУДИТЕЛЬНО показываем результаты
        setForceShowResults(true);
        return;
      }

      // Обычное обновление статистики
      setSessionStats(prev => ({
        ...prev,
        total: prev.total + 1,
        correct: prev.correct + (response.evaluation?.score >= 3 ? 1 : 0),
        ratings: {
          ...prev.ratings,
          [response.evaluation?.score || 3]: prev.ratings[response.evaluation?.score as keyof typeof prev.ratings] + 1
        }
      }));

    } catch (error) {
      console.error('❌ Ошибка отправки перевода:', error);
      toast.error('Ошибка при сохранении результата');
    }
  };

  // Завершение сессии
  const handleEndSession = async () => {
    try {
      if (currentSession) {
        await endSessionNew();
      }
      // ✅ ИСПРАВЛЕНИЕ: Очищаем локальные флаги при ручном завершении
      sessionCreatedRef.current = false;
      isCreatingSession.current = false;
      setForceShowResults(false);
    } catch (error) {
      console.error('Ошибка завершения сессии:', error);
    } finally {
      router.push('/dashboard');
    }
  };

  // Получение текста для отображения слова в зависимости от направления
  const getWordToShow = () => {
    if (!currentReviewWord) return '';
    
    return currentDirection === 'LEARNING_TO_NATIVE' 
      ? currentReviewWord.word 
      : currentReviewWord.translation;
  };

  // Получение ожидаемого ответа
  const getExpectedAnswer = () => {
    if (!currentReviewWord) return '';
    
    return currentDirection === 'LEARNING_TO_NATIVE' 
      ? currentReviewWord.translation 
      : currentReviewWord.word;
  };

  // Получение иконки для режима
  const getModeIcon = () => {
    switch (reviewMode) {
      case 'RECOGNITION': return EyeIcon;
      case 'TRANSLATION_INPUT': return PencilIcon;
      case 'REVERSE_INPUT': return ArrowsRightLeftIcon;
      default: return EyeIcon;
    }
  };

  const getProgress = () => {
    if (sessionStats.totalWords === 0) return 0;
    
    // Используем правильную формулу для прогресса
    const currentProgress = (sessionStats.total / sessionStats.totalWords) * 100;
    const clampedProgress = Math.min(Math.max(currentProgress, 0), 100);
    
    console.log('📊 Прогресс:', {
      total: sessionStats.total,
      totalWords: sessionStats.totalWords,
      progress: clampedProgress,
      remainingWords
    });
    
    return clampedProgress;
  };

  // Если не аутентифицирован, показываем загрузку
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {isCreatingSession.current ? 'Создание сессии...' : 'Загрузка слова...'}
          </p>
        </div>
      </div>
    );
  }

  // Результаты сессии
  if (isCompleted) {
    const ModeIcon = getModeIcon();
    
    console.log('🎉 Показываем результаты:', {
      isSessionCompleted,
      hasMoreWords,
      isReviewSession,
      sessionStats,
      currentSession: !!currentSession
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900">
              Сессия завершена!
            </h1>
            
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{sessionStats.total}</div>
                    <div className="text-sm text-gray-600">Всего слов</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                    <div className="text-sm text-gray-600">Правильно</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Точность</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center">
                      <ModeIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="text-sm text-gray-600">
                      {reviewMode === 'RECOGNITION' ? 'Узнавание' :
                       reviewMode === 'TRANSLATION_INPUT' ? 'Ввод перевода' :
                       reviewMode === 'REVERSE_INPUT' ? 'Обратный ввод' : 'Режим'}
                    </div>
                  </div>
                </div>
                
                {sessionStats.total > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Распределение оценок:</h3>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {RATING_OPTIONS.map((option) => (
                        <div key={option.value} className="text-center">
                          <div className="text-lg">{option.emoji}</div>
                          <div className="font-medium">{sessionStats.ratings[option.value as keyof typeof sessionStats.ratings]}</div>
                          <div className="text-gray-500">{option.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleEndSession} className="flex items-center gap-2">
                <HomeIcon className="h-4 w-4" />
                Завершить
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Основной интерфейс тренировки
  if (!currentReviewWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка слова...</p>
        </div>
      </div>
    );
  }

  const ModeIcon = getModeIcon();
  const wordToShow = getWordToShow();
  const expectedAnswer = getExpectedAnswer();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Назад
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <ModeIcon className="h-3 w-3" />
                {reviewMode === 'RECOGNITION' ? 'Узнавание' :
                 reviewMode === 'TRANSLATION_INPUT' ? 'Ввод перевода' :
                 reviewMode === 'REVERSE_INPUT' ? 'Обратный ввод' : 'Режим'}
              </Badge>
              
              <Badge variant={sessionType === 'daily' ? 'default' : 'secondary'}>
                {sessionType === 'daily' ? 'Ежедневная' : 'Тренировка'}
              </Badge>
              
              {reviewMode === 'TRANSLATION_INPUT' && (
                <Badge variant="outline">
                  Раунд {currentRound}/2
                </Badge>
              )}
            </div>
          </div>

          <ProgressBar 
            progress={getProgress()} 
            className="mb-2"
          />
          <p className="text-sm text-gray-600 text-center">
            {sessionStats.total} из {sessionStats.totalWords} • Осталось: {remainingWords}
          </p>
        </div>

        {/* Карточка со словом */}
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              {/* Основное слово */}
              <div className="text-3xl font-bold text-gray-900">
                {wordToShow}
              </div>
              
              {/* Транскрипция (если есть) */}
              {currentReviewWord.transcription && currentDirection === 'LEARNING_TO_NATIVE' && (
                <div className="text-lg text-gray-500">
                  [{currentReviewWord.transcription}]
                </div>
              )}
              
              {/* Пример (если есть) */}
              {currentReviewWord.example && (
                <div className="text-sm text-gray-600 italic max-w-md mx-auto">
                  {currentReviewWord.example}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Интерфейс в зависимости от режима */}
        <AnimatePresence mode="wait">
          {reviewMode === 'RECOGNITION' ? (
            <motion.div
              key="recognition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {!showTranslation ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Button
                      onClick={() => setShowTranslation(true)}
                      className="flex items-center gap-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Показать перевод
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-xl font-medium text-green-700 mb-4">
                        {expectedAnswer}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowTranslation(false)}
                        className="flex items-center gap-2 text-sm"
                      >
                        <EyeSlashIcon className="h-4 w-4" />
                        Скрыть
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    {RATING_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        onClick={() => handleSubmitRating(option.value)}
                        className={`${option.color} text-white p-4 h-auto flex flex-col items-center gap-2`}
                      >
                        <span className="text-2xl">{option.emoji}</span>
                        <div className="text-center">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs opacity-90">{option.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TranslationInput
                word={getWordToShow()}
                expectedAnswer={getExpectedAnswer()}
                direction={currentDirection}
                wordId={currentReviewWord?.id || ''}
                transcription={currentReviewWord?.transcription}
                example={currentReviewWord?.example}
                onSubmit={handleTranslationSubmit}
                disabled={!currentReviewWord}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}