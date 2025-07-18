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

interface AchievementsState {
  achievements: Achievement[];
  achievementProgress: AchievementProgress[];
  totalAchievementPoints: number;
  isLoadingAchievements: boolean;
  newAchievements: string[];
}

interface AchievementsActions {
  loadAchievements: () => Promise<void>;
  loadAchievementProgress: () => Promise<void>;
  markNewAchievementsAsSeen: () => void;
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

interface AppStore extends AuthState, WordsState, StatsState, ReviewState, AchievementsState, AchievementsActions {
  // Auth actions
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, learningLanguage: string) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateProfile: (updates: { username?: string; learningLanguage?: string; dailyGoal?: number; avatar?: string; }) => Promise<void>;
  
  // Friendship state
  friends: any[];
  pendingRequests: any[];
  isLoadingFriends: boolean;

  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;

  // Friendship actions
  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
  sendFriendRequest: (friendId: string) => Promise<void>;
  respondToFriendRequest: (friendshipId: string, action: 'accept' | 'reject') => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;

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
  currentSession: null,
  sessionType: 'daily',
  reviewMode: 'RECOGNITION',
  currentDirection: 'LEARNING_TO_NATIVE',
  hintsUsed: 0,
  currentRound: 1,
  friends: [],
  pendingRequests: [],
  isLoadingFriends: false,

  pagination: null,

  achievements: [],
  achievementProgress: [],
  totalAchievementPoints: 0,
  isLoadingAchievements: false,
  newAchievements: [],

  // Инициализация аутентификации
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

