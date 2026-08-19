export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'customer';
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
  heatScore: number;
  dataStatus: 'demo' | 'synced';
  syncedAt: string | null;
  provider: {
    key: string;
    name: string;
    orderUrl: string | null;
  };
}

export interface ProviderSource {
  key: string;
  name: string;
  status: 'demo' | 'authorized' | 'error';
  syncMode: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  restaurantCount: number;
  orderRedirectEnabled: boolean;
}

export interface BlindBoxOpenResult {
  boxId: string;
  recommendation: RecommendationResult;
  alternatives: RecommendationResult[];
  dataStatus: 'demo' | 'synced';
  message: string;
}

export interface ExtractedRequirements {
  peopleCount?: number;
  budget?: { min: number; max: number };
  cuisines?: string[];
  spiceLevel?: SpiceLevel;
  mustAvoid?: string[];
  deliveryTimeLimit?: number;
  sortBy?: 'sales' | 'rating' | 'speed' | 'value';
  mealTime?: 'breakfast' | 'lunch' | 'dinner';
  additionalNotes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: RecommendationResult[];
  blindBoxId?: string;
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

export type SavedMealOccasion = 'anytime' | 'workday' | 'reward' | 'together' | 'light';

export interface SavedMeal {
  id: string;
  title: string;
  occasion: SavedMealOccasion;
  reason: string;
  restaurant: Restaurant | null;
  menuItemIds: string[];
  menuItems: MenuItem[];
  snapshotTotal: number;
  currentTotal: number;
  priceChanged: boolean;
  isAvailable: boolean;
  unavailableCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  restaurantId?: string;
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
  fulfillment: {
    providerKey: string;
    providerName: string;
    mode: 'demo' | 'platform';
    isLive: boolean;
    trackingMode: 'simulated' | 'provider_callback';
    trackingUrl: string | null;
    notice: string;
  };
  events?: Array<{ status: OrderStatus; note: string; createdAt: string }>;
  reflection?: MealReflection | null;
}

export type MealMood = 'delighted' | 'comforted' | 'satisfied' | 'not_for_me';
export type TasteTag = 'flavorful' | 'just_right' | 'fresh' | 'generous' | 'fast' | 'surprising' | 'reorder';

export interface MealReflection {
  mood: MealMood;
  tags: TasteTag[];
  note: string;
  createdAt: string;
}

export interface TasteProfile {
  checkInCount: number;
  level: number;
  levelName: string;
  nextLevelAt: number | null;
  favoriteCuisines: string[];
  topTags: TasteTag[];
  dominantMood: MealMood | null;
}

export interface TastePassportStamp {
  cuisine: string;
  label: string;
  description: string;
  unlocked: boolean;
  orderCount: number;
  unlockedAt: string | null;
}

export interface TastePassport {
  stamps: TastePassportStamp[];
  unlockedCount: number;
  totalStamps: number;
  completedOrderCount: number;
  explorerPoints: number;
  weeklyDistinctCount: number;
  weeklyGoal: number;
  weeklyCompleted: boolean;
  suggestedCuisine: string | null;
}

export interface WeeklyTasteRecap {
  weekOffset: number;
  period: { start: string; end: string; label: string };
  hasData: boolean;
  orderCount: number;
  itemCount: number;
  totalSpent: number;
  averageOrderValue: number;
  activeDays: number;
  distinctCuisineCount: number;
  topCuisine: string | null;
  topRestaurant: string | null;
  dominantMood: MealMood | null;
  topTags: TasteTag[];
  mealMoment: { key: string; label: string } | null;
  persona: { title: string; summary: string };
  challenge: { cuisine: string; title: string; description: string; prompt: string };
  shareText: string | null;
}

export interface DiningRoomCandidate {
  index: number;
  votes: number;
  restaurant: Restaurant;
  menuItems: MenuItem[];
  totalPrice: number;
  deliveryFee: number;
  estimatedDeliveryTime: number;
  reason: string;
}

export interface DiningRoom {
  id: string;
  code: string;
  title: string;
  status: 'open' | 'closed' | 'expired';
  isHost: boolean;
  participants: Array<{ id: string; name: string; isHost: boolean; hasVoted: boolean }>;
  candidates: DiningRoomCandidate[];
  myVote: number | null;
  totalVotes: number;
  consensusIndex: number | null;
  createdAt: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
