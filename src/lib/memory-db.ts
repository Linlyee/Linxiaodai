/**
 * In-memory database for running without PostgreSQL.
 * Provides a Prisma-compatible API using in-memory arrays.
 */
import bcrypt from 'bcryptjs';
import { seedData } from './seed-data';

// ---- Types ----
interface StoreUser {
  id: string; name: string; email: string; passwordHash: string;
  phone: string | null; avatar: string | null;
}
interface StoreTasteProfile {
  id: string; userId: string; spiceLevel: string;
  dietaryPreferences: string[]; allergies: string[]; dislikedIngredients: string[];
  budgetMin: number; budgetMax: number; favoriteCuisines: string[];
}
interface StoreAddress {
  id: string; userId: string; label: string; detail: string;
  lat: number; lng: number; isDefault: boolean;
}
interface StoreRestaurant {
  id: string; name: string; description: string; imageUrl: string;
  rating: number; ratingCount: number; categories: string[];
  address: string; lat: number; lng: number; deliveryFee: number;
  minOrderAmount: number; avgDeliveryTime: number; deliveryRange: number;
  isOpen: boolean; openingHours: string; phone: string;
}
interface StoreMenuItem {
  id: string; restaurantId: string; name: string; description: string; imageUrl: string;
  price: number; originalPrice: number | null; category: string; spiceLevel: string;
  isVegetarian: boolean; ingredients: string[]; allergens: string[];
  calories: number; salesCount: number; rating: number; tags: string[];
}
interface StoreOrder {
  id: string; userId: string; restaurantId: string; restaurantName: string;
  items: unknown; subtotal: number; deliveryFee: number; discount: number; total: number;
  status: string; deliveryAddressId: string; riderLat: number | null; riderLng: number | null;
  estimatedDeliveryTime: number; createdAt: Date; updatedAt: Date;
  paidAt: Date | null; deliveredAt: Date | null;
  address?: StoreAddress; feedback?: { rating: number; tags: string[]; comment: string | null };
}
interface StoreConversation {
  id: string; userId: string; title: string;
  messages: unknown; extractedRequirements: unknown;
  createdAt: Date; updatedAt: Date;
}
interface StoreFavorite {
  id: string; userId: string; restaurantId: string;
  restaurant?: StoreRestaurant;
}
interface StoreBlindBox {
  id: string; userId: string; restaurantId: string; menuItemId: string;
  reason: string; accepted: boolean | null; rating: number | null;
}
interface StoreFeedback {
  id: string; orderId: string; userId: string;
  rating: number; tags: string[]; comment: string | null;
}

// ---- Memory Store ----
const store = {
  users: [] as StoreUser[],
  tasteProfiles: [] as StoreTasteProfile[],
  addresses: [] as StoreAddress[],
  restaurants: [] as StoreRestaurant[],
  menuItems: [] as StoreMenuItem[],
  orders: [] as StoreOrder[],
  conversations: [] as StoreConversation[],
  favorites: [] as StoreFavorite[],
  blindBoxes: [] as StoreBlindBox[],
  feedbacks: [] as StoreFeedback[],
};

let initialized = false;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function initMemoryDB() {
  if (initialized) return;
  initialized = true;

  // Seed restaurants
  for (const r of seedData.restaurants) {
    store.restaurants.push({ id: uuid(), ...r, isOpen: true });
  }

  // Seed menu items
  for (const item of seedData.menuItems) {
    const restaurant = store.restaurants.find(r => r.name === item.restaurantName);
    if (restaurant) {
      store.menuItems.push({
        id: uuid(),
        restaurantId: restaurant.id,
        name: item.name,
        description: item.description || '',
        imageUrl: '/images/food-placeholder.svg',
        price: item.price,
        originalPrice: item.originalPrice || null,
        category: item.category || '主菜',
        spiceLevel: item.spiceLevel || 'none',
        isVegetarian: false,
        ingredients: item.ingredients || [],
        allergens: item.allergens || [],
        calories: item.calories || 300,
        salesCount: item.salesCount || 100,
        rating: item.rating || 4.5,
        tags: item.tags || [],
      });
    }
  }

  // Create demo user with pre-computed bcrypt hash for 'demo123'
  const pwHash = bcrypt.hashSync('demo123', 12);
  const userId = uuid();
  store.users.push({
    id: userId, name: '演示用户', email: 'demo@fanxiaozhi.com',
    passwordHash: pwHash, phone: '13800138000', avatar: null,
  });
  store.tasteProfiles.push({
    id: uuid(), userId, spiceLevel: 'medium',
    dietaryPreferences: [], allergies: [], dislikedIngredients: ['香菜'],
    budgetMin: 20, budgetMax: 80, favoriteCuisines: ['川菜', '日料'],
  });
  store.addresses.push({
    id: uuid(), userId, label: '公司',
    detail: '北京市朝阳区建国路100号',
    lat: 39.9042, lng: 116.4074, isDefault: true,
  });

  console.log(`[MemoryDB] 初始化完成: ${store.restaurants.length}家餐厅, ${store.menuItems.length}个餐品`);
}

