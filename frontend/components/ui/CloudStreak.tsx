// frontend/components/ui/CloudStreak.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CloudStreakProps {
  days: number;
  size?: 'sm' | 'md' | 'lg';
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
  
  // Размеры в зависимости от size
  const sizes = {
    sm: { width: 80, height: 60, fontSize: '12px' },
    md: { width: 120, height: 90, fontSize: '14px' },
    lg: { width: 160, height: 120, fontSize: '16px' }
  };
  
  const { width, height, fontSize } = sizes[size];

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Основное облачко */}
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
            <radialGradient id={`cloudGradient-${config.type}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={config.colors.accent} />
              <stop offset="50%" stopColor={config.colors.secondary} />
              <stop offset="100%" stopColor={config.colors.primary} />
            </radialGradient>
            
            <filter id={`glow-${config.type}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {config.sparkles && (
              <filter id={`sparkle-${config.type}`}>
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>

          {/* Тень облачка */}
          <ellipse 
            cx="60" 
            cy="85" 
            rx="35" 
            ry="8" 
            fill="rgba(0,0,0,0.1)"
          />

          {/* Основная форма облачка */}
          <motion.path
            d="M25,55 C15,55 8,47 8,37 C8,27 15,20 25,20 C28,12 36,6 46,6 C56,6 64,12 67,20 C77,20 84,27 84,37 C84,47 77,55 67,55 Z"
            fill={`url(#cloudGradient-${config.type})`}
            filter={`url(#glow-${config.type})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          {/* Дополнительные облачные "бугорки" */}
          <motion.circle
            cx="30"
            cy="45"
            r="12"
            fill={config.colors.secondary}
            opacity="0.7"
            animate={config.pulseSpeed > 0 ? {
              scale: [1, 1.1, 1],
              opacity: [0.7, 0.9, 0.7]
            } : {}}
            transition={{
              duration: config.pulseSpeed * 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
          
          <motion.circle
            cx="62"
            cy="45"
            r="10"
            fill={config.colors.secondary}
            opacity="0.6"
            animate={config.pulseSpeed > 0 ? {
              scale: [1, 1.15, 1],
              opacity: [0.6, 0.8, 0.6]
            } : {}}
            transition={{
              duration: config.pulseSpeed * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />

          {/* Блестки для продвинутых облачков */}
          {config.sparkles && (
            <>
              <motion.circle
                cx="20"
                cy="30"
                r="2"
                fill={config.colors.accent}
                filter={`url(#sparkle-${config.type})`}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0
                }}
              />
              
              <motion.circle
                cx="75"
                cy="25"
                r="1.5"
                fill={config.colors.accent}
                filter={`url(#sparkle-${config.type})`}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8
                }}
              />
              
              <motion.circle
                cx="50"
                cy="20"
                r="1"
                fill={config.colors.accent}
                filter={`url(#sparkle-${config.type})`}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5
                }}
              />
            </>
          )}

          {/* Счетчик дней в центре облачка */}
          <text
            x="46"
            y="45"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="16"
            fontWeight="bold"
            fill="white"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {days}
          </text>
        </svg>

        {/* Частицы для золотого облачка */}
        {config.type === 'golden' && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 20}%`,
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.3, 1, 0.3],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* Подпись */}
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
    </div>
  );
};