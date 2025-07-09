// types/api.ts

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  learningLanguage: string;
  currentStreak: number;
  longestStreak: number;
  totalWordsLearned: number;
  dailyGoal: number;
  joinDate: string;
  lastActiveDate?: string;
  _count?: {
    words: number;
    friends: number;
  };
}

export interface Word {
  id: string;
  word: string;
  translation: string;
  transcription?: string;
  example?: string;
  tags: string[];
  synonyms: string[];
  masteryLevel: number;
  currentInterval: number;
  lastReviewDate: string;
  nextReviewDate: string;
  inputHistory?: WordInputHistory;
  createdAt: string;
  updatedAt: string;
}

export interface WordInputHistory {
  correct: number;    // Количество правильных ответов
  attempts: number;   // Общее количество попыток
  lastScore: number;  // Последняя оценка (1-4)
  averageTime?: number; // Среднее время ответа в секундах
}

// Режимы тренировки
export type ReviewMode = 'RECOGNITION' | 'TRANSLATION_INPUT' | 'REVERSE_INPUT' | 'MIXED';
export type ReviewDirection = 'LEARNING_TO_NATIVE' | 'NATIVE_TO_LEARNING';

export interface Review {
  id: string;
  rating: number; // 1-4
  reviewMode: ReviewMode;
  direction: ReviewDirection;
  userInput?: string; // что ввел пользователь
  hintsUsed: number; // количество подсказок
  timeSpent?: number; // время в секундах
  wordId: string;
  userId: string;
  createdAt: string;
}

// НОВОЕ: Сессия ревью
export interface ReviewSession {
  sessionId: string;
  mode: ReviewMode;
  sessionType: 'daily' | 'training'; // ежедневные или тренировочные
  currentRound: 1 | 2; // для двураундовых режимов
  currentWordIndex: number;
  totalWords: number;
  startTime: string;
  words: ReviewSessionWord[];
}

// НОВОЕ: Слово в сессии ревью
export interface ReviewSessionWord extends Word {
  direction: ReviewDirection;
  isCompleted: boolean;
  result?: ReviewResult;
}

// НОВОЕ: Результат ревью слова
export interface ReviewResult {
  rating: number;
  userInput?: string;
  hintsUsed: number;
  timeSpent: number;
  autoEvaluated: boolean; // автоматически оценено или пользователем
}

// НОВОЕ: Оценка ввода
export interface InputEvaluation {
  score: 1 | 2 | 3 | 4;
  reason: 'exact' | 'typo' | 'synonym' | 'hint_used' | 'wrong';
  similarity: number; // 0-1
  suggestions?: string[]; // возможные исправления
}

// НОВОЕ: Подсказка
export interface Hint {
  type: 'length' | 'first_letter';
  content: string;
  used: boolean;
}

// НОВОЕ: Настройки режима тренировки
export interface TrainingModeSettings {
  mode: ReviewMode;
  enableHints: boolean;
  timeLimit?: number; // в секундах
  strictMode: boolean; // строгая проверка опечаток
}

export interface WordStats {
  total: number;
  mastered: number;
  dueToday: number;
  active: number; // НОВОЕ: слова в изучении (masteryLevel < 5)
  byMasteryLevel: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  byInputAccuracy?: { // НОВОЕ: статистика ввода
    excellent: number; // 90%+ правильных
    good: number;      // 70-89%
    needs_practice: number; // <70%
  };
}

export interface UserStats {
  user: {
    currentStreak: number;
    longestStreak: number;
    totalWordsLearned: number;
    joinDate: string;
    lastActiveDate?: string;
    memberFor: number;
  };
  dailyProgress: {
    completed: number;
    goal: number;
    percentage: number;
  };
  learningStats: {
    wordsInProgress: number;
    wordsMastered: number;
    wordsToday: number;
    totalWords: number;
    masteryDistribution: {
      0: number;
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  weeklyActivity: Array<{
    date: string;
    reviewCount: number;
    averageRating: number;
  }>;
  weeklyAverageRating: number;
  // НОВОЕ: статистика по режимам
  modeStats: {
    recognition: { total: number; averageRating: number; };
    translationInput: { total: number; averageRating: number; accuracy: number; };
    reverseInput: { total: number; averageRating: number; accuracy: number; };
  };
  totals: {
    words: number;
    reviews: number;
    friends: number;
  };
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
  reviewsByDay: Record<string, number>;
  successRate: number;
}

// API Request/Response типы
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  learningLanguage: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface CreateWordRequest {
  word: string;
  translation: string;
  transcription?: string;
  example?: string;
  tags?: string[];
  synonyms?: string[];
}

export interface UpdateWordRequest extends CreateWordRequest {}

// НОВОЕ: Запрос на создание сессии
export interface CreateReviewSessionRequest {
  mode: ReviewMode;
  sessionType: 'daily' | 'training';
  filterBy?: {
    tags?: string[];
    masteryLevel?: number[];
    onlyActive?: boolean; // только активные слова для тренировочного полигона
  };
}

export interface SubmitReviewRequest {
  wordId: string;
  rating?: number; // опционально, если автоматически оценивается
  userInput?: string; // для режимов ввода
  hintsUsed?: number;
  timeSpent?: number;
  reviewMode: ReviewMode;
  direction: ReviewDirection;
}

// НОВОЕ: Запрос подсказки
export interface GetHintRequest {
  wordId: string;
  hintType: 'length' | 'first_letter';
  currentHintsUsed: number;
}

export interface GetHintResponse {
  hint: Hint;
  penaltyApplied: boolean; // снижена ли максимальная оценка
}

export interface ReviewSessionResponse {
  session?: ReviewSession;
  currentWord?: ReviewSessionWord;
  hasMore: boolean;
  remaining?: number;
  message?: string;
  completed?: boolean; // сессия завершена
  sessionStats?: {
    totalWords: number;
    correctAnswers: number;
    averageRating: number;
    totalTime: number;
    modeBreakdown: Record<ReviewMode, number>;
  };
}

// НОВОЕ: Ответ оценки ввода
export interface EvaluateInputResponse {
  evaluation: InputEvaluation;
  nextAction: 'continue' | 'retry' | 'show_answer';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// НОВОЕ: Ответ активных слов для тренировочного полигона
export interface ActiveWordsResponse {
  words: Word[];
  count: number;
  byTags: Record<string, number>; // группировка по тегам
}

export interface WordsResponse {
  words: Word[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DueWordsResponse {
  words: Word[];
  count: number;
  date: string;
}

export interface ApiError {
  error: string;
  path?: string;
  details?: any;
}