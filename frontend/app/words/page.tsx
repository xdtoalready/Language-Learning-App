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
    if (words.length === 0) {
      console.log('📚 WordsPage: Загружаем слова...');
      loadWords();
    }
  }, [loadWords, words.length]);

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

          {/* Добавить еще статистику по уровням мастерства */}
          {MASTERY_LEVELS.slice(0, 3).map((level, index) => {
            const count = words.filter(word => word.masteryLevel === index).length;
            return (
              <Card key={`mastery-${index}-${level.name}`}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{level.name}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
      </div>

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