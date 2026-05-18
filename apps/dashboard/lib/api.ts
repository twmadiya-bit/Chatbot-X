import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach JWT from localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 by redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth helpers
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('tenant_id');
  localStorage.removeItem('user_data');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tenant_id');
}

// API response types
export interface TenantProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  slug: string;
  phone: string | null;
  timezone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tenant: TenantProfile;
}

export interface Chatbot {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  industry?: { id: string; name: string; slug: string };
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  systemPrompt: string;
  channel: Array<'WIDGET' | 'WHATSAPP'>;
  branding?: {
    primaryColor: string;
    secondaryColor?: string;
    backgroundColor: string;
    textColor: string;
    userBubbleColor: string;
    botBubbleColor: string;
    fontFamily?: string;
    borderRadius: number;
    logoUrl?: string;
    position: 'bottom-right' | 'bottom-left';
    launcherText?: string;
    headerTitle?: string;
    welcomeMessage: string;
    placeholderText: string;
    widgetWidth?: number;
    widgetHeight?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatbotPayload {
  name: string;
  systemPrompt: string;
  channel: Array<'WIDGET' | 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER' | 'API'>;
  description?: string;
  maxTokens?: number;
  temperature?: number;
  config?: Record<string, unknown>;
}

export interface ConversationSummary {
  id: string;
  chatbotId: string;
  chatbotName: string;
  startedAt: string;
  messageCount: number;
  sentiment: number;
  resolved: boolean;
  channel: 'WIDGET' | 'WHATSAPP';
  userIdentifier?: string;
}

export interface AnalyticsData {
  period: string;
  conversations: number;
  messages: number;
  avgSentiment: number;
  aiCostUsd: number;
  resolvedRate: number;
}

export interface DashboardMetrics {
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeMs: number;
  resolutionRate: number;
  escalationRate: number;
  topIntents: Array<{ intent: string; count: number }>;
}

export interface BillingInfo {
  plan: string;
  planTier: 'BUDGET' | 'STANDARD' | 'PREMIUM';
  billingCycleStart: string;
  billingCycleEnd: string;
  includedCreditsUsd: number;
  usedCreditsUsd: number;
  overageUsd: number;
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    downloadUrl: string;
  }>;
  costBreakdown: Array<{
    chatbotName: string;
    messages: number;
    costUsd: number;
  }>;
}

// API calls
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: LoginResponse }>('/api/v1/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ success: boolean; data: LoginResponse }>('/api/v1/auth/register', data),

  logout: () => api.post('/api/v1/auth/logout'),

  requestPasswordReset: (email: string) =>
    api.post('/api/v1/auth/request-password-reset', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),
};

export const chatbotsApi = {
  list: () =>
    api.get<{ success: boolean; data: Chatbot[] }>('/api/v1/chatbots'),

  get: (chatbotId: string) =>
    api.get<{ success: boolean; data: Chatbot }>(`/api/v1/chatbots/${chatbotId}`),

  create: (payload: CreateChatbotPayload) =>
    api.post<{ success: boolean; data: Chatbot }>('/api/v1/chatbots', payload),

  update: (chatbotId: string, payload: Partial<Chatbot>) =>
    api.patch<{ success: boolean; data: Chatbot }>(`/api/v1/chatbots/${chatbotId}`, payload),

  delete: (chatbotId: string) =>
    api.delete(`/api/v1/chatbots/${chatbotId}`),
};

export const dashboardApi = {
  getMetrics: () =>
    api.get<{ success: boolean; data: DashboardMetrics }>('/api/v1/analytics/dashboard?period=30d'),
};

export const analyticsApi = {
  getOverview: (period: string, chatbotId?: string) =>
    api.get<{ success: boolean; data: DashboardMetrics }>('/api/v1/analytics/dashboard', {
      params: { period, chatbotId },
    }),

  getConversations: (chatbotId?: string, page = 1, limit = 20, status?: string) =>
    api.get<{ success: boolean; data: { data: ConversationSummary[]; total: number } }>(
      '/api/v1/analytics/conversations',
      { params: { chatbotId, page, limit, status } }
    ),

  getTopQuestions: (period: string, chatbotId?: string) =>
    api.get<{ success: boolean; data: Array<{ question: string; count: number }> }>(
      '/api/v1/analytics/top-questions',
      { params: { period, chatbotId } }
    ),
};

export const billingApi = {
  getInfo: (tenantId: string) =>
    api.get<{ success: boolean; data: BillingInfo }>(`/api/v1/tenants/${tenantId}/billing`),
};

export const settingsApi = {
  getProfile: () =>
    api.get<{ success: boolean; data: TenantProfile }>('/api/v1/tenants/me'),

  updateProfile: (data: { name?: string; phone?: string; timezone?: string }) =>
    api.patch('/api/v1/tenants/me', data),
};
