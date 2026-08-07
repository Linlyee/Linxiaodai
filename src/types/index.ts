// ========== 用户 & 认证 ==========
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  defaultAddress?: Address;
  preferences: TasteProfile;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  label: string;
  detail: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface TasteProfile {
  spiceLevel: 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
  dietaryPreferences: string[];
  allergies: string[];
  dislikedIngredients: string[];
  budgetRange: { min: number; max: number };
  favoriteCuisines: string[];
}

// ========== 餐厅 & 餐品 ==========
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rating: number;
  ratingCount: number;
  categories: string[];
  address: string;
  lat: number;
  lng: number;
  deliveryFee: number;
  minOrderAmount: number;
  avgDeliveryTime: number; // 分钟
  deliveryRange: number; // 公里
  isOpen: boolean;
  openingHours: string;
  phone: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  category: string;
  spiceLevel: 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
  isVegetarian: boolean;
  ingredients: string[];
  allergens: string[];
  calories: number;
  salesCount: number;
  rating: number;
  tags: string[];
}

// ========== 对话 & Agent ==========
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  extractedRequirements: ExtractedRequirements;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: AgentAction[];
  recommendations?: RecommendationResult[];
  createdAt: string;
}

export interface AgentAction {
  type: 'extract_requirements' | 'recommend' | 'ask_clarification' | 'blind_box' | 'add_to_cart' | 'update_requirements' | 'confirm_order';
  payload: Record<string, unknown>;
}

export interface ExtractedRequirements {
  peopleCount?: number;
  budget?: { min: number; max: number };
  cuisines?: string[];
  spiceLevel?: string;
  mustAvoid?: string[];
  preferredIngredients?: string[];
  deliveryTimeLimit?: number; // 分钟
  location?: { lat: number; lng: number; address: string };
  additionalNotes?: string;
}

export interface RecommendationResult {
  restaurant: Restaurant;
  menuItems: MenuItem[];
  totalPrice: number;
  deliveryFee: number;
  estimatedDeliveryTime: number;
  reason: string;
  score: number;
}

// ========== 盲盒 ==========
export interface BlindBoxResult {
  id: string;
  restaurant: Restaurant;
  menuItem: MenuItem;
  price: number;
  reason: string;
  accepted: boolean | null;
  skippedAt?: string;
  rating?: number;
}

// ========== 购物车 & 订单 ==========
export interface CartItem {
  id: string;
  menuItem: MenuItem;
  restaurant: Restaurant;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  restaurantId?: string; // 同一订单只能来自一家餐厅
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'accepted'
  | 'preparing'
  | 'picked_up'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: Address;
  riderLocation?: { lat: number; lng: number };
  estimatedDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  deliveredAt?: string;
  feedback?: OrderFeedback;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderFeedback {
  rating: number;
  tags: string[];
  comment?: string;
}

// ========== API 通用 ==========
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
