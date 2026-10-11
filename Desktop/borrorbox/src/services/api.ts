import { 
  User, 
  Item, 
  BorrowRequest, 
  Conversation, 
  Message, 
  NotificationItem, 
  ReportedItem, 
  AdminStats, 
  Category, 
  ItemCondition, 
  ItemLendingMode, 
  BorrowRequestStatus 
} from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const isLiveBackendConfigured = Boolean(API_BASE_URL);

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// Token helper for production API headers
const AUTH_TOKEN_KEY = 'borrowbox_auth_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// Generic Live Fetch Wrapper
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'FastAPI backend URL is not configured. Please define VITE_API_BASE_URL in your environment or .env file (e.g. VITE_API_BASE_URL="http://localhost:8000/api/v1").',
      0
    );
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkErr: any) {
    throw new ApiError(
      `Cannot connect to FastAPI backend at ${API_BASE_URL}. Ensure your backend server is running and CORS is configured to allow this origin.`,
      0
    );
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson && errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(errorDetail, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// =========================================================
// AUTH SERVICE (FastAPI /auth endpoints)
// =========================================================
export const authService = {
  async login(email: string, password?: string): Promise<{ user: User; token: string }> {
    const res = await apiFetch<{ user: User; access_token: string }>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return { user: res.user, token: res.access_token };
  },

  async register(params: {
    name: string;
    email: string;
    password?: string;
    college: string;
    department: string;
    yearOfStudy: string;
    phone?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await apiFetch<{ user: User; access_token: string }>('auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return { user: res.user, token: res.access_token };
  },

  async getCurrentUser(): Promise<User> {
    return apiFetch<User>('auth/me');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiFetch<User>('auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// =========================================================
// ITEMS SERVICE (FastAPI /items endpoints)
// =========================================================
export interface ItemFilters {
  query?: string;
  category?: Category | 'all';
  lendingMode?: ItemLendingMode | 'all';
  condition?: ItemCondition | 'all';
  onlyAvailable?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
}

export const itemsService = {
  async listItems(filters: ItemFilters = {}): Promise<Item[]> {
    const params = new URLSearchParams();
    if (filters.query) params.set('search', filters.query);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.lendingMode && filters.lendingMode !== 'all') params.set('lending_mode', filters.lendingMode);
    if (filters.condition && filters.condition !== 'all') params.set('condition', filters.condition);
    if (filters.onlyAvailable) params.set('available_only', 'true');
    if (filters.sortBy) params.set('sort_by', filters.sortBy);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<Item[]>(`items${qs}`);
  },

  async getItem(id: string): Promise<Item> {
    return apiFetch<Item>(`items/${id}`);
  },

  async createItem(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'owner'>): Promise<Item> {
    return apiFetch<Item>('items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    return apiFetch<Item>(`items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteItem(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`items/${id}`, {
      method: 'DELETE',
    });
  },

  async getMyItems(userId: string): Promise<Item[]> {
    return apiFetch<Item[]>(`users/${userId}/items`);
  },
};

// =========================================================
// REQUESTS SERVICE (FastAPI /requests endpoints)
// =========================================================
export const requestsService = {
  async createRequest(params: {
    itemId: string;
    startDate: string;
    endDate: string;
    message: string;
  }): Promise<BorrowRequest> {
    return apiFetch<BorrowRequest>('requests', {
      method: 'POST',
      body: JSON.stringify({
        item_id: params.itemId,
        start_date: params.startDate,
        end_date: params.endDate,
        message: params.message,
      }),
    });
  },

  async getMyBorrowingRequests(userId?: string): Promise<BorrowRequest[]> {
    return apiFetch<BorrowRequest[]>('requests/borrowing');
  },

  async getMyLendingRequests(userId?: string): Promise<BorrowRequest[]> {
    return apiFetch<BorrowRequest[]>('requests/lending');
  },

  async getRequestById(id: string): Promise<BorrowRequest> {
    return apiFetch<BorrowRequest>(`requests/${id}`);
  },

  async updateRequestStatus(id: string, status: BorrowRequestStatus): Promise<BorrowRequest> {
    return apiFetch<BorrowRequest>(`requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// =========================================================
// CHAT SERVICE (FastAPI /conversations and /messages)
// =========================================================
export const chatService = {
  async getConversations(userId?: string): Promise<Conversation[]> {
    return apiFetch<Conversation[]>('conversations');
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    return apiFetch<Message[]>(`conversations/${conversationId}/messages`);
  },

  async sendMessage(params: {
    conversationId?: string;
    recipientId: string;
    senderId: string;
    text: string;
    itemId?: string;
    itemTitle?: string;
  }): Promise<{ message: Message; conversationId: string }> {
    return apiFetch<{ message: Message; conversationId: string }>('messages', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: params.conversationId,
        recipient_id: params.recipientId,
        text: params.text,
        item_id: params.itemId,
        item_title: params.itemTitle,
      }),
    });
  },
};

// =========================================================
// NOTIFICATIONS SERVICE (FastAPI /notifications endpoints)
// =========================================================
export const notificationsService = {
  async getNotifications(userId?: string): Promise<NotificationItem[]> {
    return apiFetch<NotificationItem[]>('notifications');
  },

  async markAsRead(id: string): Promise<void> {
    await apiFetch(`notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllAsRead(userId?: string): Promise<void> {
    await apiFetch('notifications/read-all', { method: 'POST' });
  },
};

// =========================================================
// ADMIN SERVICE (FastAPI /admin endpoints)
// =========================================================
export const adminService = {
  async getStats(): Promise<AdminStats> {
    return apiFetch<AdminStats>('admin/stats');
  },

  async getUsers(): Promise<User[]> {
    return apiFetch<User[]>('admin/users');
  },

  async toggleUserVerification(userId: string, isVerified: boolean): Promise<User> {
    return apiFetch<User>(`admin/users/${userId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ is_verified: isVerified }),
    });
  },

  async getReports(): Promise<ReportedItem[]> {
    return apiFetch<ReportedItem[]>('admin/reports');
  },

  async resolveReport(reportId: string, action: 'resolve' | 'dismiss'): Promise<void> {
    await apiFetch(`admin/reports/${reportId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async getAllLoans(): Promise<BorrowRequest[]> {
    return apiFetch<BorrowRequest[]>('admin/loans');
  },
};
