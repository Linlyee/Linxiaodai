import type {
  ApiResponse,
  CartItem,
  ChatMessage,
  ConversationSummary,
  ExtractedRequirements,
  MenuItem,
  Order,
  RecommendationResult,
  Restaurant,
  UserProfile,
} from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || '请求失败');
  }
  return payload.data;
}

export const api = {
  login(email: string, password: string) {
    return request<UserProfile>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  register(name: string, email: string, password: string) {
    return request<UserProfile>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },
  logout() {
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return request<UserProfile>('/api/auth/me');
  },
  conversations() {
    return request<ConversationSummary[]>('/api/chat');
  },
  conversation(id: string) {
    return request<{
      id: string;
      title: string;
      messages: ChatMessage[];
      extractedRequirements: ExtractedRequirements;
    }>(`/api/chat?id=${encodeURIComponent(id)}`);
  },
  sendMessage(message: string, conversationId?: string | null) {
    return request<{
      conversationId: string;
      message: ChatMessage;
      extractedRequirements: ExtractedRequirements;
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    });
  },
  restaurants() {
    return request<Restaurant[]>('/api/restaurants');
  },
  menuItems(restaurantId?: string) {
    const suffix = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : '';
    return request<MenuItem[]>(`/api/menu-items${suffix}`);
  },
  blindBox(requirements: ExtractedRequirements) {
    return request<RecommendationResult>('/api/blind-box', {
      method: 'POST',
      body: JSON.stringify(requirements),
    });
  },
  orders() {
    return request<Order[]>('/api/orders');
  },
  createOrder(items: CartItem[]) {
    return request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
  payOrder(id: string) {
    return request<Order>(`/api/orders/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'pay' }),
    });
  },
  cancelOrder(id: string) {
    return request<Order>(`/api/orders/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel' }),
    });
  },
  merchantDashboard() {
    return request<import('./types').MerchantDashboard>('/api/merchant/dashboard');
  },
  merchantOrders() {
    return request<Order[]>('/api/merchant/orders');
  },
  updateMerchantOrder(id: string, action: string, note = '') {
    return request<Order>(`/api/merchant/orders/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  },
  merchantMenuItems() {
    return request<MenuItem[]>('/api/merchant/menu-items');
  },
};
