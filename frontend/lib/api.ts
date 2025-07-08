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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Загружаем токен из localStorage при инициализации
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      console.log('🔧 API Client инициализирован:', { 
        baseURL: this.baseURL, 
        hasToken: !!this.token 
      });
    }
  }

  // Устанавливает токен авторизации
  setToken(token: string | null) {
    console.log('🔑 Устанавливаем токен:', token ? 'новый токен' : 'очищаем токен');
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
    const url = `${this.baseURL}/api${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

  // Добавляем токен авторизации если он есть
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

  try {
    console.log('🚀 API Request:', { 
        url, 
        method: options.method || 'GET', 
        hasAuth: !!this.token,
        endpoint 
      });
    
      const response = await fetch(url, {
        ...options,
        headers,
        // Убираем credentials: 'include' если не нужно
        mode: 'cors'
      });

      console.log('📡 API Response:', { 
        status: response.status, 
        ok: response.ok, 
        url: response.url,
        statusText: response.statusText
      });

    // Проверяем, есть ли содержимое для парсинга
      const contentType = response.headers.get('content-type');
      let data: any = null;
    
if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('❌ JSON Parse Error:', jsonError);
          data = { error: 'Invalid JSON response' };
        }
      } else {
        // Если не JSON, получаем как текст
        const textResponse = await response.text();
        console.log('📄 Non-JSON Response:', textResponse);
        data = { error: textResponse || 'No response body' };
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `HTTP error! status: ${response.status}`;
        console.error('❌ API Error:', { status: response.status, message: errorMessage, data });
        
        // Если токен невалиден, очищаем его
        if (response.status === 401 || response.status === 403) {
          console.log('🔄 Токен невалиден, очищаем...');
          this.setToken(null);
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ API Success:', data);
      return data;
    } catch (error) {
      console.error('🔥 Network/Fetch Error:', error);
      
      if (error instanceof Error) {
        // Если это наша ошибка из ответа сервера
        if (error.message.includes('HTTP error!') || error.message.includes('error')) {
          throw error;
        }
        // Если это сетевая ошибка
        throw new Error(`Сетевая ошибка: ${error.message}`);
      }
      
      throw new Error('Неизвестная ошибка сети');
    }
  }

  async getFriendProfile(friendId: string): Promise<{ friend: any }> {
  return this.request<{ friend: any }>(`/friendships/${friendId}/profile`);
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

  async updateProfile(updates: {
    username?: string;
    learningLanguage?: string;
    dailyGoal?: number;
    avatar?: string;
  }): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
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

  // ============== FRIENDSHIP METHODS ==============
  
  async searchUsers(query: string): Promise<{ users: any[] }> {
    return this.request<{ users: any[] }>(`/friendships/search?query=${encodeURIComponent(query)}`);
  }

  async sendFriendRequest(friendId: string): Promise<{ message: string; friendship: any }> {
    return this.request<{ message: string; friendship: any }>('/friendships/request', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  }

  async respondToFriendRequest(friendshipId: string, action: 'accept' | 'reject'): Promise<{ message: string; friendship?: any }> {
    return this.request<{ message: string; friendship?: any }>(`/friendships/request/${friendshipId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }

  async getFriends(): Promise<{ friends: any[] }> {
    return this.request<{ friends: any[] }>('/friendships');
  }

  async getFriendsWithClouds(): Promise<{ friends: any[] }> {
    return this.request<{ friends: any[] }>('/friendships/clouds');
  }

  async getPendingRequests(): Promise<{ requests: any[] }> {
    return this.request<{ requests: any[] }>('/friendships/requests');
  }

  async removeFriend(friendshipId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/friendships/${friendshipId}`, {
      method: 'DELETE',
    });
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