// store/useStore.ts

import { create } from 'zustand';
import { User, Word, UserStats, WordStats } from '@/types/api';
import apiClient from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, learningLanguage: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  updateProfile: (updates: Partial<{
    username: string;
    learningLanguage: string;
    dailyGoal: number;
    avatar: string;
  }>) => Promise<void>;
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
  initializeAuth: () => Promise<void>;
  updateProfile: (updates: { username?: string; learningLanguage?: string; dailyGoal?: number; avatar?: string; }) => Promise<void>;
  
  
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
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
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

  // 🔥 УПРОЩЕННАЯ инициализация аутентификации
  initializeAuth: async () => {
    const state = get();
    
    // Предотвращаем множественные инициализации
    if (state.isInitialized) {
      console.log('🛑 Store уже инициализирован, пропускаем');
      return;
    }

    console.log('🔄 Инициализация аутентификации...');
    set({ isLoading: true });
    
    try {
      const hasToken = hasValidToken();
      console.log('🔑 Проверка токена:', hasToken ? 'валидный' : 'отсутствует/невалидный');
      
      if (!hasToken) {
        // Нет валидного токена
        console.log('❌ Нет токена, устанавливаем не авторизован');
        set({ 
          isAuthenticated: false, 
          user: null, 
          isLoading: false,
          isInitialized: true 
        });
        return;
      }

      // Есть токен, пробуем загрузить профиль
      console.log('📱 Есть токен, загружаем профиль...');
      
      try {
        const response = await apiClient.getProfile();
        console.log('✅ Профиль загружен успешно:', response.user.email);
        
        set({ 
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true
        });
      } catch (profileError) {
        console.error('❌ Ошибка загрузки профиля:', profileError);
        // Токен невалидный или истек
        localStorage.removeItem('auth_token');
        set({ 
          isAuthenticated: false, 
          user: null, 
          isLoading: false,
          isInitialized: true 
        });
      }
    } catch (error) {
      console.error('💥 Ошибка инициализации:', error);
      set({ 
        isAuthenticated: false, 
        user: null, 
        isLoading: false,
        isInitialized: true 
      });
    }
  },

  // Auth actions
  login: async (emailOrUsername: string, password: string) => {
    set({ isLoading: true });
    try {
      console.log('🔑 Попытка входа:', { emailOrUsername });
      
      const response = await apiClient.login({ emailOrUsername, password });
      
      console.log('✅ Успешный вход:', response.user.email);
      
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
      console.log('📝 Попытка регистрации:', { email, username, learningLanguage });
      
      const response = await apiClient.register({ 
        email, 
        username, 
        password, 
        learningLanguage 
      });
      
      console.log('✅ Успешная регистрация:', response.user.email);
      
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
      isInitialized: false, // Сброс для возможности повторной инициализации
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
      console.log('✅ Профиль загружен:', response.user.email);
      
      set({ 
        user: response.user,
        isAuthenticated: true 
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки профиля:', error);
      get().logout();
      throw error;
    }
  },

   updateProfile: async (updates: { username?: string; learningLanguage?: string; dailyGoal?: number; avatar?: string; }) => {
    const { isAuthenticated } = get();
    
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    set({ isLoading: true });

    try {
      console.log('🔄 Обновляем профиль:', updates);
      
      const response = await apiClient.updateProfile(updates);
      
      set({ 
        user: response.user,
        isLoading: false 
      });
      
      console.log('✅ Профиль обновлен:', response.user);
    } catch (error) {
      set({ isLoading: false });
      console.error('❌ Ошибка обновления профиля:', error);
      throw error;
    }
  },

  // Words actions
  loadWords: async (params?: any) => {
    // Предотвращаем множественные одновременные запросы
    if (get().isLoadingWords) {
      console.log('⏸️ Загрузка уже в процессе, пропускаем запрос');
      return;
    }

    set({ isLoadingWords: true });
    try {
      console.log('📚 Загружаем слова с параметрами:', params);
      const response = await apiClient.getWords(params);
      console.log('✅ Слова загружены:', response.words.length);
      set({ 
        words: response.words,
        isLoadingWords: false 
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки слов:', error);
      set({ isLoadingWords: false });
      throw error;
    }
  },

  loadDueWords: async () => {
    // Предотвращаем множественные одновременные запросы
    if (get().isLoadingWords) {
      console.log('⏸️ Загрузка уже в процессе, пропускаем запрос due words');
      return;
    }

    set({ isLoadingWords: true });
    try {
      console.log('📅 Загружаем слова к повторению...');
      const response = await apiClient.getDueWords();
      console.log('✅ Слова к повторению загружены:', response.words.length);
      set({ 
        dueWords: response.words,
        isLoadingWords: false 
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки слов к повторению:', error);
      set({ isLoadingWords: false });
      throw error;
    }
  },

  createWord: async (wordData: any) => {
    try {
      const response = await apiClient.createWord(wordData);
      const currentWords = get().words;
      set({ 
        words: [...currentWords, response.word],
        currentWord: response.word 
      });
      
      // Обновляем статистику
      await get().loadWordsStats();
    } catch (error) {
      throw error;
    }
  },

  updateWord: async (id: string, wordData: any) => {
    try {
      const response = await apiClient.updateWord(id, wordData);
      const words = get().words.map(word => 
        word.id === id ? response.word : word
      );
      set({ words });
      
      // Обновляем статистику
      await get().loadWordsStats();
    } catch (error) {
      throw error;
    }
  },

  deleteWord: async (id: string) => {
    try {
      await apiClient.deleteWord(id);
      const words = get().words.filter(word => word.id !== id);
      set({ words });
      
      // Обновляем статистику
      await get().loadWordsStats();
    } catch (error) {
      throw error;
    }
  },

  loadWordsStats: async () => {
    try {
      console.log('📊 Загружаем статистику слов...');
      const response = await apiClient.getWordsStats();
      console.log('✅ Статистика слов загружена:', response.stats);
      set({ wordsStats: response.stats });
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики слов:', error);
      throw error;
    }
  },

  // Review actions
  startReviewSession: async () => {
    try {
      const response = await apiClient.startReview();
      set({
        isReviewSession: true,
        currentReviewWord: response.word || null,
        hasMoreWords: response.hasMore,
        remainingWords: response.remainingWords || 0
      });
    } catch (error) {
      throw error;
    }
  },

  submitReview: async (wordId: string, rating: number) => {
    try {
      const response = await apiClient.submitReview(wordId, rating);
      set({
        currentReviewWord: response.nextWord || null,
        hasMoreWords: response.hasMore,
        remainingWords: response.remainingWords || 0
      });
      
      // Обновляем статистику
      await get().loadWordsStats();
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
      const response = await apiClient.getUserStats();
      set({ 
        userStats: response.stats,
        isLoadingStats: false 
      });
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
  isInitialized: state.isInitialized,
  login: state.login,
  register: state.register,
  logout: state.logout,
  loadProfile: state.loadProfile,
  initializeAuth: state.initializeAuth,
  updateProfile: state.updateProfile
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