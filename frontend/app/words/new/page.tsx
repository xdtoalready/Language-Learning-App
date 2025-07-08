// app/words/new/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  BookOpenIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useWords } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { parseTags } from '@/lib/utils';

interface WordFormData {
  word: string;
  translation: string;
  transcription: string;
  example: string;
  tags: string[];
}

export default function NewWordPage() {
  const [formData, setFormData] = useState<WordFormData>({
    word: '',
    translation: '',
    transcription: '',
    example: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createWord } = useWords();
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, newTag]
        });
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.word.trim() || !formData.translation.trim()) {
      toast.error('Слово и перевод обязательны для заполнения');
      return;
    }

    setIsSubmitting(true);
    try {
      await createWord({
        word: formData.word.trim(),
        translation: formData.translation.trim(),
        transcription: formData.transcription.trim() || undefined,
        example: formData.example.trim() || undefined,
        tags: formData.tags
      });

      toast.success('Слово успешно добавлено!');
      router.push('/words');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при добавлении слова');
    } finally {
      setIsSubmitting(false);
    }
  };

  const predefinedTags = [
    'глагол', 'существительное', 'прилагательное', 'наречие',
    'фразовый глагол', 'идиома', 'сленг', 'формальное',
    'неформальное', 'повседневное', 'из книги', 'из фильма',
    'работа', 'семья', 'еда', 'путешествия', 'хобби'
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Назад
            </Button>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <PlusIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Добавить новое слово
            </h1>
            <p className="text-gray-600">
              Заполните информацию о новом слове для изучения
            </p>
          </motion.div>
        </div>

        {/* Форма */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <BookOpenIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Информация о слове
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Основные поля */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    name="word"
                    label="Слово *"
                    placeholder="Введите слово"
                    value={formData.word}
                    onChange={handleInputChange}
                    required
                    className="text-lg font-medium"
                  />
                  
                  <Input
                    name="translation"
                    label="Перевод *"
                    placeholder="Введите перевод"
                    value={formData.translation}
                    onChange={handleInputChange}
                    required
                    className="text-lg"
                  />
                </div>

                <Input
                  name="transcription"
                  label="Транскрипция"
                  placeholder="[произношение]"
                  value={formData.transcription}
                  onChange={handleInputChange}
                  helperText="Опционально: укажите произношение"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Пример использования
                  </label>
                  <textarea
                    name="example"
                    placeholder="Введите пример предложения с этим словом"
                    value={formData.example}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Опционально: добавьте пример предложения для лучшего запоминания
                  </p>
                </div>

                {/* Теги */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Теги
                  </label>
                  
                  {/* Добавленные теги */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="default"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Поле ввода тега */}
                  <Input
                    placeholder="Введите тег и нажмите Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    helperText="Используйте теги для категоризации слов (например: глагол, формальное, из книги)"
                  />

                  {/* Предустановленные теги */}
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Популярные теги:</p>
                    <div className="flex flex-wrap gap-2">
                      {predefinedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={formData.tags.includes(tag) ? 'default' : 'secondary'}
                          className="cursor-pointer hover:bg-blue-100"
                          onClick={() => {
                            if (!formData.tags.includes(tag)) {
                              setFormData({
                                ...formData,
                                tags: [...formData.tags, tag]
                              });
                            }
                          }}
                        >
                          {formData.tags.includes(tag) ? '✓ ' : '+ '}
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Кнопки */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={!formData.word.trim() || !formData.translation.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Добавить слово
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="sm:w-auto"
                    size="lg"
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Подсказки */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            💡 Советы по добавлению слов:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Добавляйте транскрипцию для правильного произношения</li>
            <li>• Используйте примеры из контекста, где встретили слово</li>
            <li>• Группируйте слова по темам с помощью тегов</li>
            <li>• Добавляйте только те слова, которые действительно хотите выучить</li>
          </ul>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}