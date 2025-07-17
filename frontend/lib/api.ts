// frontend/lib/api.ts - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ

import { 
  User, 
  Word, 
  UserStats, 
  WordStats,
  CreateWordRequest,
  UpdateWordRequest,
  CreateReviewSessionRequest,
  SubmitReviewRequest,
  GetHintRequest,
  GetHintResponse,
  ReviewSessionResponse,
  EvaluateInputResponse,
  ActiveWordsResponse,
  ReviewMode,
  ReviewDirection
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    
    // Инициализируем токен из localStorage при создании
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

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

  /**
 * Получить достижения пользователя
 */
async getUserAchievements() {
  return this.request<{
    achievements: Achievement[];
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
  }>('/stats/achievements');
}

/**
 * Получить достижения друга
 */
async getFriendAchievements(friendId: string) {
  return this.request<{
    achievements: Achievement[];
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
  }>(`/friendships/${friendId}/achievements`);
}

  // ====================== AUTH ======================
  
  // ИСПРАВЛЕНО: Принимает объект с credentials
  async login(credentials: { emailOrUsername: string; password: string }) {
    const response = await this.request<{ message: string; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.setToken(response.token);
    return response;
  }

  // ИСПРАВЛЕНО: Принимает объект с данными регистрации
  async register(data: { email: string; username: string; password: string; learningLanguage: string }) {
    const response = await this.request<{ message: string; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.setToken(response.token);
    return response;
  }

  // ИСПРАВЛЕНО: Правильный endpoint /auth/me
  async getProfile() {
    return this.request<{ user: User }>('/auth/me');
  }

  // ИСПРАВЛЕНО: Принимает объект с обновлениями
  async updateProfile(updates: { username?: string; learningLanguage?: string; dailyGoal?: number; avatar?: string }) {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  logout() {
    this.setToken(null);
  }

  // ====================== WORDS ======================

  async getWords(params?: {
    search?: string;
    tags?: string;
    masteryLevel?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = queryParams.toString() ? `/words?${queryParams}` : '/words';
    return this.request<{ 
      words: Word[], 
      pagination: { 
        currentPage: number, 
        totalPages: number, 
        totalCount: number, 
        limit: number, 
        hasNext: boolean, 
        hasPrev: boolean 
      } 
    }>(endpoint);
  }

  // ИСПРАВЛЕНО: Принимает объект с данными слова
  async createWord(data: CreateWordRequest) {
    return this.request<{ message: string; word: Word }>('/words', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWord(id: string, data: UpdateWordRequest) {
    return this.request<{ message: string; word: Word }>(`/words/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWord(id: string) {
    return this.request<{ message: string }>(`/words/${id}`, {
      method: 'DELETE',
    });
  }

  async getWordsStats() {
    return this.request<{ stats: WordStats }>('/words/stats');
  }

  async getDueWords() {
    return this.request<{ words: Word[], count: number, date: string }>('/words/due');
  }

  // =================== НОВЫЕ REVIEW ENDPOINTS ===================

  async createReviewSession(data: CreateReviewSessionRequest): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>('/reviews/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentWord(sessionId: string): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>(`/reviews/sessions/${sessionId}/current`);
  }

  async submitReviewInSession(
    sessionId: string, 
    data: Omit<SubmitReviewRequest, 'sessionId'>
  ): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>(`/reviews/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endSession(sessionId: string): Promise<{ success: boolean; sessionStats: any; message: string }> {
    return this.request(`/reviews/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getHint(data: GetHintRequest): Promise<GetHintResponse> {
    return this.request<GetHintResponse>('/reviews/hint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTrainingWords(params?: {
    tags?: string;
    masteryLevel?: string;
    limit?: number;
  }): Promise<ActiveWordsResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = queryParams.toString() ? `/reviews/training-words?${queryParams}` : '/reviews/training-words';
    return this.request<ActiveWordsResponse>(endpoint);
  }

  // =================== СТАРЫЕ REVIEW ENDPOINTS (для совместимости) ===================

  async startReviewSession() {
    return this.request<{ 
      word: Word | null, 
      hasMore: boolean, 
      remainingWords: number, 
      message?: string 
    }>('/reviews/session/start');
  }

  async submitReview(data: { wordId: string; rating: number }) {
    return this.request<{ message: string }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // =================== STATS ===================

  async getUserStats() {
    return this.request<{ stats: UserStats }>('/stats');
  }

  async updateDailyGoal(goal: number) {
    return this.request<{ message: string; user: User }>('/stats/daily-goal', {
      method: 'PUT',
      body: JSON.stringify({ dailyGoal: goal }),
    });
  }

  // =================== FRIENDSHIP ===================

  async getFriends() {
    return this.request<{ friends: any[] }>('/friendships');
  }

  async getFriendsWithClouds() {
    return this.request<{ friends: any[] }>('/friendships/clouds');
  }

  async getPendingRequests() {
    return this.request<{ requests: any[] }>('/friendships/requests');
  }

  async searchUsers(query: string) {
    return this.request<{ users: any[] }>(`/friendships/search?query=${encodeURIComponent(query)}`);
  }

  async sendFriendRequest(friendId: string) {
    return this.request<{ message: string }>('/friendships/request', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  }

  async respondToFriendRequest(friendshipId: string, action: 'accept' | 'reject') {
    return this.request<{ message: string }>(`/friendships/request/${friendshipId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  }

  async removeFriend(friendshipId: string) {
    return this.request<{ message: string }>(`/friendships/${friendshipId}`, {
      method: 'DELETE',
    });
  }

  // =================== ДОПОЛНИТЕЛЬНЫЕ FRIEND МЕТОДЫ ===================

  async getFriendProfile(friendId: string) {
    return this.request<{ friend: any }>(`/friendships/${friendId}/profile`);
  }

  async getFriendWords(friendId: string, params?: {
    search?: string;
    tags?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = queryParams.toString() ? 
      `/friendships/${friendId}/words?${queryParams}` : 
      `/friendships/${friendId}/words`;
    
    return this.request<{ 
      words: any[], 
      availableTags: string[], 
      pagination: { 
        currentPage: number, 
        totalPages: number, 
        totalCount: number 
      } 
    }>(endpoint);
  }

  async copyFriendWord(friendId: string, wordId: string) {
    return this.request<{ message: string; word: any }>(`/friendships/${friendId}/words/${wordId}/copy`, {
      method: 'POST',
    });
  }
}

// Создаем единственный экземпляр API клиента
const apiClient = new ApiClient();

// Экспортируем по умолчанию
export default apiClient;