    loadAchievements: async () => {
    set({ isLoadingAchievements: true });
    try {
      const response = await apiClient.getUserAchievements();
      set({
        achievements: response.achievements,
        totalAchievementPoints: response.totalPoints,
        newAchievements: response.newAchievements,
        isLoadingAchievements: false
      });
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error);
      set({ isLoadingAchievements: false });
      throw error;
    }
  },

  loadAchievementProgress: async () => {
    try {
      const response = await apiClient.getAchievementProgress();
      set({ achievementProgress: response.progress });
    } catch (error) {
      console.error('Ошибка загрузки прогресса достижений:', error);
      throw error;
    }
  },

  markNewAchievementsAsSeen: () => {
    set({ newAchievements: [] });
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
      
      const response = await apiClient.register({ email, username, password, learningLanguage });
      
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
        pagination: response.pagination, // Добавляем pagination
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

createReviewSession: async (mode: ReviewMode, sessionType: 'daily' | 'training', filters?: any) => {
  try {
    console.log('🔄 Создание сессии ревью:', { mode, sessionType, filters });
    
    // ✅ ИСПРАВЛЕНИЕ: ПОЛНАЯ очистка состояния перед созданием новой сессии
    set({
      isReviewSession: false,
      currentSession: null,
      currentReviewWord: null,
      hasMoreWords: false,
      remainingWords: 0,
      hintsUsed: 0,
      currentRound: 1,
      reviewMode: undefined,
      currentDirection: 'LEARNING_TO_NATIVE',
      sessionType: undefined,
      isSessionCompleted: false,
      // ✅ НОВОЕ: Добавляем очистку дополнительных полей
      currentWord: null,
      // Добавляем небольшую задержку для полной очистки состояния
      ...Object.keys(get()).reduce((acc, key) => {
        if (key.includes('session') || key.includes('review') || key.includes('current')) {
          acc[key] = null;
        }
        return acc;
      }, {} as any)
    });
    
    console.log('🧹 Состояние полностью очищено перед созданием новой сессии');
    
    const response = await apiClient.createReviewSession({
      mode,
      sessionType,
      filterBy: filters
    });
    
    // Правильная обработка пустых сессий
    if (!response.session) {
      // Если нет сессии (нет слов для повторения), не выбрасываем ошибку
      console.log('ℹ️ Нет слов для повторения сегодня');
      
      set({
        isReviewSession: false,
        currentSession: null,
        currentReviewWord: null,
        hasMoreWords: false,
        remainingWords: 0,
        isSessionCompleted: true, // Показываем результат "нет слов"
        sessionType,
        reviewMode: mode
      });
      
      return {
        session: null,
        currentWord: null,
        hasMoreWords: false,
        remainingWords: 0,
        message: sessionType === 'daily' ? 'Нет слов для повторения сегодня' : 'Нет слов для тренировки'
      };
    }
    
    // Проверяем sessionId только если есть сессия
    if (!response.session.sessionId) {
      throw new Error('Некорректный ответ от сервера: отсутствует sessionId');
    }

    const sessionData = {
      currentSession: response.session,
      sessionType,
      reviewMode: mode,
      currentDirection: response.currentWord?.direction || 'LEARNING_TO_NATIVE',
      hintsUsed: 0,
      currentRound: response.session?.currentRound || 1,
      isReviewSession: true,
      currentReviewWord: response.currentWord,
      hasMoreWords: response.hasMoreWords ?? response.hasMore ?? false,
      remainingWords: response.remainingWords ?? response.remaining ?? 0,
      // ✅ ИСПРАВЛЕНИЕ: НЕ устанавливаем isSessionCompleted в true при создании
      isSessionCompleted: false
    };
    
    console.log('✅ Устанавливаем состояние сессии:', sessionData);
    set(sessionData);
    
    console.log('✅ Сессия создана:', {
      sessionId: response.session.sessionId,
      currentWord: response.currentWord?.word,
      remainingWords: sessionData.remainingWords,
      hasMoreWords: sessionData.hasMoreWords
    });
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка создания сессии:', error);
    
    // ✅ При ошибке очищаем состояние
    set({
      isReviewSession: false,
      currentSession: null,
      currentReviewWord: null,
      hasMoreWords: false,
      remainingWords: 0,
      isSessionCompleted: false
    });
    
    throw error;
  }
},


submitReviewInSession: async (data: {
  wordId: string;
  rating?: number;
  userInput?: string;
  hintsUsed?: number;
  timeSpent?: number;
  reviewMode?: ReviewMode;
  direction?: ReviewDirection;
}) => {
  try {
    const state = get();
    if (!state.currentSession) {
      throw new Error('Нет активной сессии');
    }
    
    console.log('📝 Отправка ревью в сессии:', {
      sessionId: state.currentSession.sessionId,
      wordId: data.wordId,
      userInput: data.userInput,
      reviewMode: data.reviewMode || state.reviewMode,
      direction: data.direction || state.currentDirection
    });
    
    const response = await apiClient.submitReviewInSession(state.currentSession.sessionId, {
      ...data,
      hintsUsed: data.hintsUsed || state.hintsUsed,
      reviewMode: data.reviewMode || state.reviewMode,
      direction: data.direction || state.currentDirection
    });
    
    console.log('🔄 Полный ответ от API:', response);
    
    // ✅ Проверяем валидность ответа
    if (!response || typeof response !== 'object') {
      throw new Error('Некорректный ответ от сервера');
    }

    const nextWord = response.currentWord;
    const hasMore = response.hasMoreWords ?? response.hasMore ?? false;
    const remaining = response.remainingWords ?? response.remaining ?? 0;
    const completed = response.completed ?? (!hasMore && !nextWord);
    
    console.log('📊 Обработанные данные:', {
      nextWord: nextWord?.word || 'null',
      hasMore,
      remaining,
      completed,
      currentRound: response.currentRound
    });
    
    const newState = {
    currentReviewWord: nextWord || null,
    hasMoreWords: hasMore,
    remainingWords: remaining,
    hintsUsed: 0,
    currentRound: response.currentRound || state.currentRound,
    currentDirection: nextWord?.direction || state.currentDirection,
    isSessionCompleted: completed || (!hasMore && !nextWord) || response.completed === true
    };

    console.log('🚩 Устанавливаем isSessionCompleted:', newState.isSessionCompleted);
    set(newState);
    
    console.log('✅ Ревью отправлено, следующее слово:', nextWord?.word || 'завершено');
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка отправки ревью:', error);
    
    // ✅ Если ошибка 404 - сессия не найдена, очищаем состояние
    if (error instanceof Error && error.message.includes('404')) {
      console.log('🔄 Сессия не найдена - очищаем состояние');
      set({
        isReviewSession: false,
        currentSession: null,
        currentReviewWord: null,
        hasMoreWords: false,
        remainingWords: 0,
        isSessionCompleted: false
      });
    }
    
    throw error;
  }
},

getHint: async (wordId: string, hintType: 'length' | 'first_letter') => {
  try {
    const state = get();
    
    // Валидация перед отправкой
    if (!wordId) {
      console.error('❌ Нет wordId для получения подсказки');
      throw new Error('Слово не выбрано');
    }
    
    if (!state.currentReviewWord) {
      console.error('❌ Нет текущего слова для подсказки');
      throw new Error('Нет активного слова');
    }
    
    // Проверяем, что wordId соответствует текущему слову
    if (state.currentReviewWord.id !== wordId) {
      console.error('❌ wordId не соответствует текущему слову', {
        requested: wordId,
        current: state.currentReviewWord.id
      });
      throw new Error('Неверный ID слова');
    }
    
    console.log('💡 Запрос подсказки:', {
      wordId,
      hintType,
      currentHintsUsed: state.hintsUsed,
      direction: state.currentDirection,
      currentWord: state.currentReviewWord.word
    });
    
    const response = await apiClient.getHint({
      wordId,
      hintType,
      currentHintsUsed: state.hintsUsed,
      direction: state.currentDirection
    });
    
    // Проверяем корректность ответа
    if (!response || !response.hint) {
      throw new Error('Некорректный ответ от сервера подсказок');
    }
    
    // Увеличиваем счетчик подсказок
    set({ hintsUsed: state.hintsUsed + 1 });
    
    console.log('✅ Подсказка получена:', response.hint);
    return response.hint;
  } catch (error) {
    console.error('❌ Ошибка получения подсказки:', error);
    throw error;
  }
},

getTrainingWords: async (filters?: {
  tags?: string[];
  masteryLevels?: number[];
  limit?: number;
}) => {
  try {
    console.log('🏋️ Загрузка тренировочных слов:', filters);
    
    const params: any = {};
    if (filters?.tags?.length) {
      params.tags = filters.tags.join(',');
    }
    if (filters?.masteryLevels?.length) {
      params.masteryLevel = filters.masteryLevels.join(',');
    }
    if (filters?.limit) {
      params.limit = filters.limit;
    }
    
    const response = await apiClient.getTrainingWords(params);
    
    console.log('✅ Тренировочные слова загружены:', response.words.length);
    return response.words;
  } catch (error) {
    console.error('❌ Ошибка загрузки тренировочных слов:', error);
    throw error;
  }
},

endSessionNew: async () => {
  try {
    const state = get();
    if (!state.currentSession) {
      console.warn('⚠️ Нет активной сессии для завершения');
      return null;
    }
    
    console.log('🏁 Завершение сессии:', state.currentSession.sessionId);
    
    const response = await apiClient.endSession(state.currentSession.sessionId);
    
    // ✅ ИСПРАВЛЕНИЕ: ПОЛНАЯ очистка состояния с дополнительными полями
    set({
      isReviewSession: false,
      currentSession: null,
      currentReviewWord: null,
      hasMoreWords: false,
      remainingWords: 0,
      hintsUsed: 0,
      currentRound: 1,
      reviewMode: undefined,
      currentDirection: 'LEARNING_TO_NATIVE',
      sessionType: undefined,
      isSessionCompleted: false, // Сбрасываем флаг завершения
      // ✅ НОВОЕ: Добавляем сброс всех связанных полей
      currentWord: null,
      // Дополнительная очистка всех возможных остатков состояния
      ...Object.keys(state).reduce((acc, key) => {
        if (key.includes('session') || key.includes('review') || key.includes('current')) {
          if (typeof state[key] === 'boolean') {
            acc[key] = false;
          } else if (typeof state[key] === 'number') {
            acc[key] = 0;
          } else {
            acc[key] = null;
          }
        }
        return acc;
      }, {} as any)
    });
    
    console.log('✅ Сессия завершена вручную, состояние ПОЛНОСТЬЮ очищено:', response?.sessionStats);
    return response?.sessionStats || null;
  } catch (error) {
    console.error('❌ Ошибка завершения сессии:', error);
    
    // ✅ Даже при ошибке полностью очищаем состояние
    set({
      isReviewSession: false,
      currentSession: null,
      currentReviewWord: null,
      hasMoreWords: false,
      remainingWords: 0,
      hintsUsed: 0,
      currentRound: 1,
      reviewMode: undefined,
      currentDirection: 'LEARNING_TO_NATIVE',
      sessionType: undefined,
      isSessionCompleted: false,
      currentWord: null
    });
    
    throw error;
  }
},

clearSessionState: () => {
  console.log('🧹 Принудительная очистка состояния сессии');
  const state = get();
  
  set({
    isReviewSession: false,
    currentSession: null,
    currentReviewWord: null,
    hasMoreWords: false,
    remainingWords: 0,
    hintsUsed: 0,
    currentRound: 1,
    reviewMode: undefined,
    currentDirection: 'LEARNING_TO_NATIVE',
    sessionType: undefined,
    isSessionCompleted: false,
    currentWord: null,
    // Очищаем все поля, связанные с сессиями
    ...Object.keys(state).reduce((acc, key) => {
      if (key.includes('session') || key.includes('review') || key.includes('current')) {
        if (typeof state[key] === 'boolean') {
          acc[key] = false;
        } else if (typeof state[key] === 'number') {
          acc[key] = 0;
        } else {
          acc[key] = null;
        }
      }
      return acc;
    }, {} as any)
  });
},

  // Review actions
  startReviewSession: async () => {
    try {
      const response = await apiClient.startReviewSession();
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
        await apiClient.submitReview({ wordId, rating });
        const nextWordResponse = await apiClient.startReviewSession();
        
        set({
        currentReviewWord: nextWordResponse.word || null,
        hasMoreWords: nextWordResponse.hasMore,
        remainingWords: nextWordResponse.remaining || 0
        });
        
        await get().loadWordsStats();
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

  // ============== FRIENDSHIP ACTIONS ==============
  
  loadFriends: async () => {
    const state = get();
    if (state.isLoadingFriends) return;
    
    set({ isLoadingFriends: true });
    try {
      const response = await apiClient.getFriendsWithClouds();
      set({ friends: response.friends });
    } catch (error) {
      console.error('❌ Ошибка загрузки друзей:', error);
    } finally {
      set({ isLoadingFriends: false });
    }
  },

  loadPendingRequests: async () => {
    try {
      const response = await apiClient.getPendingRequests();
      set({ pendingRequests: response.requests });
    } catch (error) {
      console.error('❌ Ошибка загрузки заявок:', error);
    }
  },

  searchUsers: async (query: string) => {
    try {
      const response = await apiClient.searchUsers(query);
      return response.users;
    } catch (error) {
      console.error('❌ Ошибка поиска пользователей:', error);
      return [];
    }
  },

  sendFriendRequest: async (friendId: string) => {
    try {
      await apiClient.sendFriendRequest(friendId);
    } catch (error) {
      console.error('❌ Ошибка отправки заявки:', error);
      throw error;
    }
  },

  respondToFriendRequest: async (friendshipId: string, action: 'accept' | 'reject') => {
    try {
      await apiClient.respondToFriendRequest(friendshipId, action);
      // Обновляем списки
      get().loadPendingRequests();
      get().loadFriends();
    } catch (error) {
      console.error('❌ Ошибка ответа на заявку:', error);
      throw error;
    }
  },

  removeFriend: async (friendshipId: string) => {
    try {
      await apiClient.removeFriend(friendshipId);
      // Обновляем список друзей
      get().loadFriends();
    } catch (error) {
      console.error('❌ Ошибка удаления друга:', error);
      throw error;
    }
  },
}));

export const useFriends = () => useStore((state) => ({
  friends: state.friends,
  pendingRequests: state.pendingRequests,
  isLoadingFriends: state.isLoadingFriends,
  loadFriends: state.loadFriends,
  loadPendingRequests: state.loadPendingRequests,
  searchUsers: state.searchUsers,
  sendFriendRequest: state.sendFriendRequest,
  respondToFriendRequest: state.respondToFriendRequest,
  removeFriend: state.removeFriend
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
  // Новые поля:
  currentSession: state.currentSession,
  sessionType: state.sessionType,
  reviewMode: state.reviewMode,
  currentDirection: state.currentDirection,
  hintsUsed: state.hintsUsed,
  currentRound: state.currentRound,
  // Новые методы:
  createReviewSession: state.createReviewSession,
  submitReviewInSession: state.submitReviewInSession,
  getHint: state.getHint,
  getTrainingWords: state.getTrainingWords,
  endSessionNew: state.endSessionNew,
  // Старые методы (для совместимости):
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