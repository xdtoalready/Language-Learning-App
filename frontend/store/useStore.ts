// store/useStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, learningLanguage: string) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  
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

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
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

      // Auth actions
      login: async (emailOrUsername: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.login({ emailOrUsername, password });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, username: string, password: string, learningLanguage: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.register({ email, username, password, learningLanguage });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
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
          const response = await apiClient.getProfile();
          set({ user: response.user });
        } catch (error) {
          // Если токен невалидный, разлогиниваем
          get().logout();
          throw error;
        }
      },

      // Words actions
      loadWords: async (params?: any) => {
        set({ isLoadingWords: true });
        try {
          const response = await apiClient.getWords(params);
          set({ 
            words: response.words, 
            isLoadingWords: false 
          });
        } catch (error) {
          set({ isLoadingWords: false });
          throw error;
        }
      },

      loadDueWords: async () => {
        try {
          const response = await apiClient.getDueWords();
          set({ dueWords: response.words });
        } catch (error) {
          console.error('Failed to load due words:', error);
        }
      },

      createWord: async (wordData: any) => {
        try {
          await apiClient.createWord(wordData);
          // Обновляем список слов после создания
          await get().loadWords();
          await get().loadWordsStats();
          await get().loadUserStats();
        } catch (error) {
          throw error;
        }
      },

      updateWord: async (id: string, wordData: any) => {
        try {
          await apiClient.updateWord(id, wordData);
          // Обновляем список слов после обновления
          await get().loadWords();
        } catch (error) {
          throw error;
        }
      },

      deleteWord: async (id: string) => {
        try {
          await apiClient.deleteWord(id);
          // Обновляем список слов после удаления
          await get().loadWords();
          await get().loadWordsStats();
          await get().loadUserStats();
        } catch (error) {
          throw error;
        }
      },

      loadWordsStats: async () => {
        try {
          const response = await apiClient.getWordsStats();
          set({ wordsStats: response.stats });
        } catch (error) {
          console.error('Failed to load words stats:', error);
        }
      },

      // Review actions
      startReviewSession: async () => {
        try {
          const response = await apiClient.startReviewSession();
          set({
            isReviewSession: true,
            currentReviewWord: response.word,
            hasMoreWords: response.hasMore,
            remainingWords: response.remaining || 0
          });
        } catch (error) {
          throw error;
        }
      },

      submitReview: async (wordId: string, rating: number) => {
        try {
          await apiClient.submitReview({ wordId, rating });
          
          // Получаем следующее слово
          const response = await apiClient.startReviewSession();
          set({
            currentReviewWord: response.word,
            hasMoreWords: response.hasMore,
            remainingWords: response.remaining || 0
          });

          // Обновляем статистику
          await get().loadUserStats();
          await get().loadWordsStats();
          await get().loadDueWords();
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
            userStats: response, 
            isLoadingStats: false 
          });
        } catch (error) {
          set({ isLoadingStats: false });
          console.error('Failed to load user stats:', error);
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
      }
    }),
    {
      name: 'language-learning-store',
      partialize: (state) => ({
        // Сохраняем в localStorage только критически важные данные
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Хуки для удобного доступа к частям стора
export const useAuth = () => useStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  login: state.login,
  register: state.register,
  logout: state.logout,
  loadProfile: state.loadProfile
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