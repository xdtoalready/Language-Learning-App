// frontend/components/friends/FriendWordsTable.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  PlusCircleIcon,
  CheckCircleIcon,
  TagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { debounce } from '@/lib/utils';

interface FriendWord {
  id: string;
  word: string;
  translation: string;
  transcription?: string;
  tags: string[];
  masteryLevel: number;
  createdAt: string;
}

interface FriendWordsTableProps {
  friendId: string;
  friendUsername: string;
}

export const FriendWordsTable: React.FC<FriendWordsTableProps> = ({ 
  friendId, 
  friendUsername 
}) => {
  const [words, setWords] = useState<FriendWord[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const [copiedWords, setCopiedWords] = useState<Set<string>>(new Set());
  
  // Фильтры и пагинация
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Загрузка слов друга
  const loadFriendWords = useCallback(async (
    searchQuery = search,
    tags = selectedTags,
    page = currentPage
  ) => {
    try {
      setLoading(true);
      
      const params: any = { page, limit: 20 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (tags) params.tags = tags;

      const response = await apiClient.getFriendWords(friendId, params);
      
      setWords(response.words);
      setAvailableTags(response.availableTags);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
      setCurrentPage(response.pagination.currentPage);
      
    } catch (error) {
      console.error('Error loading friend words:', error);
      toast.error('Ошибка загрузки слов');
    } finally {
      setLoading(false);
    }
  }, [friendId, search, selectedTags, currentPage]);

  // Дебаунсированный поиск
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setCurrentPage(1);
      loadFriendWords(query, selectedTags, 1);
    }, 500),
    [selectedTags, loadFriendWords]
  );

  // Эффект для загрузки при изменении поиска
  useEffect(() => {
    debouncedSearch(search);
  }, [search, debouncedSearch]);

  // Загрузка при монтировании
  useEffect(() => {
    loadFriendWords();
  }, []);

  // Обработчик изменения тегов
  const handleTagChange = (tag: string) => {
    const newTags = selectedTags === tag ? '' : tag;
    setSelectedTags(newTags);
    setCurrentPage(1);
    loadFriendWords(search, newTags, 1);
  };

  // Копирование слова
  const handleCopyWord = async (word: FriendWord) => {
    if (copiedWords.has(word.id)) return;
    
    try {
      setCopying(word.id);
      
      const response = await apiClient.copyFriendWord(friendId, word.id);
      
      toast.success(`Слово "${word.word}" добавлено в ваш словарь!`);
      setCopiedWords(prev => new Set([...prev, word.id]));
      
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        toast.error(`Слово "${word.word}" уже есть в вашем словаре`);
        setCopiedWords(prev => new Set([...prev, word.id]));
      } else {
        toast.error('Ошибка при копировании слова');
      }
    } finally {
      setCopying(null);
    }
  };

  // Пагинация
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadFriendWords(search, selectedTags, newPage);
  };

  // Сокращение транскрипции
  const truncateTranscription = (text: string | undefined, maxLength = 15) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5" />
            Изучаемые слова ({totalCount} активных)
          </h2>
        </div>
        
        {/* Фильтры */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          {/* Поиск */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Поиск по слову или переводу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Фильтр по тегам */}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableTags.slice(0, 5).map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTags === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTagChange(tag)}
                  className="flex items-center gap-1"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag}
                </Button>
              ))}
              {selectedTags && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTagChange('')}
                  className="text-gray-500"
                >
                  Сбросить
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search || selectedTags ? 'Ничего не найдено' : 'Пока нет активных слов'}
            </h3>
            <p className="text-gray-500">
              {search || selectedTags 
                ? 'Попробуйте изменить критерии поиска'
                : `${friendUsername} пока не добавил слова для изучения`
              }
            </p>
          </div>
        ) : (
          <>
            {/* Таблица слов */}
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Слово
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Перевод
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">
                      Транскрипция
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm w-16">
                      
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((word, index) => (
                    <motion.tr
                      key={word.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {word.word}
                          </span>
                          {word.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {word.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                              {word.tags.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{word.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {word.translation}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {word.transcription ? (
                          <span className="font-mono">
                            [{truncateTranscription(word.transcription)}]
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {copiedWords.has(word.id) ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyWord(word)}
                            disabled={copying === word.id}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            {copying === word.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                            ) : (
                              <PlusCircleIcon className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Показано {words.length} из {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-700">
                    {currentPage} из {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};