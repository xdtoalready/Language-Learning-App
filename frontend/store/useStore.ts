// store/useStore.ts

import { create } from 'zustand';
import { User, Word, UserStats, WordStats } from '@/types/api';
import apiClient from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface WordsState {
  words: Word[];
  dueWords: Word[];
  currentWord: Word | null;
  wordsStats: WordStats | null;
  isLoadingWords: boolean;
}

interface StatsState {
  userStats: UserStats | null;
  isLoadingStats: boolean;
}

interface ReviewState {
  isReviewSession: boolean;
  currentReviewWord: Word | null;
  hasMoreWords: boolean;
  remainingWords: number;
}

interface AppStore extends AuthState, WordsState, StatsState, ReviewState {
  // Auth actions
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, learningLanguage: string) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  initializeAuth: () => void;
  
  // Words actions
  loadWords: (params?: any) => Promise<void>;
  loadDueWords: () => Promise<void>;
  createWord: (wordData: any) => Promise<void>;
  updateWord: (id: string, wordData: any) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  loadWordsStats: () => Promise<void>;
  
  // Review actions
  startReviewSession: () => Promise<void>;
  submitReview: (wordId: string, rating: number) => Promise<void>;
  endReviewSession: () => void;
  
  // Stats actions
  loadUserStats: () => Promise<void>;
  updateDailyGoal: (goal: number) => Promise<void>;
  
  // UI actions
  setLoading: (type: 'auth' | 'words' | 'stats', value: boolean) => void;
}

// Функция для проверки наличия валидного токена
const hasValidToken = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('auth_token');
  if (!token) return false;
  
  try {
    // Простая проверка структуры JWT
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Проверяем что токен не просроченный
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    if (payload.exp && payload.exp < now) {
      // Токен просрочен, удаляем его
      localStorage.removeItem('auth_token');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Invalid token format:', error);
    localStorage.removeItem('auth_token');
    return false;
  }
};

