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

// Сессия ревью
export interface ReviewSession {
  sessionId: string;
  mode: ReviewMode;
  sessionType: 'daily' | 'training';
  currentRound: number;
  currentWordIndex: number;
  totalWords: number;
  startTime: string;
}

// Слово в сессии ревью
export interface ReviewSessionWord {
  id: string;
  word: string;
  translation: string;
  transcription?: string;
  example?: string;
  tags: string[];
  synonyms?: string[];
  masteryLevel: number;
  direction: ReviewDirection;
  isCompleted?: boolean;
}

// Результат ревью слова
export interface ReviewResult {
  rating: number;
  userInput?: string;
  hintsUsed: number;
  timeSpent: number;
  autoEvaluated: boolean; // автоматически оценено или пользователем
}

// Оценка ввода
export interface InputEvaluation {
  score: 1 | 2 | 3 | 4;
  reason: 'exact' | 'typo' | 'synonym' | 'hint_used' | 'wrong';
  similarity: number; // 0-1
  suggestions?: string[]; // возможные исправления
}

// Подсказка
export interface Hint {
  type: 'length' | 'first_letter';
  content: string;
  used: boolean;
}

// Настройки режима тренировки
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
  active: number; // слова в изучении (masteryLevel < 5)
  byMasteryLevel: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  byInputAccuracy?: { // статистика ввода
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
  // статистика по режимам
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
  currentWord?: ReviewSessionWord;  // Убедитесь что это currentWord, а не nextWord
  hasMore: boolean;
  hasMoreWords?: boolean; // альтернативное название из некоторых эндпоинтов
  remaining?: number;
  remainingWords?: number; // альтернативное название
  message?: string;
  completed?: boolean;
  success?: boolean; // для ответов submitReview
  evaluation?: {
    score: number;
    autoEvaluated: boolean;
    userInput: string;
    correctAnswer: string;
  };
  sessionStats?: {
    totalWords: number;
    completed: number;
    correct: number;
    averageRating: number;
    totalTime: number;
  };
  currentRound?: number; // для многораундовых режимов
}

// Ответ оценки ввода
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

// Ответ активных слов для тренировочного полигона
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

// ============== ДОСТИЖЕНИЯ ==============

export type AchievementCategory = 'STREAK' | 'LEARNING' | 'PROGRESS' | 'SOCIAL' | 'SPECIAL';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: AchievementCategory;
  points: number;
  isSecret: boolean;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  progress?: any;
  requirement: {
    type: string;
    value: number;
  };
}

export interface AchievementProgress {
  achievementId: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  current: number;
  required: number;
  percentage: number;
}

export interface UserAchievementsResponse {
  achievements: Achievement[];
  newAchievements: string[];
  totalPoints: number;
}

export interface PublicUserAchievementsResponse {
  user: {
    id: string;
    username: string;
  };
  achievements: Achievement[];
  totalPoints: number;
  totalCount: number;
}

export interface AchievementProgressResponse {
  progress: AchievementProgress[];
}