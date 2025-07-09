// frontend/app/review/page.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ

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
  
  // ✅ ИСПРАВЛЕНО: Добавляем ref для предотвращения дублирования
  const isCreatingSessionRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  
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
    endSessionNew
  } = useReview();

  // Состояние для режима Recognition
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Статистика сессии
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    ratings: { 1: 0, 2: 0, 3: 0, 4: 0 }
  });

  // Читаем параметры из URL
  const urlSessionType = searchParams.get('sessionType') as 'daily' | 'training' || 'daily';
  const urlMode = searchParams.get('mode') as ReviewMode || 'RECOGNITION';

  // ✅ ИСПРАВЛЕНО: Инициализация сессии с защитой от дублирования
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    const hasUrlParams = searchParams.get('sessionType') || searchParams.get('mode');
    const needsNewSession = !isReviewSession && !currentSession && hasUrlParams;
    
    // Проверяем что у нас уже есть сессия с правильным ID
    const currentSessionId = currentSession?.sessionId;
    if (currentSessionId && lastSessionIdRef.current === currentSessionId) {
      console.log('🔄 Сессия уже создана и активна:', currentSessionId);
      return;
    }

    if (needsNewSession && !isCreatingSessionRef.current) {
      console.log('🔄 ReviewPage: Создание новой сессии...', {
        sessionType: urlSessionType,
        mode: urlMode,
        isCreating: isCreatingSessionRef.current,
        hasCurrentSession: !!currentSession,
        isReviewSession
      });

      // Устанавливаем флаг что сессия создается
      isCreatingSessionRef.current = true;
      
      createReviewSession(urlMode, urlSessionType)
        .then((response) => {
          console.log('✅ Сессия успешно создана');
          lastSessionIdRef.current = response?.session?.sessionId || null;
        })
        .catch((error) => {
          console.error('❌ Ошибка создания сессии:', error);
          toast.error('Не удалось создать сессию повторения');
          router.push('/dashboard');
        })
        .finally(() => {
          // Сбрасываем флаг через небольшую задержку
          setTimeout(() => {
            isCreatingSessionRef.current = false;
          }, 1000);
        });
    }
  }, [isAuthenticated, isReviewSession, currentSession, urlSessionType, urlMode, createReviewSession, router, searchParams]);

  // ✅ ИСПРАВЛЕНО: Дополнительная проверка сессии перед отправкой
  const validateSession = () => {
    if (!currentSession) {
      console.error('❌ Нет активной сессии');
      toast.error('Сессия не найдена. Перенаправляем на главную.');
      router.push('/dashboard');
      return false;
    }

    if (!currentReviewWord) {
      console.error('❌ Нет текущего слова');
      toast.error('Слово не загружено. Попробуйте еще раз.');
      return false;
    }

    console.log('✅ Валидация сессии прошла:', {
      sessionId: currentSession.sessionId,
      wordId: currentReviewWord.id,
      word: currentReviewWord.word
    });

    return true;
  };

  // Обработка оценки для режима Recognition
  const handleSubmitRating = async (rating: number) => {
    if (!validateSession()) return;

    try {
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (rating >= 3 ? 1 : 0),
        ratings: {
          ...prev.ratings,
          [rating]: prev.ratings[rating as keyof typeof prev.ratings] + 1
        }
      }));

      await submitReviewInSession({
        wordId: currentReviewWord!.id,
        rating,
        reviewMode: 'RECOGNITION',
        direction: currentDirection,
        timeSpent: 0 // В режиме Recognition время не засекается
      });

      setShowTranslation(false);
      
    } catch (error) {
      console.error('❌ Ошибка отправки оценки:', error);
      toast.error('Ошибка при сохранении результата');
    }
  };

  // ✅ ИСПРАВЛЕНО: Обработка ввода с валидацией сессии
  const handleTranslationSubmit = async (userInput: string, hintsUsed: number, timeSpent: number) => {
    if (!validateSession()) return;

    try {
      console.log('📝 Отправка ревью перевода:', {
        sessionId: currentSession!.sessionId,
        wordId: currentReviewWord!.id,
        userInput,
        hintsUsed,
        timeSpent,
        reviewMode,
        direction: currentDirection
      });

      const response = await submitReviewInSession({
        wordId: currentReviewWord!.id,
        userInput,
        hintsUsed,
        timeSpent,
        reviewMode,
        direction: currentDirection
      });

      console.log('✅ Ответ получен:', response);

      // Обновляем статистику
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + 1,
        ratings: {
          ...prev.ratings,
          3: prev.ratings[3] + 1
        }
      }));

    } catch (error) {
      console.error('❌ Ошибка отправки перевода:', error);
      
      // Проверяем тип ошибки
      if (error instanceof Error && error.message.includes('Session not found')) {
        toast.error('Сессия истекла. Создаем новую сессию...');
        router.push('/dashboard');
      } else {
        toast.error('Ошибка при сохранении результата');
      }
    }
  };

  // Завершение сессии
  const handleEndSession = async () => {
    try {
      if (currentSession) {
        console.log('🏁 Завершение сессии:', currentSession.sessionId);
        await endSessionNew();
      }
    } catch (error) {
      console.error('❌ Ошибка завершения сессии:', error);
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

  // Получение правильного ответа для режимов ввода
  const getCorrectAnswer = () => {
    if (!currentReviewWord) return '';
    
    return currentDirection === 'LEARNING_TO_NATIVE' 
      ? currentReviewWord.translation 
      : currentReviewWord.word;
  };

  // Если сессия завершена, показываем результаты
  if (isReviewSession && !hasMoreWords && !currentReviewWord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Поздравляем! 🎉
              </h1>
              <p className="text-gray-600 mb-6">
                Вы завершили сессию {sessionType === 'daily' ? 'повторения' : 'тренировки'}!
              </p>
              
              {/* Статистика сессии */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Результаты сессии:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Всего слов:</span>
                    <span className="ml-2 font-medium">{sessionStats.total}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Правильно:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {sessionStats.correct}
                    </span>
                  </div>
                </div>
                
                {/* Показываем распределение по оценкам только для Recognition */}
                {reviewMode === 'RECOGNITION' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-xs">
                      {Object.entries(sessionStats.ratings).map(([rating, count]) => (
                        <div key={rating} className="text-center">
                          <div className="text-lg">
                            {RATING_OPTIONS.find(opt => opt.value === parseInt(rating))?.emoji || '😐'}
                          </div>
                          <div className="font-medium">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleEndSession} className="w-full">
                <HomeIcon className="h-4 w-4 mr-2" />
                Вернуться на главную
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Загрузка
  if (!currentReviewWord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">
            {isCreatingSessionRef.current ? 'Создание сессии...' : 'Подготовка слова для повторения...'}
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Заголовок с прогрессом */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleEndSession}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Выйти
            </button>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <ModeIcon className="h-5 w-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">
                  {getModeTitle()}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
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

            <div className="text-right">
              <p className="text-sm text-gray-600">Осталось</p>
              <p className="text-lg font-semibold text-gray-900">{remainingWords}</p>
            </div>
          </div>

          <div className="space-y-2">
            {/* <div className="flex justify-between text-sm text-gray-600">
              <span>{completedWords} из {totalWords}</span>
              <span>{progressPercentage}%</span>
            </div>
            <ProgressBar progress={progress} /> */}
            <ProgressBar 
  showSessionProgress={true}
  currentSession={currentSession}
  remainingWords={remainingWords}
  reviewMode={reviewMode}
  currentRound={currentRound}
  color="blue"
  className="mb-6"
/>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Режим Recognition */}
          {reviewMode === 'RECOGNITION' && (
            <motion.div
              key="recognition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Карточка слова */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {getWordToShow()}
                    </h2>
                    
                    {currentReviewWord.transcription && (
                      <p className="text-gray-600">
                        [{currentReviewWord.transcription}]
                      </p>
                    )}
                    
                    {currentReviewWord.example && (
                      <p className="text-gray-500 italic">
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