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
export interface LoginResponse {
  token: string;
  tenantId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface Chatbot {
  id: string;
  tenantId: string;
  name: string;
  industry: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  systemPrompt: string;
  model: string;
  channels: Array<'WIDGET' | 'WHATSAPP'>;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    userBubbleColor: string;
    botBubbleColor: string;
    fontFamily: string;
    borderRadius: number;
    logoUrl?: string;
    position: 'bottom-right' | 'bottom-left';
    launcherText: string;
    headerTitle?: string;
    welcomeMessage: string;
    placeholderText: string;
    widgetWidth: number;
    widgetHeight: number;
  };
  monthlyMessages: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatbotPayload {
  name: string;
  industry: string;
  systemPrompt: string;
  model: string;
  channels: Array<'WIDGET' | 'WHATSAPP'>;
  planTier: 'BUDGET' | 'STANDARD' | 'PREMIUM';
  branding?: Partial<Chatbot['branding']>;
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
  totalChatbots: number;
  conversationsThisMonth: number;
  messagesThisMonth: number;
  aiCostThisMonth: number;
  last7DaysConversations: Array<{ date: string; count: number }>;
  chatbots: Chatbot[];
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

  register: (data: { name: string; email: string; password: string; businessName: string }) =>
    api.post<{ success: boolean; data: LoginResponse }>('/api/v1/auth/register', data),

  logout: () => api.post('/api/v1/auth/logout'),

  requestPasswordReset: (email: string) =>
    api.post('/api/v1/auth/request-password-reset', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),
};

export const chatbotsApi = {
  list: (tenantId: string) =>
    api.get<{ success: boolean; data: Chatbot[] }>(`/api/v1/tenants/${tenantId}/chatbots`),

  get: (tenantId: string, chatbotId: string) =>
    api.get<{ success: boolean; data: Chatbot }>(`/api/v1/tenants/${tenantId}/chatbots/${chatbotId}`),

  create: (tenantId: string, payload: CreateChatbotPayload) =>
    api.post<{ success: boolean; data: Chatbot }>(`/api/v1/tenants/${tenantId}/chatbots`, payload),

  update: (tenantId: string, chatbotId: string, payload: Partial<Chatbot>) =>
    api.patch<{ success: boolean; data: Chatbot }>(`/api/v1/tenants/${tenantId}/chatbots/${chatbotId}`, payload),

  delete: (tenantId: string, chatbotId: string) =>
    api.delete(`/api/v1/tenants/${tenantId}/chatbots/${chatbotId}`),

  getEmbedSnippet: (chatbotId: string) => {
    const cdnUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL || 'http://localhost:3002';
    return `<script>
  (function(w,d,s,o,f,js,fjs){
    w['ChatbotX']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','cbx','${cdnUrl}/widget.js'));
  cbx('init', { chatbotId: '${chatbotId}' });
</script>`;
  },
};

export const dashboardApi = {
  getMetrics: (tenantId: string) =>
    api.get<{ success: boolean; data: DashboardMetrics }>(`/api/v1/tenants/${tenantId}/dashboard`),
};

export const analyticsApi = {
  getOverview: (tenantId: string, from: string, to: string) =>
    api.get<{ success: boolean; data: AnalyticsData[] }>(`/api/v1/tenants/${tenantId}/analytics`, {
      params: { from, to },
    }),

  getConversations: (tenantId: string, chatbotId?: string, page = 1, limit = 20) =>
    api.get<{ success: boolean; data: ConversationSummary[]; total: number }>(
      `/api/v1/tenants/${tenantId}/conversations`,
      { params: { chatbotId, page, limit } }
    ),

  getTopQuestions: (tenantId: string, from: string, to: string) =>
    api.get<{ success: boolean; data: Array<{ question: string; count: number }> }>(
      `/api/v1/tenants/${tenantId}/analytics/top-questions`,
      { params: { from, to } }
    ),
};

export const billingApi = {
  getInfo: (tenantId: string) =>
    api.get<{ success: boolean; data: BillingInfo }>(`/api/v1/tenants/${tenantId}/billing`),
};

export const settingsApi = {
  getProfile: (tenantId: string) =>
    api.get<{ success: boolean; data: { name: string; email: string; timezone: string; notifications: Record<string, boolean> } }>(
      `/api/v1/tenants/${tenantId}/settings`
    ),

  updateProfile: (tenantId: string, data: { name?: string; email?: string; timezone?: string; notifications?: Record<string, boolean> }) =>
    api.patch(`/api/v1/tenants/${tenantId}/settings`, data),
};
