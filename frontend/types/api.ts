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
  masteryLevel: number;
  currentInterval: number;
  lastReviewDate: string;
  nextReviewDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  rating: number; // 1-4
  wordId: string;
  userId: string;
  createdAt: string;
}

export interface WordStats {
  total: number;
  mastered: number;
  dueToday: number;
  byMasteryLevel: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
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
}

export interface UpdateWordRequest extends CreateWordRequest {}

export interface SubmitReviewRequest {
  wordId: string;
  rating: number; // 1-4
}

export interface ReviewSessionResponse {
  word: Word | null;
  hasMore: boolean;
  remaining?: number;
  message?: string;
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