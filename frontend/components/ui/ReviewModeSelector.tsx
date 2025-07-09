'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  EyeIcon,
  PencilIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ReviewMode } from '@/types/api';

interface ReviewModeOption {
  id: ReviewMode;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
  isAvailable: boolean;
}

const REVIEW_MODES: ReviewModeOption[] = [
  {
    id: 'RECOGNITION',
    name: 'Узнавание',
    description: 'Увидеть слово → вспомнить перевод → оценить себя',
    icon: EyeIcon,
    color: 'bg-blue-100 border-blue-300 hover:bg-blue-200',
    isAvailable: true
  },
  {
    id: 'TRANSLATION_INPUT',
    name: 'Ввод перевода',
    description: 'Увидеть слово → напечатать перевод → автооценка',
    icon: PencilIcon,
    color: 'bg-green-100 border-green-300 hover:bg-green-200',
    badge: 'Новое',
    isAvailable: true
  },
  {
    id: 'REVERSE_INPUT',
    name: 'Обратный ввод',
    description: 'Увидеть перевод → напечатать слово → автооценка',
    icon: ArrowsRightLeftIcon,
    color: 'bg-purple-100 border-purple-300 hover:bg-purple-200',
    badge: 'Новое',
    isAvailable: true
  },
  {
    id: 'MIXED',
    name: 'Смешанный',
    description: 'Случайное чередование разных режимов',
    icon: SparklesIcon,
    color: 'bg-gray-100 border-gray-300',
    badge: 'Скоро',
    isAvailable: false
  }
];

interface ReviewModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: 'daily' | 'training';
  title?: string;
}

export function ReviewModeSelector({ 
  isOpen, 
  onClose, 
  sessionType,
  title 
}: ReviewModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<ReviewMode | null>(null);
  const router = useRouter();

const handleModeSelect = (mode: ReviewMode) => {
    console.log('Clicked mode:', mode);
    if (!REVIEW_MODES.find(m => m.id === mode)?.isAvailable) {
      console.log('Mode is not available, returning.');
      return;
    }
    setSelectedMode(mode);
    console.log('Selected mode updated to:', mode);
  };

  const handleStart = () => {
    if (!selectedMode) return;
    
    // Переходим на страницу review с параметрами
    const params = new URLSearchParams({
      sessionType,
      mode: selectedMode
    });
    
    router.push(`/review?${params.toString()}`);
    onClose();
  };

  const getSessionTypeTitle = () => {
    return sessionType === 'daily' 
      ? 'Выберите режим повторения' 
      : 'Выберите режим тренировки';
  };

  const getSessionTypeDescription = () => {
    return sessionType === 'daily'
      ? 'Влияет на алгоритм интервального повторения'
      : 'Тренировка без влияния на алгоритм';
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={title || getSessionTypeTitle()}
      size="lg"
    >
      <div className="space-y-6">
        {/* Описание типа сессии */}
        <div className="text-center">
          <Badge variant={sessionType === 'daily' ? 'default' : 'secondary'}>
            {sessionType === 'daily' ? 'Ежедневная сессия' : 'Тренировочный полигон'}
          </Badge>
          <p className="text-sm text-gray-600 mt-2">
            {getSessionTypeDescription()}
          </p>
        </div>

        {/* Сетка режимов */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REVIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            const isDisabled = !mode.isAvailable;
            
            return (
            <motion.div
                key={mode.id}
                whileHover={mode.isAvailable ? { scale: 1.02 } : {}}
                whileTap={mode.isAvailable ? { scale: 0.98 } : {}}
            >
                {/* ОБЕРТКА */}
                <div
                className={`
                    cursor-pointer transition-all duration-200 relative
                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => {
                    console.log('🖱️ Wrapper click for:', mode.id);
                    handleModeSelect(mode.id);
                }}
                >
                <Card 
                    className={`
                    transition-all duration-200 relative
                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : mode.color}
                    `}
                >
                    <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                        <div className={`
                        p-2 rounded-lg shrink-0
                        ${isSelected ? 'bg-blue-500 text-white' : 'bg-white'}
                        `}>
                        <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">
                            {mode.name}
                            </h3>
                            {mode.badge && (
                            <Badge 
                                variant={mode.badge === 'Новое' ? 'default' : 'secondary'}
                                className="text-xs"
                            >
                                {mode.badge}
                            </Badge>
                            )}
                        </div>
                        
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {mode.description}
                        </p>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                </div>
            </motion.div>
            );
        })}
        </div>

        {/* Кнопки действий */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Отмена
          </Button>
          
          <Button
            onClick={handleStart}
            disabled={!selectedMode}
            className="min-w-[120px]"
          >
            {selectedMode ? 'Начать' : 'Выберите режим'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}