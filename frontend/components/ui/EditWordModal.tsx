// components/ui/EditWordModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWords } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Word } from '@/types/api';

interface EditWordModalProps {
  word: Word | null;
  isOpen: boolean;
  onClose: () => void;
}

interface WordFormData {
  word: string;
  translation: string;
  transcription: string;
  example: string;
  tags: string[];
}

export const EditWordModal: React.FC<EditWordModalProps> = ({ 
  word, 
  isOpen, 
  onClose 
}) => {
  const [formData, setFormData] = useState<WordFormData>({
    word: '',
    translation: '',
    transcription: '',
    example: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateWord } = useWords();

  // Инициализация формы при изменении word
  useEffect(() => {
    if (word) {
      setFormData({
        word: word.word || '',
        translation: word.translation || '',
        transcription: word.transcription || '',
        example: word.example || '',
        tags: word.tags || []
      });
    }
  }, [word]);

  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      setTagInput('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Обработчик добавления тега при клике на готовый тег
  const handlePredefinedTagClick = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  // Обработчик добавления тега через клавиатуру
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
        setTagInput('');
      }
    }
  };

  // Обработчик удаления тега
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!word?.id) return;
    
    if (!formData.word.trim() || !formData.translation.trim()) {
      toast.error('Слово и перевод обязательны для заполнения');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateWord(word.id, {
        word: formData.word.trim(),
        translation: formData.translation.trim(),
        transcription: formData.transcription.trim() || undefined,
        example: formData.example.trim() || undefined,
        tags: formData.tags
      });

      toast.success('Слово успешно обновлено!');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при обновлении слова');
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

  if (!word) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать слово"
      size="lg"
    >
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
        </div>

        {/* Теги */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Теги
          </label>
          
          {/* Существующие теги */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge
                  key={`current-tag-${index}-${tag}`}
                  variant="primary"
                  className="bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Поле для добавления новых тегов */}
          <Input
            placeholder="Добавить тег (Enter или запятая для добавления)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            helperText="Введите тег и нажмите Enter или запятую"
          />

          {/* Предустановленные теги */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Популярные теги:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedTags.map((tag) => (
                <Badge
                  key={`predefined-${tag}`}
                  variant={formData.tags.includes(tag) ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePredefinedTagClick(tag);
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
        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!formData.word.trim() || !formData.translation.trim() || isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Сохранить изменения
          </Button>
        </div>
      </form>
    </Modal>
  );
};