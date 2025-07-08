// lib/api.ts

import {
  User,
  Word,
  WordStats,
  UserStats,
  ReviewStats,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  CreateWordRequest,
  UpdateWordRequest,
  SubmitReviewRequest,
  ReviewSessionResponse,
  WordsResponse,
  DueWordsResponse,
  ApiError
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Загружаем токен из localStorage при инициализации
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // Устанавливает токен авторизации
  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // Получает токен
  getToken(): string | null {
    return this.token;
  }

  // Базовый метод для выполнения запросов
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Добавляем токен авторизации если он есть
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Методы аутентификации
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Сохраняем токен после успешной регистрации
    this.setToken(response.token);
    return response;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Сохраняем токен после успешного входа
    this.setToken(response.token);
    return response;
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Методы для работы со словами
  async getWords(params?: {
    search?: string;
    tags?: string;
    masteryLevel?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<WordsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<WordsResponse>(`/words${query}`);
  }

  async getDueWords(): Promise<DueWordsResponse> {
    return this.request<DueWordsResponse>('/words/due');
  }

  async getWord(id: string): Promise<{ word: Word }> {
    return this.request<{ word: Word }>(`/words/${id}`);
  }

  async createWord(wordData: CreateWordRequest): Promise<{ message: string; word: Word }> {
    return this.request<{ message: string; word: Word }>('/words', {
      method: 'POST',
      body: JSON.stringify(wordData),
    });
  }

  async updateWord(id: string, wordData: UpdateWordRequest): Promise<{ message: string; word: Word }> {
    return this.request<{ message: string; word: Word }>(`/words/${id}`, {
      method: 'PUT',
      body: JSON.stringify(wordData),
    });
  }

  async deleteWord(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/words/${id}`, {
      method: 'DELETE',
    });
  }

  async getWordsStats(): Promise<{ stats: WordStats }> {
    return this.request<{ stats: WordStats }>('/words/stats');
  }

  // Методы для ревью
  async startReviewSession(): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>('/reviews/session/start');
  }

  async submitReview(reviewData: SubmitReviewRequest): Promise<{
    message: string;
    progressUpdate: {
      masteryLevel: number;
      nextReviewDate: string;
      currentInterval: number;
      isWordMastered: boolean;
    };
  }> {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async getReviewStats(days?: number): Promise<{ stats: ReviewStats }> {
    const query = days ? `?days=${days}` : '';
    return this.request<{ stats: ReviewStats }>(`/reviews/stats${query}`);
  }

  // Методы для статистики
  async getUserStats(): Promise<UserStats> {
    return this.request<UserStats>('/stats');
  }

  async updateDailyGoal(dailyGoal: number): Promise<{ message: string; dailyGoal: number }> {
    return this.request<{ message: string; dailyGoal: number }>('/stats/daily-goal', {
      method: 'PUT',
      body: JSON.stringify({ dailyGoal }),
    });
  }

  async getDifficultWords(limit?: number): Promise<{ difficultWords: Word[] }> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<{ difficultWords: Word[] }>(`/stats/difficult-words${query}`);
  }

  // Проверка здоровья API
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request<{ status: string; timestamp: string; service: string }>('/health');
  }
}

// Создаем единственный экземпляр API клиента
export const apiClient = new ApiClient(API_BASE_URL);

// Экспортируем для удобства
export default apiClient;