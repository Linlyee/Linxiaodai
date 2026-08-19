import type {
  ApiResponse,
  BlindBoxOpenResult,
  CartItem,
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
