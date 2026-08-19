import type {
  ApiResponse,
  BlindBoxOpenResult,
  CartItem,
  CheckoutQuote,
  ChatMessage,
  ConversationSummary,
  ExtractedRequirements,
  DiningRoom,
  MenuItem,
  Order,
  MealMood,
  TasteProfile,
  TasteTag,
  ProviderSource,
  ReorderPreview,
  RecommendationResult,
  Restaurant,
  UserProfile,
} from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export const API_HEALTH_EVENT = 'linxiaodai:api-health';
export type ApiHealthDetail = { state: 'online' | 'offline' | 'degraded'; message?: string };

function broadcastApiHealth(detail: ApiHealthDetail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ApiHealthDetail>(API_HEALTH_EVENT, { detail }));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      signal: options.signal || controller.signal,
    });
  } catch (reason) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const timedOut = reason instanceof DOMException && reason.name === 'AbortError';
    broadcastApiHealth({ state: isOffline ? 'offline' : 'degraded', message: timedOut ? '请求超时' : '服务暂时不可达' });
    if (timedOut) throw new Error('请求超时，请检查网络后重试');
    throw new Error(isOffline ? '当前网络不可用，已为你保留现有内容' : '暂时无法连接服务，请稍后重试');
  } finally {
    globalThis.clearTimeout(timeout);
  }
  broadcastApiHealth({ state: response.status >= 500 ? 'degraded' : 'online' });
  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    broadcastApiHealth({ state: 'degraded', message: '服务返回异常' });
    throw new Error('服务返回异常，请稍后重试');
  }
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
  providers() {
    return request<ProviderSource[]>('/api/providers');
  },
  menuItems(restaurantId?: string) {
    const suffix = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : '';
    return request<MenuItem[]>(`/api/menu-items${suffix}`);
  },
  blindBox(requirements: ExtractedRequirements) {
    return request<BlindBoxOpenResult>('/api/blind-box', {
      method: 'POST',
      body: JSON.stringify(requirements),
    });
  },
  blindBoxFeedback(id: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') {
    return request<{ ok: true }>(`/api/blind-box/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
  orders() {
    return request<Order[]>('/api/orders');
  },
  checkoutQuote(items: CartItem[]) {
    return request<CheckoutQuote>('/api/orders/quote', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
  reorderPreview(id: string) {
    return request<ReorderPreview>(`/api/orders/${id}/reorder-preview`);
  },
  createOrder(items: CartItem[], address: string, note = '') {
    return request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, address, note }),
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
  saveMealReflection(id: string, mood: MealMood, tags: TasteTag[], note = '') {
    return request<{ order: Order; tasteProfile: TasteProfile }>(`/api/orders/${id}/reflection`, {
      method: 'POST',
      body: JSON.stringify({ mood, tags, note }),
    });
  },
  tasteProfile() {
    return request<TasteProfile>('/api/user/taste-profile');
  },
  tastePassport() {
    return request<import('./types').TastePassport>('/api/user/taste-passport');
  },
  weeklyTasteRecap(weekOffset = 0) {
    return request<import('./types').WeeklyTasteRecap>(`/api/user/weekly-taste-recap?weekOffset=${weekOffset}`);
  },
  savedMeals() {
    return request<import('./types').SavedMeal[]>('/api/saved-meals');
  },
  saveMeal(recommendation: RecommendationResult) {
    return request<import('./types').SavedMeal>('/api/saved-meals', {
      method: 'POST',
      body: JSON.stringify({ restaurantId: recommendation.restaurant.id, menuItemIds: recommendation.menuItems.map(item => item.id), reason: recommendation.reason, totalPrice: recommendation.totalPrice }),
    });
  },
  updateSavedMeal(id: string, patch: { title?: string; occasion?: import('./types').SavedMealOccasion; restore?: boolean }) {
    return request<import('./types').SavedMeal>(`/api/saved-meals/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },
  deleteSavedMeal(id: string) {
    return request<{ id: string; deleted: true }>(`/api/saved-meals/${id}`, { method: 'DELETE' });
  },
  createDiningRoom(title: string, requirements: ExtractedRequirements) {
    return request<DiningRoom>('/api/dining-rooms', {
      method: 'POST',
      body: JSON.stringify({ title, requirements }),
    });
  },
  joinDiningRoom(code: string) {
    return request<DiningRoom>('/api/dining-rooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  diningRoom(id: string) {
    return request<DiningRoom>(`/api/dining-rooms/${id}`);
  },
  voteDiningRoom(id: string, candidateIndex: number) {
    return request<DiningRoom>(`/api/dining-rooms/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ candidateIndex }),
    });
  },
};
