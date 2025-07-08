// frontend/components/ui/CloudStreak.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CloudStreakProps {
  days: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const CloudStreak: React.FC<CloudStreakProps> = ({ 
  days, 
  size = 'md',
  className = '' 
}) => {
  // Определяем стиль облачка в зависимости от количества дней
  const getCloudConfig = (days: number) => {
    if (days >= 21) return {
      type: 'golden',
      colors: {
        primary: '#FFD700',
        secondary: '#FFA500',
        accent: '#FFFF00',
        glow: '#FFD700'
      },
      sparkles: true,
      pulseSpeed: 2,
      label: 'Золотое облачко'
    };
    
    if (days >= 11) return {
      type: 'green',
      colors: {
        primary: '#10B981',
        secondary: '#34D399',
        accent: '#6EE7B7',
        glow: '#10B981'
      },
      sparkles: true,
      pulseSpeed: 3,
      label: 'Большое облачко'
    };
    
    if (days >= 6) return {
      type: 'blue',
      colors: {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        accent: '#93C5FD',
        glow: '#3B82F6'
      },
      sparkles: false,
      pulseSpeed: 4,
      label: 'Среднее облачко'
    };
    
    if (days >= 1) return {
      type: 'gray',
      colors: {
        primary: '#9CA3AF',
        secondary: '#D1D5DB',
        accent: '#F3F4F6',
        glow: '#9CA3AF'
      },
      sparkles: false,
      pulseSpeed: 5,
      label: 'Маленькое облачко'
    };
    
    return {
      type: 'empty',
      colors: {
        primary: '#E5E7EB',
        secondary: '#F3F4F6',
        accent: '#F9FAFB',
        glow: '#E5E7EB'
      },
      sparkles: false,
      pulseSpeed: 0,
      label: 'Нет активности'
    };
  };

  const config = getCloudConfig(days);
  
  // Обновленные размеры с добавлением xs
  const sizes = {
    xs: { width: 28, height: 28, fontSize: '10px' },
    sm: { width: 60, height: 60, fontSize: '12px' },
    md: { width: 90, height: 90, fontSize: '14px' },
    lg: { width: 120, height: 120, fontSize: '16px' }
  };
  
  const { width, height, fontSize } = sizes[size];

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Основное облачко с числом */}
      <motion.div
        className="relative"
        animate={config.pulseSpeed > 0 ? {
          scale: [1, 1.05, 1],
          filter: [`brightness(1)`, `brightness(1.1)`, `brightness(1)`]
        } : {}}
        transition={{
          duration: config.pulseSpeed,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox="0 0 120 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Градиенты */}
          <defs>
            <radialGradient id={`cloudGradient-${config.type}-${size}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={config.colors.accent} />
              <stop offset="50%" stopColor={config.colors.secondary} />
              <stop offset="100%" stopColor={config.colors.primary} />
            </radialGradient>
            
            <filter id={`glow-${config.type}-${size}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Основная форма облачка */}
          <motion.path
            d="M25,55 C15,55 8,47 8,37 C8,27 15,20 25,20 C28,12 36,6 46,6 C56,6 64,12 67,20 C77,20 84,27 84,37 C84,47 77,55 67,55 Z"
            fill={`url(#cloudGradient-${config.type}-${size})`}
            filter={`url(#glow-${config.type}-${size})`}
          />

          {/* Счетчик дней в центре облачка для всех размеров */}
          <text
            x="46"
            y="34"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size === 'xs' ? '12' : '16'}
            fontWeight="bold"
            fill="white"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {days}
          </text>
        </svg>
      </motion.div>

      {/* Подпись (скрыта для размера xs) */}
      {size !== 'xs' && (
        <motion.div
          className="mt-2 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div 
            className="font-bold text-gray-800"
            style={{ fontSize }}
          >
            {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {config.label}
          </div>
        </motion.div>
      )}
    </div>
  );
};