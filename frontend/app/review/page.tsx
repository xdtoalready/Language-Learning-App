// app/review/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  HomeIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useReview, useAuth } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';

const RATING_OPTIONS = [
  { value: 1, label: 'Сложно', emoji: '😫', color: 'bg-red-500 hover:bg-red-600', description: 'Не помню' },
  { value: 2, label: 'Трудно', emoji: '😐', color: 'bg-orange-500 hover:bg-orange-600', description: 'С трудом' },
  { value: 3, label: 'Хорошо', emoji: '😊', color: 'bg-blue-500 hover:bg-blue-600', description: 'Помню' },
  { value: 4, label: 'Легко', emoji: '😎', color: 'bg-green-500 hover:bg-green-600', description: 'Легко' }
];

export default function ReviewPage() {
  const [showTranslation, setShowTranslation] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    ratings: { 1: 0, 2: 0, 3: 0, 4: 0 }
  });

  const { 
    isReviewSession, 
    currentReviewWord, 
    hasMoreWords, 
    remainingWords,
    startReviewSession,
    submitReview, 
    endReviewSession 
  } = useReview();
  
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Инициализация сессии, если она не активна
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    if (!isReviewSession && !currentReviewWord) {
      console.log('🔄 ReviewPage: Запуск сессии ревью...');
      startReviewSession().catch((error) => {
        console.error('Ошибка запуска сессии ревью:', error);
        toast.error('Не удалось запустить сессию повторения');
        router.push('/dashboard');
      });
    }
  }, [isAuthenticated, isReviewSession, currentReviewWord, startReviewSession, router]);

  const handleSubmitRating = async (rating: number) => {
    if (!currentReviewWord) return;

    try {
      // Обновляем статистику сессии
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (rating >= 3 ? 1 : 0),
        ratings: {
          ...prev.ratings,
          [rating]: prev.ratings[rating as keyof typeof prev.ratings] + 1
        }
      }));

      await submitReview(currentReviewWord.id, rating);
      setShowTranslation(false);
      
    } catch (error) {
      console.error('Ошибка отправки оценки:', error);
      toast.error('Ошибка при сохранении результата');
    }
  };

  const handleEndSession = () => {
    endReviewSession();
    router.push('/dashboard');
  };

  const getRatingEmoji = (rating: number) => {
    const option = RATING_OPTIONS.find(opt => opt.value === rating);
    return option ? option.emoji : '😐';
  };

  // Проверка авторизации
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Перенаправление...</p>
        </div>
      </div>
    );
  }

  // Экран завершения сессии
  if (!isReviewSession || (!currentReviewWord && !hasMoreWords)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Сессия завершена! 🎉
              </h1>
              <p className="text-gray-600 mb-6">
                Вы завершили сессию повторения!
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
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs">
                    {Object.entries(sessionStats.ratings).map(([rating, count]) => (
                      <div key={rating} className="text-center">
                        <div className="text-lg">{getRatingEmoji(parseInt(rating))}</div>
                        <div className="font-medium">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
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
          <p className="text-gray-600">Подготовка слова для повторения...</p>
        </div>
      </div>
    );
  }

  const totalWords = sessionStats.total + remainingWords + 1;
  const progress = ((sessionStats.total + 1) / totalWords) * 100;

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
              <h1 className="text-lg font-semibold text-gray-900">
                Повторение слов
              </h1>
              <p className="text-sm text-gray-600">
                {sessionStats.total + 1} из {totalWords}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Осталось</p>
              <p className="text-lg font-semibold text-blue-600">
                {remainingWords}
              </p>
            </div>
          </div>

          <ProgressBar
            value={sessionStats.total + 1}
            max={totalWords}
            color="blue"
          />
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentReviewWord.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="mb-8">
                <CardContent className="p-8 text-center">
                  {/* Слово */}
                  <div className="mb-6">
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      {currentReviewWord.word}
                    </h2>
                    {currentReviewWord.transcription && (
                      <p className="text-lg text-gray-600">
                        [{currentReviewWord.transcription}]
                      </p>
                    )}
                  </div>

                  {/* Кнопка показать/скрыть перевод */}
                  <div className="mb-6">
                    <Button
                      onClick={() => setShowTranslation(!showTranslation)}
                      variant="outline"
                      className="flex items-center mx-auto"
                    >
                      {showTranslation ? (
                        <>
                          <EyeSlashIcon className="h-4 w-4 mr-2" />
                          Скрыть перевод
                        </>
                      ) : (
                        <>
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Показать перевод
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Перевод */}
                  <AnimatePresence>
                    {showTranslation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6"
                      >
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-xl font-medium text-gray-900 mb-2">
                            {currentReviewWord.translation}
                          </p>
                          {currentReviewWord.example && (
                            <p className="text-gray-700 italic">
                              {currentReviewWord.example}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Теги */}
                  {currentReviewWord.tags && currentReviewWord.tags.length > 0 && (
                    <div className="mb-6">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {currentReviewWord.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Кнопки оценки */}
              {showTranslation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                        Насколько хорошо вы помните это слово?
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {RATING_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            onClick={() => handleSubmitRating(option.value)}
                            className={`${option.color} text-white border-0 p-4 h-auto flex flex-col items-center`}
                          >
                            <span className="text-2xl mb-1">{option.emoji}</span>
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs opacity-90">{option.description}</span>
                          </Button>
                        ))}
                      </div>
                      
                      <p className="text-center text-sm text-gray-600 mt-4">
                        Выберите, насколько легко вам далось это слово
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Подсказка, если перевод не показан */}
          {!showTranslation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-gray-600">
                Попробуйте вспомнить перевод, затем проверьте себя
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}