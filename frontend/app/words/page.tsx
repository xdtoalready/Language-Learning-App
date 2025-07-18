// app/words/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  MASTERY_LEVELS
} from '@/lib/utils';
import { Word } from '@/types/api';
import { EditWordModal } from '@/components/ui/EditWordModal';

export default function WordsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMasteryLevel, setSelectedMasteryLevel] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Word | null>(null);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const { words, isLoadingWords, loadWords, deleteWord, pagination } = useWords();

  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.totalCount || 0;
  const hasNext = pagination?.hasNext || false;
  const hasPrev = pagination?.hasPrev || false;

  const router = useRouter();

  // Мемоизированная функция для загрузки слов с параметрами поиска
  const loadWordsWithParams = useCallback((params?: any, page = 1) => {
    console.log('📚 Загружаем слова с параметрами:', params);
    const finalParams = {
      ...params,
      page,
      limit: 50
    };
    setCurrentPage(page);
    loadWords(finalParams);
  }, [loadWords]);

  // Мемоизированная debounced функция с возможностью отмены
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedFn = (term: string, masteryLevel: number | null, tags: string[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setCurrentPage(1);
        loadWordsWithParams({
          search: term || undefined,
          masteryLevel: masteryLevel || undefined,
          tags: tags.length > 0 ? tags.join(',') : undefined
        }, 1);
      }, 300);
    };
    
    // Добавляем функцию отмены
    (debouncedFn as any).cancel = () => {
      clearTimeout(timeoutId);
    };
    
    return debouncedFn as typeof debouncedFn & { cancel: () => void };
  }, [loadWordsWithParams]);

  // Загружаем слова при монтировании компонента ОДИН РАЗ
  useEffect(() => {
    if (!hasLoadedInitially) {
      console.log('📚 WordsPage: Первичная загрузка слов...');
      loadWordsWithParams();
      setHasLoadedInitially(true);
    }

    // Cleanup function для предотвращения утечек памяти
    return () => {
      // Отменяем pending debounced вызовы при размонтировании
      debouncedSearch.cancel();
    };
  }, [hasLoadedInitially, loadWordsWithParams, debouncedSearch]);

  // Дебаунсированный поиск - БЕЗ debouncedSearch в зависимостях!
  useEffect(() => {
    if (hasLoadedInitially) {
      debouncedSearch(searchTerm, selectedMasteryLevel, selectedTags);
    }
  }, [searchTerm, selectedMasteryLevel, selectedTags, hasLoadedInitially]);

  // Получаем уникальные теги из всех слов
  const allTags = useMemo(() => {
    return [...new Set(words.flatMap(word => word.tags))].sort();
  }, [words]);

  const handleDeleteWord = async (word: Word) => {
    try {
      await deleteWord(word.id);
      toast.success('Слово удалено');
      setShowDeleteModal(null);
    } catch (error) {
      toast.error('Ошибка при удалении слова');
    }
  };

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedMasteryLevel(null);
    setSelectedTags([]);
    setShowFilters(false);
    // Загружаем все слова без фильтров
    loadWordsWithParams();
  }, [loadWordsWithParams]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const filteredWords = words;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-gray-900"
            >
              Мои слова
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 mt-1"
            >
              Управляйте вашим словарем
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              onClick={() => router.push('/words/new')}
              className="flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Добавить слово
            </Button>
          </motion.div>
        </div>

        {/* Статистика */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
        <Card>
            <CardContent className="p-6">
            <div className="flex items-center">
                <BookOpenIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего слов</p>
                <p className="text-2xl font-bold text-gray-900">{words.length}</p>
                </div>
            </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="p-6">
            <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">К повторению</p>
                <p className="text-2xl font-bold text-gray-900">
                    {words.filter(word => word.masteryLevel < 5 && new Date(word.nextReviewDate) <= new Date()).length}
                </p>
                </div>
            </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="p-6">
            <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Изучается</p>
                <p className="text-2xl font-bold text-gray-900">
                    {words.filter(word => word.masteryLevel > 0 && word.masteryLevel < 5).length}
                </p>
                </div>
            </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="p-6">
            <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Выучено</p>
                <p className="text-2xl font-bold text-gray-900">
                    {words.filter(word => word.masteryLevel === 5).length}
                </p>
                </div>
            </div>
            </CardContent>
        </Card>
        </motion.div>

        {/* Поиск и фильтры */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Поиск */}
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                        type="text"
                        placeholder="Поиск по словам, переводам или тегам..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        wrapperClassName="space-y-1"
                        />
                  </div>
                </div>

                {/* Кнопка фильтров */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center"
                  >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    Фильтры
                    {(selectedMasteryLevel !== null || selectedTags.length > 0) && (
                      <Badge variant="primary" className="ml-2">
                        {(selectedMasteryLevel !== null ? 1 : 0) + selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                  
                  {(selectedMasteryLevel !== null || selectedTags.length > 0) && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-gray-500"
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
              </div>

              {/* Расширенные фильтры */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Фильтр по уровню мастерства */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Уровень мастерства
                        </label>
                        <select
                          value={selectedMasteryLevel ?? ''}
                          onChange={(e) => setSelectedMasteryLevel(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Все уровни</option>
                          {MASTERY_LEVELS.map((level, index) => (
                            <option key={index} value={index}>
                              {level.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Фильтр по тегам */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Теги
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {allTags.map((tag, tagIndex) => (
                            <button
                              key={`tag-${tagIndex}-${tag}`}
                              onClick={() => toggleTag(tag)}
                              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                selectedTags.includes(tag)
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Список слов */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {isLoadingWords ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredWords.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || selectedMasteryLevel !== null || selectedTags.length > 0
                    ? 'Слова не найдены'
                    : 'У вас пока нет слов'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || selectedMasteryLevel !== null || selectedTags.length > 0
                    ? 'Попробуйте изменить критерии поиска'
                    : 'Добавьте первое слово для изучения'
                  }
                </p>
                <Button onClick={() => router.push('/words/new')}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Добавить слово
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWords.map((word, index) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {word.word}
                          </h3>
                          {word.transcription && (
                            <p className="text-sm text-gray-600 mb-2">
                              [{word.transcription}]
                            </p>
                          )}
                          <p className="text-gray-700">{word.translation}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingWord(word)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteModal(word)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {word.example && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700 italic">
                            {word.example}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {word.tags.map((tag, tagIndex) => (
                            <Badge key={`word-tag-${word.id}-${tagIndex}-${tag}`} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="text-right">
                          <Badge 
                            variant="primary"
                            className={getMasteryLevelColor(word.masteryLevel)}
                          >
                            {getMasteryLevelName(word.masteryLevel)}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {getNextReviewText(word.nextReviewDate)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Пагинация */}
          {pagination && totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 flex justify-center"
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(prev => prev - 1);
                    loadWordsWithParams({
                      search: searchTerm || undefined,
                      masteryLevel: selectedMasteryLevel || undefined,
                      tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined
                    }, currentPage - 1);
                  }}
                  disabled={currentPage <= 1}
                >
                  Назад
                </Button>
                
                <span className="text-sm text-gray-600 px-4">
                  Страница {currentPage} из {totalPages} ({totalCount} слов)
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    loadWordsWithParams({
                      search: searchTerm || undefined,
                      masteryLevel: selectedMasteryLevel || undefined,
                      tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined
                    }, currentPage + 1);
                  }}
                  disabled={currentPage >= totalPages}
                >
                  Далее
                </Button>
              </div>
            </motion.div>
          )}
      </div>

      {/* Модальное окно редактирования */}
      <EditWordModal
        word={editingWord}
        isOpen={!!editingWord}
        onClose={() => setEditingWord(null)}
      />

      {/* Модальное окно удаления */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Удалить слово"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Вы уверены, что хотите удалить слово "{showDeleteModal?.word}"? 
            Это действие нельзя отменить.
          </p>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(null)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={() => showDeleteModal && handleDeleteWord(showDeleteModal)}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}