export const useStore = create<AppStore>((set, get) => ({
  // Initial state - ИСПРАВЛЕНО: проверяем токен при инициализации
  user: null,
  isAuthenticated: hasValidToken(), // 🔥 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ!
  isLoading: false,
  words: [],
  dueWords: [],
  currentWord: null,
  wordsStats: null,
  isLoadingWords: false,
  userStats: null,
  isLoadingStats: false,
  isReviewSession: false,
  currentReviewWord: null,
  hasMoreWords: false,
  remainingWords: 0,

  // Инициализация аутентификации
  initializeAuth: () => {
    console.log('🔄 Инициализация аутентификации...');
    const hasToken = hasValidToken();
    console.log('🔑 Проверка токена:', hasToken ? 'валидный' : 'отсутствует/невалидный');
    
    set({ isAuthenticated: hasToken });
    
    // Если токен есть, но пользователя нет - загружаем профиль
    if (hasToken && !get().user) {
      console.log('📱 Загружаем профиль пользователя...');
      get().loadProfile().catch((error) => {
        console.error('❌ Ошибка загрузки профиля:', error);
        get().logout();
      });
    }
  },

  // Auth actions
  login: async (emailOrUsername: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log('🔑 Пытаемся войти:', { emailOrUsername, password: '***' });
      
      const response = await apiClient.login({ emailOrUsername, password });
      
      console.log('✅ Успешный вход:', response);
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, username: string, password: string, learningLanguage: string) => {
    set({ isLoading: true });
    try {
      console.log('📝 Пытаемся зарегистрироваться:', { 
        email, 
        username, 
        password: '***', 
        learningLanguage 
      });
      
      const response = await apiClient.register({ 
        email, 
        username, 
        password, 
        learningLanguage 
      });
      
      console.log('✅ Успешная регистрация:', response);
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      console.error('❌ Ошибка регистрации:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    console.log('🚪 Выход из аккаунта');
    apiClient.logout();
    set({
      user: null,
      isAuthenticated: false,
      words: [],
      dueWords: [],
      userStats: null,
      wordsStats: null,
      isReviewSession: false,
      currentReviewWord: null
    });
  },

  loadProfile: async () => {
    try {
      console.log('👤 Загружаем профиль пользователя...');
      const response = await apiClient.getProfile();
      console.log('✅ Профиль загружен:', response.user);
      
      set({ 
        user: response.user,
        isAuthenticated: true 
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки профиля:', error);
      // Если токен невалидный, разлогиниваем
      get().logout();
      throw error;
    }
  },

  // Остальные методы остаются без изменений...
  loadWords: async (params?: any) => {
    set({ isLoadingWords: true });
    try {
      const response = await apiClient.getWords(params);
      set({ words: response.words, isLoadingWords: false });
    } catch (error) {
      console.error('Failed to load words:', error);
      set({ isLoadingWords: false });
      throw error;
    }
  },

  loadDueWords: async () => {
    try {
      console.log('📚 Загружаем слова для повторения...');
      const response = await apiClient.getDueWords();
      console.log('✅ Слова для повторения загружены:', response);
      set({ dueWords: response.words });
    } catch (error) {
      console.error('Failed to load due words:', error);
      throw error;
    }
  },

  createWord: async (wordData: any) => {
    try {
      const response = await apiClient.createWord(wordData);
      // Обновляем список слов
      await get().loadWords();
      await get().loadWordsStats();
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateWord: async (id: string, wordData: any) => {
    try {
      const response = await apiClient.updateWord(id, wordData);
      await get().loadWords();
      return response;
    } catch (error) {
      throw error;
    }
  },

  deleteWord: async (id: string) => {
    try {
      await apiClient.deleteWord(id);
      await get().loadWords();
      await get().loadWordsStats();
    } catch (error) {
      throw error;
    }
  },

  loadWordsStats: async () => {
    try {
      console.log('📊 Загружаем статистику слов...');
      const response = await apiClient.getWordsStats();
      console.log('✅ Статистика слов загружена:', response);
      set({ wordsStats: response.stats || response });
    } catch (error) {
      console.error('Failed to load words stats:', error);
      throw error;
    }
  },

  // Review actions
  startReviewSession: async () => {
    try {
      const response = await apiClient.startReviewSession();
      set({
        isReviewSession: true,
        currentReviewWord: response.word,
        hasMoreWords: response.hasMoreWords,
        remainingWords: response.remainingWords
      });
    } catch (error) {
      throw error;
    }
  },

  submitReview: async (wordId: string, rating: number) => {
    try {
      const response = await apiClient.submitReview({ wordId, rating });
      
      if (response.nextWord) {
        set({
          currentReviewWord: response.nextWord,
          hasMoreWords: response.hasMoreWords,
          remainingWords: response.remainingWords
        });
      } else {
        set({
          isReviewSession: false,
          currentReviewWord: null,
          hasMoreWords: false,
          remainingWords: 0
        });
      }
      
      // Обновляем пользователя и статистику
      await get().loadProfile();
      await get().loadUserStats();
    } catch (error) {
      throw error;
    }
  },

  endReviewSession: () => {
    set({
      isReviewSession: false,
      currentReviewWord: null,
      hasMoreWords: false,
      remainingWords: 0
    });
  },

  // Stats actions
  loadUserStats: async () => {
    set({ isLoadingStats: true });
    try {
      console.log('📈 Загружаем статистику пользователя...');
      const response = await apiClient.getUserStats();
      console.log('✅ Статистика пользователя загружена:', response);
      set({ userStats: response, isLoadingStats: false });
    } catch (error) {
      console.error('Failed to load user stats:', error);
      set({ isLoadingStats: false });
      throw error;
    }
  },

  updateDailyGoal: async (goal: number) => {
    try {
      await apiClient.updateDailyGoal(goal);
      // Обновляем пользователя и статистику
      await get().loadProfile();
      await get().loadUserStats();
    } catch (error) {
      throw error;
    }
  },

  // UI actions
  setLoading: (type: 'auth' | 'words' | 'stats', value: boolean) => {
    switch (type) {
      case 'auth':
        set({ isLoading: value });
        break;
      case 'words':
        set({ isLoadingWords: value });
        break;
      case 'stats':
        set({ isLoadingStats: value });
        break;
    }
  },
}));

// Хуки для удобного доступа к частям стора
export const useAuth = () => useStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  login: state.login,
  register: state.register,
  logout: state.logout,
  loadProfile: state.loadProfile,
  initializeAuth: state.initializeAuth
}));

export const useWords = () => useStore((state) => ({
  words: state.words,
  dueWords: state.dueWords,
  wordsStats: state.wordsStats,
  isLoadingWords: state.isLoadingWords,
  loadWords: state.loadWords,
  loadDueWords: state.loadDueWords,
  createWord: state.createWord,
  updateWord: state.updateWord,
  deleteWord: state.deleteWord,
  loadWordsStats: state.loadWordsStats
}));

export const useReview = () => useStore((state) => ({
  isReviewSession: state.isReviewSession,
  currentReviewWord: state.currentReviewWord,
  hasMoreWords: state.hasMoreWords,
  remainingWords: state.remainingWords,
  startReviewSession: state.startReviewSession,
  submitReview: state.submitReview,
  endReviewSession: state.endReviewSession
}));

export const useStats = () => useStore((state) => ({
  userStats: state.userStats,
  isLoadingStats: state.isLoadingStats,
  loadUserStats: state.loadUserStats,
  updateDailyGoal: state.updateDailyGoal
}));