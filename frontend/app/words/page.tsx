// app/words/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useWords } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  getMasteryLevelName,
  getMasteryLevelColor,
  getNextReviewText,
  formatDate,
  debounce,
  MASTERY_LEVELS
} from '@/lib/utils';
import { Word } from '@/types/api';

export default function WordsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMasteryLevel, setSelectedMasteryLevel] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Word | null>(null);

  const { words, isLoadingWords, loadWords, deleteWord } = useWords();
  const router = useRouter();

  // Загружаем слова при монтировании компонента
  useEffect(() => {
    loadWords();
  }, [loadWords]);

  // Дебаунсированный поиск
  const debouncedSearch = debounce((term: string) => {
    loadWords({
      search: term,
      masteryLevel: selectedMasteryLevel || undefined,
      tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined
    });
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, selectedMasteryLevel, selectedTags, debouncedSearch]);

  // Получаем уникальные теги из всех слов
  const allTags = [...new Set(words.flatMap(word => word.tags))].sort();

  const handleDeleteWord = async (word: Word) => {
    try {
      await deleteWord(word.id);
      toast.success('Слово удалено');
      setShowDeleteModal(null);
    } catch (error) {
      toast.error('Ошибка при удалении слова');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMasteryLevel(null);
    setSelectedTags([]);
    setShowFilters(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Мои слова</h1>
            <p className="text-gray-600 mt-2">
              Всего слов: {words.length}
            </p>
          </div>
          <Button
            onClick={() => router.push('/words/new')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Добавить слово
          </Button>
        </div>

        {/* Поиск и фильтры */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Поиск */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Поиск по слову, переводу, транскрипции..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Кнопка фильтров */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Фильтры
                {(selectedMasteryLevel !== null || selectedTags.length > 0) && (
                  <Badge variant="primary" size="sm" className="ml-2">
                    {(selectedMasteryLevel !== null ? 1 : 0) + selectedTags.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Панель фильтров */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 pt-6 border-t border-gray-200"
                >
                  <div className="space-y-4">
                    {/* Уровень мастерства */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Уровень мастерства:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={selectedMasteryLevel === null ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => setSelectedMasteryLevel(null)}
                        >
                          Все
                        </Badge>
                        {MASTERY_LEVELS.map((level) => (
                          <Badge
                            key={level.value}
                            variant={selectedMasteryLevel === level.value ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => setSelectedMasteryLevel(level.value)}
                          >
                            {level.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Теги */}
                    {allTags.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Теги:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {allTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
                              className="cursor-pointer"
                              onClick={() => toggleTag(tag)}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Кнопка очистки */}
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Очистить фильтры
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Список слов */}
        {isLoadingWords ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" className="text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Загрузка слов...</p>
          </div>
        ) : words.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedMasteryLevel !== null || selectedTags.length > 0
                  ? 'Слова не найдены'
                  : 'У вас пока нет слов'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedMasteryLevel !== null || selectedTags.length > 0
                  ? 'Попробуйте изменить условия поиска или очистить фильтры'
                  : 'Добавьте первое слово, чтобы начать изучение'
                }
              </p>
              {!(searchTerm || selectedMasteryLevel !== null || selectedTags.length > 0) && (
                <Button onClick={() => router.push('/words/new')}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Добавить первое слово
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {words.map((word, index) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="card-hover h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 truncate">
                            {word.word}
                          </h3>
                          {word.transcription && (
                            <p className="text-sm text-gray-600 italic">
                              [{word.transcription}]
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => setEditingWord(word)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(word)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {/* Перевод */}
                        <p className="text-lg font-medium text-blue-600">
                          {word.translation}
                        </p>

                        {/* Пример */}
                        {word.example && (
                          <p className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
                            {word.example}
                          </p>
                        )}

                        {/* Теги */}
                        {word.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {word.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Статус */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <Badge className={getMasteryLevelColor(word.masteryLevel)}>
                            {getMasteryLevelName(word.masteryLevel)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {getNextReviewText(word.nextReviewDate)}
                          </span>
                        </div>

                        {/* Дата создания */}
                        <p className="text-xs text-gray-400">
                          Добавлено: {formatDate(word.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Модальное окно удаления */}
        <Modal
          isOpen={!!showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          title="Удалить слово"
        >
          {showDeleteModal && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Вы уверены, что хотите удалить слово{' '}
                <span className="font-semibold">"{showDeleteModal.word}"</span>?
                Это действие нельзя отменить.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(null)}
                >
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteWord(showDeleteModal)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}