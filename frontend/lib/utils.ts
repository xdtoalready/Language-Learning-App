// lib/utils.ts

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Форматирование дат
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return `${diffDays} дн. назад`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед. назад`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} мес. назад`;
  return `${Math.floor(diffDays / 365)} лет назад`;
}

// Утилиты для слов
export function getMasteryLevelName(level: number): string {
  const levels = {
    0: 'Новое',
    1: 'Изучается',
    2: 'Знакомое',
    3: 'Знаю',
    4: 'Хорошо знаю',
    5: 'Выучено'
  };
  return levels[level as keyof typeof levels] || 'Неизвестно';
}

export function getMasteryLevelColor(level: number): string {
  const colors = {
    0: 'bg-gray-100 text-gray-800',
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-blue-100 text-blue-800',
    5: 'bg-green-100 text-green-800'
  };
  return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getNextReviewText(nextReviewDate: string): string {
  const date = new Date(nextReviewDate);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Готово к повторению';
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays < 7) return `Через ${diffDays} дн.`;
  if (diffDays < 30) return `Через ${Math.floor(diffDays / 7)} нед.`;
  return `Через ${Math.floor(diffDays / 30)} мес.`;
}

// Утилиты для рейтингов
export function getRatingText(rating: number): string {
  const ratings = {
    1: 'Забыл',
    2: 'С трудом',
    3: 'Хорошо',
    4: 'Отлично'
  };
  return ratings[rating as keyof typeof ratings] || 'Неизвестно';
}

export function getRatingColor(rating: number): string {
  const colors = {
    1: 'text-red-600',
    2: 'text-orange-600',
    3: 'text-blue-600',
    4: 'text-green-600'
  };
  return colors[rating as keyof typeof colors] || 'text-gray-600';
}

export function getRatingEmoji(rating: number): string {
  const emojis = {
    1: '😞',
    2: '😐',
    3: '😊',
    4: '🤩'
  };
  return emojis[rating as keyof typeof emojis] || '❓';
}

// Утилиты для прогресса
export function calculateProgress(current: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

// Утилиты для стриков
export function getStreakEmoji(streak: number): string {
  if (streak >= 30) return '🔥';
  if (streak >= 14) return '⚡';
  if (streak >= 7) return '✨';
  if (streak >= 3) return '⭐';
  return '💪';
}

export function getStreakText(streak: number): string {
  if (streak === 0) return 'Начните изучать!';
  if (streak === 1) return '1 день подряд';
  if (streak < 5) return `${streak} дня подряд`;
  return `${streak} дней подряд`;
}

// Утилиты для валидации
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// Утилиты для обработки ошибок
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Произошла неизвестная ошибка';
}

// Утилиты для поиска и фильтрации
export function highlightSearchText(text: string, search: string): string {
  if (!search) return text;
  
  const regex = new RegExp(`(${search})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Утилиты для локального хранения
export function getFromStorage(key: string): any {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function setToStorage(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Игнорируем ошибки записи
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch {
    // Игнорируем ошибки удаления
  }
}

// Утилиты для работы с тегами
export function parseTags(tagsString: string): string[] {
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

// Константы
export const LANGUAGES = {
  'English': '🇺🇸 Английский',
  'Korean': '🇰🇷 Корейский',
  'Chinese': '🇨🇳 Китайский',
  'Japanese': '🇯🇵 Японский',
  'German': '🇩🇪 Немецкий',
  'French': '🇫🇷 Французский',
  'Spanish': '🇪🇸 Испанский',
  'Italian': '🇮🇹 Итальянский'
};

export const MASTERY_LEVELS = [
  { name: 'Новое', color: 'bg-gray-500' },
  { name: 'Изучается', color: 'bg-red-500' },
  { name: 'Знакомое', color: 'bg-orange-500' },
  { name: 'Знаю', color: 'bg-yellow-500' },
  { name: 'Хорошо знаю', color: 'bg-blue-500' },
  { name: 'Выучено', color: 'bg-green-500' }
];