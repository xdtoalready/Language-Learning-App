// app/review/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  EyeIcon,
  ArrowLeftIcon,
  HomeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useReview } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { getRatingText, getRatingEmoji, getMasteryLevelName } from '@/lib/utils';

export default function ReviewPage() {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const router = useRouter();

  useEffect(() => {
    if (!isReviewSession || !currentReviewWord) {
      startReviewSession().catch(() => {
        toast.error('Нет слов для повторения');
        router.push('/dashboard');
      });
    }
  }, [isReviewSession, currentReviewWord, startReviewSession, router]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRating = async (rating: number) => {
    if (!currentReviewWord || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await submitReview(currentReviewWord.id, rating);
      
      // Обновляем статистику сессии
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (rating >= 3 ? 1 : 0),
        ratings: {
          ...prev.ratings,
          [rating]: prev.ratings[rating as keyof typeof prev.ratings] + 1
        }
      }));

      // Сбрасываем состояние для следующего слова
      setShowAnswer(false);
      
      // Показываем результат
      if (rating >= 3) {
        toast.success(`${getRatingEmoji(rating)} ${getRatingText(rating)}!`);
      } else {
        toast.error(`${getRatingEmoji(rating)} ${getRatingText(rating)}`);
      }

    } catch (error) {
      toast.error('Ошибка при отправке результата');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = () => {
    endReviewSession();
    router.push('/dashboard');
  };

  // Если нет слов для повторения
  if (!currentReviewWord && !hasMoreWords) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <Card className="p-8 max-w-md mx-auto">
            <CardContent>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Отлично! 🎉
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

  if (!currentReviewWord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              {/* Карточка со словом */}
              <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  {/* Информация о слове */}
                  <div className="mb-6">
                    <Badge variant="secondary" className="mb-4">
                      {getMasteryLevelName(currentReviewWord.masteryLevel)}
                    </Badge>
                    {currentReviewWord.tags.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mb-4">
                        {currentReviewWord.tags.map((tag, index) => (
                          <Badge key={index} variant="default" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Слово */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                  >
                    <h2 className="text-5xl font-bold text-gray-900 mb-4">
                      {currentReviewWord.word}
                    </h2>
                    {currentReviewWord.transcription && (
                      <p className="text-xl text-gray-600 italic">
                        [{currentReviewWord.transcription}]
                      </p>
                    )}
                  </motion.div>

                  {/* Ответ */}
                  <AnimatePresence>
                    {showAnswer ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                          <h3 className="text-2xl font-semibold text-blue-900 mb-2">
                            {currentReviewWord.translation}
                          </h3>
                          {currentReviewWord.example && (
                            <p className="text-blue-700 italic">
                              {currentReviewWord.example}
                            </p>
                          )}
                        </div>

                        {/* Кнопки оценки */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                          {[
                            { rating: 1, text: 'Забыл', color: 'bg-red-500 hover:bg-red-600' },
                            { rating: 2, text: 'С трудом', color: 'bg-orange-500 hover:bg-orange-600' },
                            { rating: 3, text: 'Хорошо', color: 'bg-blue-500 hover:bg-blue-600' },
                            { rating: 4, text: 'Отлично', color: 'bg-green-500 hover:bg-green-600' }
                          ].map((option) => (
                            <Button
                              key={option.rating}
                              onClick={() => handleRating(option.rating)}
                              disabled={isSubmitting}
                              className={`${option.color} text-white border-0 py-4 text-center transition-all hover:scale-105`}
                            >
                              <div>
                                <div className="text-2xl mb-1">
                                  {getRatingEmoji(option.rating)}
                                </div>
                                <div className="text-sm font-medium">
                                  {option.text}
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Button
                          onClick={handleShowAnswer}
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4"
                        >
                          <EyeIcon className="h-5 w-5 mr-2" />
                          Показать ответ
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Подсказка */}
              {!showAnswer && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-gray-500 text-sm"
                >
                  💡 Сначала попробуйте вспомнить перевод, затем нажмите "Показать ответ"
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}