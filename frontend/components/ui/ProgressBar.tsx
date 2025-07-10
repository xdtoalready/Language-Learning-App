// components/ui/ProgressBar.tsx - ИСПРАВЛЕНИЯ

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showText?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  showSessionProgress?: boolean;
  currentSession?: {
    totalWords: number;
    sessionId: string;
  } | null;
  remainingWords?: number;
  reviewMode?: string;
  currentRound?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  showText = false,
  color = 'blue',
  // Новые пропсы:
  showSessionProgress = false,
  currentSession,
  remainingWords = 0,
  reviewMode,
  currentRound = 1
}) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500', 
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  //  Улучшенная логика для отображения прогресса сессии
  if (showSessionProgress && currentSession) {
    const totalWords = currentSession.totalWords || 0;
    
    //  Правильный расчет завершенных слов
    const completedWords = Math.max(0, totalWords - remainingWords);
    
    //  Защита от деления на ноль
    const progressPercentage = totalWords > 0 
      ? Math.min(100, Math.max(0, Math.round((completedWords / totalWords) * 100)))
      : 0;

    return (
      <div className={cn('w-full')}>
        {/* Информация о раунде для TRANSLATION_INPUT */}
        {reviewMode === 'TRANSLATION_INPUT' && totalWords > 0 && (
          <div className="text-center text-sm text-gray-500 mb-2">
            Раунд {currentRound}/2
          </div>
        )}
        
        {/* Показываем прогресс только если есть слова */}
        {totalWords > 0 ? (
          <>
            {/* Текст прогресса */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{completedWords} из {totalWords}</span>
              <span>{progressPercentage}%</span>
            </div>
            
            {/* Прогресс-бар */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn('h-2 rounded-full transition-all duration-300', colors[color])}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </>
        ) : (
          // Для пустых сессий показываем соответствующий индикатор
          <>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Нет слов для отображения</span>
              <span>-</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn('h-2 rounded-full transition-all duration-300', 'bg-gray-400')}
                style={{ width: '0%' }}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Стандартный режим
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        {showText && (
          <span className="text-sm font-medium text-gray-700">
            {value} / {max}
          </span>
        )}
        {showText && (
          <span className="text-sm font-medium text-gray-500">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={cn('h-2 rounded-full transition-all duration-300', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};