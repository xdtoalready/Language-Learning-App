// frontend/lib/api.ts - ОБНОВЛЕННЫЙ

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

  // ====================== AUTH ======================
  
  async login(emailOrUsername: string, password: string) {
    const response = await this.request<{ message: string; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    });
    
    this.setToken(response.token);
    return response;
  }

  async register(email: string, username: string, password: string, learningLanguage: string) {
    const response = await this.request<{ message: string; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, learningLanguage }),
    });
    
    this.setToken(response.token);
    return response;
  }

  async getProfile() {
    return this.request<{ user: User }>('/auth/profile');
  }

  async updateProfile(updates: { username?: string; learningLanguage?: string; dailyGoal?: number; avatar?: string; }) {
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

  /**
   * Создать новую сессию ревью
   */
  async createReviewSession(data: CreateReviewSessionRequest): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>('/reviews/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Получить текущее слово в сессии
   */
  async getCurrentWord(sessionId: string): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>(`/reviews/sessions/${sessionId}/current`);
  }

  /**
   * Отправить ревью в рамках сессии
   */
  async submitReviewInSession(
    sessionId: string, 
    data: Omit<SubmitReviewRequest, 'sessionId'>
  ): Promise<ReviewSessionResponse> {
    return this.request<ReviewSessionResponse>(`/reviews/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Завершить сессию
   */
  async endSession(sessionId: string): Promise<{ success: boolean; sessionStats: any; message: string }> {
    return this.request(`/reviews/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Получить подсказку для слова
   */
  async getHint(data: GetHintRequest): Promise<GetHintResponse> {
    return this.request<GetHintResponse>('/reviews/hint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Получить слова для тренировочного полигона
   */
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

  // ================== LEGACY REVIEW METHODS (для обратной совместимости) ==================

  /**
   * @deprecated Используйте createReviewSession + getCurrentWord
   */
  async startReviewSession() {
    return this.request<ReviewSessionResponse>('/reviews/start');
  }

  /**
   * @deprecated Используйте submitReviewInSession
   */
  async submitReview(data: { wordId: string; rating: number }) {
    return this.request<{ success: boolean }>('/reviews/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ====================== STATS ======================

  async getUserStats() {
    return this.request<{ stats: UserStats }>('/stats');
  }

  async updateDailyGoal(goal: number) {
    return this.request<{ user: User }>('/stats/daily-goal', {
      method: 'PUT',
      body: JSON.stringify({ dailyGoal: goal }),
    });
  }

  // ====================== FRIENDS ======================

  async getFriends() {
    return this.request<{ friends: any[] }>('/friends');
  }

  async getFriendsWithClouds() {
    return this.request<{ friends: any[] }>('/friends/clouds');
  }

  async searchUsers(query: string) {
    return this.request<{ users: any[] }>(`/friends/search?q=${encodeURIComponent(query)}`);
  }

  async sendFriendRequest(friendId: string) {
    return this.request<{ message: string }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  }

  async getPendingRequests() {
    return this.request<{ requests: any[] }>('/friends/pending');
  }

  async respondToFriendRequest(friendshipId: string, action: 'accept' | 'reject') {
    return this.request<{ message: string }>(`/friends/respond/${friendshipId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async removeFriend(friendshipId: string) {
    return this.request<{ message: string }>(`/friends/${friendshipId}`, {
      method: 'DELETE',
    });
  }

  // =================== UTILITY METHODS ===================

  /**
   * Проверить доступность API
   */
  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  /**
   * Оценить пользовательский ввод (клиентская функция для предварительной проверки)
   */
  evaluateInputLocally(
    userInput: string, 
    correctAnswer: string, 
    synonyms: string[] = []
  ): { isValid: boolean; suggestions: string[] } {
    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    // Простая клиентская проверка
    if (normalizedInput === normalizedCorrect) {
      return { isValid: true, suggestions: [] };
    }
    
    // Проверяем синонимы
    const matchesSynonym = synonyms.some(synonym => 
      synonym.trim().toLowerCase() === normalizedInput
    );
    
    if (matchesSynonym) {
      return { isValid: true, suggestions: [] };
    }
    
    return { 
      isValid: false, 
      suggestions: [correctAnswer, ...synonyms].slice(0, 3) 
    };
  }

  /**
   * Создать быструю ежедневную сессию
   */
  async createDailySession(mode: ReviewMode = 'RECOGNITION'): Promise<ReviewSessionResponse> {
    return this.createReviewSession({
      mode,
      sessionType: 'daily'
    });
  }

  /**
   * Создать тренировочную сессию
   */
  async createTrainingSession(
    mode: ReviewMode = 'RECOGNITION',
    filters?: {
      tags?: string[];
      masteryLevel?: number[];
      onlyActive?: boolean;
    }
  ): Promise<ReviewSessionResponse> {
    return this.createReviewSession({
      mode,
      sessionType: 'training',
      filterBy: filters
    });
  }
}

// Создаем и экспортируем экземпляр
const apiClient = new ApiClient();

export default apiClient;