// ---- Prisma-like API ----
export const memDB = {
  get store() { return store; },

  // User
  async findUserByEmail(email: string) {
    return store.users.find(u => u.email === email) || null;
  },
  async findUserById(id: string) {
    return store.users.find(u => u.id === id) || null;
  },
  async createUser(data: { name: string; email: string; passwordHash: string }) {
    const user: StoreUser = { id: uuid(), ...data, phone: null, avatar: null };
    store.users.push(user);
    return user;
  },
  async findTasteProfile(userId: string) {
    return store.tasteProfiles.find(t => t.userId === userId) || null;
  },
  async upsertTasteProfile(userId: string, data: Partial<StoreTasteProfile>) {
    let profile = store.tasteProfiles.find(t => t.userId === userId);
    if (profile) {
      Object.assign(profile, data);
    } else {
      profile = {
        id: uuid(), userId,
        spiceLevel: data.spiceLevel || 'medium',
        dietaryPreferences: data.dietaryPreferences || [],
        allergies: data.allergies || [],
        dislikedIngredients: data.dislikedIngredients || [],
        budgetMin: data.budgetMin || 20,
        budgetMax: data.budgetMax || 80,
        favoriteCuisines: data.favoriteCuisines || [],
      };
      store.tasteProfiles.push(profile);
    }
    return profile;
  },

  // Address
  async findAddresses(userId: string) {
    return store.addresses.filter(a => a.userId === userId)
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  },
  async findAddressById(id: string) {
    return store.addresses.find(a => a.id === id) || null;
  },
  async createAddress(data: Omit<StoreAddress, 'id'>) {
    const addr: StoreAddress = { id: uuid(), ...data };
    store.addresses.push(addr);
    return addr;
  },
  async deleteAddress(id: string) {
    const idx = store.addresses.findIndex(a => a.id === id);
    if (idx >= 0) store.addresses.splice(idx, 1);
  },
  async updateAddresses(userId: string, data: Partial<StoreAddress>) {
    store.addresses.forEach(a => { if (a.userId === userId) Object.assign(a, data); });
  },

  // Restaurant
  async findRestaurants(filter?: (r: StoreRestaurant) => boolean) {
    let list = store.restaurants;
    if (filter) list = list.filter(filter);
    return list;
  },
  async findRestaurantById(id: string) {
    return store.restaurants.find(r => r.id === id) || null;
  },

  // MenuItem
  async findMenuItems(filter?: (m: StoreMenuItem) => boolean) {
    let list = store.menuItems;
    if (filter) list = list.filter(filter);
    return list;
  },
  async findMenuItemById(id: string) {
    return store.menuItems.find(m => m.id === id) || null;
  },

  // Conversation
  async findConversations(userId: string) {
    return store.conversations
      .filter(c => c.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }));
  },
  async findConversation(id: string) {
    return store.conversations.find(c => c.id === id) || null;
  },
  async createConversation(data: { userId: string; title: string; messages: unknown; extractedRequirements: unknown }) {
    const conv: StoreConversation = {
      id: uuid(), ...data,
      createdAt: new Date(), updatedAt: new Date(),
    };
    store.conversations.push(conv);
    return conv;
  },
  async updateConversation(id: string, data: { messages?: unknown; extractedRequirements?: unknown; updatedAt?: Date }) {
    const conv = store.conversations.find(c => c.id === id);
    if (conv) {
      if (data.messages !== undefined) conv.messages = data.messages;
      if (data.extractedRequirements !== undefined) conv.extractedRequirements = data.extractedRequirements;
      conv.updatedAt = data.updatedAt || new Date();
    }
    return conv;
  },

  // Order
  async findOrders(userId: string, status?: string) {
    let list = store.orders.filter(o => o.userId === userId);
    if (status) list = list.filter(o => o.status === status);
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
  async findOrder(id: string) {
    const order = store.orders.find(o => o.id === id);
    if (order) {
      order.address = store.addresses.find(a => a.id === order.deliveryAddressId);
      order.feedback = store.feedbacks.find(f => f.orderId === id) as StoreFeedback || undefined;
    }
    return order || null;
  },
  async createOrder(data: Omit<StoreOrder, 'id' | 'createdAt' | 'updatedAt' | 'paidAt' | 'deliveredAt' | 'address' | 'feedback'>) {
    const order: StoreOrder = {
      id: uuid(), ...data,
      createdAt: new Date(), updatedAt: new Date(),
      paidAt: null, deliveredAt: null,
      address: undefined, feedback: undefined,
    };
    store.orders.push(order);
    return order;
  },
  async updateOrder(id: string, data: Partial<StoreOrder>) {
    const order = store.orders.find(o => o.id === id);
    if (order) {
      Object.assign(order, data);
      order.updatedAt = new Date();
    }
    return order;
  },

  // Favorites
  async findFavorites(userId: string) {
    return store.favorites.filter(f => f.userId === userId).map(f => ({
      ...f,
      restaurant: store.restaurants.find(r => r.id === f.restaurantId),
    }));
  },
  async toggleFavorite(userId: string, restaurantId: string) {
    const idx = store.favorites.findIndex(f => f.userId === userId && f.restaurantId === restaurantId);
    if (idx >= 0) {
      store.favorites.splice(idx, 1);
      return null;
    }
    const fav: StoreFavorite = { id: uuid(), userId, restaurantId };
    store.favorites.push(fav);
    return fav;
  },
  async removeFavorite(userId: string, restaurantId: string) {
    const idx = store.favorites.findIndex(f => f.userId === userId && f.restaurantId === restaurantId);
    if (idx >= 0) store.favorites.splice(idx, 1);
  },

  // BlindBox
  async createBlindBox(data: Omit<StoreBlindBox, 'id'>) {
    const bb: StoreBlindBox = { id: uuid(), ...data };
    store.blindBoxes.push(bb);
    return bb;
  },

  // Feedback
  async createFeedback(data: Omit<StoreFeedback, 'id'>) {
    const fb: StoreFeedback = { id: uuid(), ...data };
    store.feedbacks.push(fb);
    return fb;
  },
};
