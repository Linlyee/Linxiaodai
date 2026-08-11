export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'merchant' | 'admin';
  preferences: {
    spiceLevel: SpiceLevel;
    allergies: string[];
    dislikedIngredients: string[];
    budgetMin: number;
    budgetMax: number;
    favoriteCuisines: string[];
  };
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  rating: number;
  ratingCount: number;
  categories: string[];
  address: string;
  deliveryFee: number;
  minOrderAmount: number;
  avgDeliveryTime: number;
  openingHours: string;
  phone: string;
  imageUrl: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  spiceLevel: SpiceLevel;
  ingredients: string[];
  allergens: string[];
  tags: string[];
  calories: number;
  salesCount: number;
  rating: number;
  stock: number;
  isAvailable: boolean;
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

export interface ExtractedRequirements {
  peopleCount?: number;
  budget?: { min: number; max: number };
  cuisines?: string[];
  spiceLevel?: SpiceLevel;
  mustAvoid?: string[];
  deliveryTimeLimit?: number;
  additionalNotes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: RecommendationResult[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  restaurant: Restaurant;
  quantity: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'delivering'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  restaurantName: string;
  items: Array<{
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  estimatedDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
  address?: string;
  note?: string;
  events?: Array<{ status: OrderStatus; note: string; createdAt: string }>;
}

export interface MerchantDashboard {
  restaurant: Restaurant;
  metrics: {
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    activeOrders: number;
  };
  recentOrders: Order[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
