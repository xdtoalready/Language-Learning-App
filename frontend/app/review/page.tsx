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
  
  // Читаем параметры из URL
  const urlSessionType = searchParams.get('sessionType') as 'daily' | 'training' || 'daily';
  const urlMode = searchParams.get('mode') as ReviewMode || 'RECOGNITION';

  // инициализация сессии
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/auth');
    return;
  }

  // Защита от повторного создания сессии
  if (sessionCreatedRef.current || isCreatingSession.current) {
    console.log('🛡️ Защита: сессия уже создается или создана');
    return;
  }

  // Создаем сессию только если её действительно нет
  const shouldCreateSession = !currentSession && 
                              !isReviewSession && 
                              (searchParams.get('sessionType') || searchParams.get('mode'));

  if (shouldCreateSession) {
    console.log('🔄 ReviewPage: Создание новой сессии...', {
      sessionType: urlSessionType,
      mode: urlMode,
      hasCurrentSession: !!currentSession,
      isReviewSession
    });
    
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
}, [isAuthenticated, currentSession, isReviewSession]);

  // Сброс флагов при смене сессии
useEffect(() => {
    if (!currentSession && !isReviewSession) {
      sessionCreatedRef.current = false;
      isCreatingSession.current = false;
    }
  }, [currentSession, isReviewSession]);

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

  const [forceShowResults, setForceShowResults] = useState(false);

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

useEffect(() => {
  if (sessionStats.totalWords > 0 && sessionStats.total >= sessionStats.totalWords && !isCompleted) {
    console.log('🚨 Экстренная активация результатов по таймеру');
    const timer = setTimeout(() => {
      setForceShowResults(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }
}, [sessionStats.total, sessionStats.totalWords, isCompleted]);

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
                       reviewMode === 'REVERSE_INPUT' ? 'Обратный ввод' : 'Тренировка'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Детальная статистика по оценкам (только если есть данные) */}
            {sessionStats.total > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Детальная статистика</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {RATING_OPTIONS.map((option) => (
                      <div key={option.value} className="text-center">
                        <div className="text-xl mb-1">{option.emoji}</div>
                        <div className="text-lg font-bold">
                          {sessionStats.ratings[option.value as keyof typeof sessionStats.ratings]}
                        </div>
                        <div className="text-xs text-gray-600">{option.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="primary"
                className="flex items-center gap-2"
              >
                <HomeIcon className="h-4 w-4" />
                На главную
              </Button>
              
              {sessionType === 'training' && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <ArrowsRightLeftIcon className="h-4 w-4" />
                  Еще раз
                </Button>
              )}
            </div>

            {/* Информация о типе сессии */}
            <div className="text-center">
              <Badge variant={sessionType === 'daily' ? 'primary' : 'secondary'}>
                {sessionType === 'daily' ? 'Ежедневная тренировка' : 'Тренировочный полигон'}
              </Badge>
              {sessionType === 'training' && (
                <p className="text-sm text-gray-600 mt-2">
                  Результаты тренировочного полигона не влияют на алгоритм повторений
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Основной интерфейс тренировки
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Заголовок с навигацией */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Назад</span>
          </Button>

          <div className="flex items-center space-x-3">
            <Badge variant={sessionType === 'daily' ? 'default' : 'secondary'}>
              {sessionType === 'daily' ? 'Ежедневная' : 'Тренировка'}
            </Badge>
            {currentRound && currentRound > 1 && (
              <Badge variant="outline">
                Раунд {currentRound}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={handleEndSession}
            className="text-red-600 hover:text-red-700"
          >
            Завершить
          </Button>
        </div>

        {/* Прогресс */}
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                Прогресс
                </span>
                <span className="text-sm text-gray-500">
                {sessionStats.total} из {sessionStats.totalWords} слов
                </span>
            </div>
            <ProgressBar 
                value={getProgress()}
                max={100}
                className="h-2"
                color="blue"
                showSessionProgress={true}
                currentSession={currentSession}
                remainingWords={remainingWords}
                reviewMode={reviewMode}
                currentRound={currentRound}
            />
        </div>

        {/* Контент тренировки */}
        <AnimatePresence mode="wait">
          {/* Режим Recognition */}
          {reviewMode === 'RECOGNITION' && currentReviewWord && (
            <motion.div
              key="recognition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Карточка со словом */}
              <Card className="border-2 border-gray-200">
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {getWordToShow()}
                    </h2>
                    {currentReviewWord.transcription && (
                      <p className="text-lg text-gray-600">
                        [{currentReviewWord.transcription}]
                      </p>
                    )}
                    {currentReviewWord.example && !showTranslation && (
                      <p className="text-gray-700 italic">
                        "{currentReviewWord.example}"
                      </p>
                    )}
                    <div className="pt-4">
                      <Button
                        onClick={() => setShowTranslation(!showTranslation)}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        {showTranslation ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                        <span>
                          {showTranslation ? 'Скрыть' : 'Показать'} перевод
                        </span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Перевод */}
              <AnimatePresence>
                {showTranslation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-6 text-center">
                        <h3 className="text-xl font-semibold text-blue-900">
                          {getExpectedAnswer()}
                        </h3>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Кнопки оценки */}
              {showTranslation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {RATING_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleSubmitRating(option.value)}
                      className={`${option.color} text-white h-16 flex flex-col items-center justify-center space-y-1`}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </Button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Режимы ввода */}
          {(reviewMode === 'TRANSLATION_INPUT' || reviewMode === 'REVERSE_INPUT') && currentReviewWord && (
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
                wordId={currentReviewWord.id}
                transcription={currentReviewWord.transcription}
                example={currentReviewWord.example}
                onSubmit={handleTranslationSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}