import { RestaurantProvider, RestaurantQuery, MenuItemQuery } from './types';
import { Restaurant, MenuItem } from '@/types';
import { prisma } from '@/lib/db';

// In-memory cache for when database is not available
let cachedRestaurants: Restaurant[] | null = null;
let cachedMenuItems: MenuItem[] | null = null;

function mapRestaurantFromDB(db: Record<string, unknown>): Restaurant {
  return {
    id: db.id as string,
    name: db.name as string,
    description: db.description as string,
    imageUrl: db.imageUrl as string,
    rating: db.rating as number,
    ratingCount: db.ratingCount as number,
    categories: db.categories as string[],
    address: db.address as string,
    lat: db.lat as number,
    lng: db.lng as number,
    deliveryFee: db.deliveryFee as number,
    minOrderAmount: db.minOrderAmount as number,
    avgDeliveryTime: db.avgDeliveryTime as number,
    deliveryRange: db.deliveryRange as number,
    isOpen: db.isOpen as boolean,
    openingHours: db.openingHours as string,
    phone: db.phone as string,
  };
}

function mapMenuItemFromDB(db: Record<string, unknown>): MenuItem {
  return {
    id: db.id as string,
    restaurantId: db.restaurantId as string,
    name: db.name as string,
    description: db.description as string,
    imageUrl: db.imageUrl as string,
    price: db.price as number,
    originalPrice: db.originalPrice as number | undefined,
    category: db.category as string,
    spiceLevel: db.spiceLevel as string,
    isVegetarian: db.isVegetarian as boolean,
    ingredients: db.ingredients as string[],
    allergens: db.allergens as string[],
    calories: db.calories as number,
    salesCount: db.salesCount as number,
    rating: db.rating as number,
    tags: db.tags as string[],
  };
}

function computeDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const mockRestaurantProvider: RestaurantProvider = {
  name: 'mock',

  async getRestaurants(query: RestaurantQuery): Promise<Restaurant[]> {
    let restaurants: Restaurant[];

    try {
      const dbs = await prisma.restaurant.findMany({
        include: { menuItems: true },
      });
      restaurants = dbs.map(r => mapRestaurantFromDB(r as unknown as Record<string, unknown>));
    } catch {
      // Fallback to seed data if DB not available
      restaurants = cachedRestaurants || [];
    }

    // Apply filters
    if (query.ids) {
      restaurants = restaurants.filter(r => query.ids!.includes(r.id));
    }
    if (query.categories) {
      restaurants = restaurants.filter(r =>
        r.categories.some(c => query.categories!.includes(c))
      );
    }
    if (query.minRating) {
      restaurants = restaurants.filter(r => r.rating >= query.minRating!);
    }
    if (query.maxDeliveryTime) {
      restaurants = restaurants.filter(r => r.avgDeliveryTime <= query.maxDeliveryTime!);
    }
    if (query.lat != null && query.lng != null && query.radius) {
      restaurants = restaurants.filter(
        r => computeDistance(query.lat!, query.lng!, r.lat, r.lng) <= query.radius!
      );
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      restaurants = restaurants.filter(
        r =>
          r.name.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.categories.some(c => c.toLowerCase().includes(s))
      );
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return restaurants.slice(offset, offset + limit);
  },

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      const db = await prisma.restaurant.findUnique({ where: { id } });
      if (!db) return null;
      return mapRestaurantFromDB(db as unknown as Record<string, unknown>);
    } catch {
      return cachedRestaurants?.find(r => r.id === id) || null;
    }
  },

  async getMenuItems(query: MenuItemQuery): Promise<MenuItem[]> {
    let items: MenuItem[];

    try {
      const dbs = await prisma.menuItem.findMany();
      items = dbs.map(m => mapMenuItemFromDB(m as unknown as Record<string, unknown>));
    } catch {
      items = cachedMenuItems || [];
    }

    if (query.ids) {
      items = items.filter(i => query.ids!.includes(i.id));
    }
    if (query.restaurantId) {
      items = items.filter(i => i.restaurantId === query.restaurantId);
    }
    if (query.category) {
      items = items.filter(i => i.category === query.category);
    }
    if (query.minPrice != null) {
      items = items.filter(i => i.price >= query.minPrice!);
    }
    if (query.maxPrice != null) {
      items = items.filter(i => i.price <= query.maxPrice!);
    }
    if (query.spiceLevel) {
      items = items.filter(i => i.spiceLevel === query.spiceLevel);
    }
    if (query.isVegetarian) {
      items = items.filter(i => i.isVegetarian);
    }
    if (query.excludeAllergens?.length) {
      items = items.filter(i =>
        !query.excludeAllergens!.some(a => i.allergens.includes(a))
      );
    }
    if (query.excludeIngredients?.length) {
      items = items.filter(i =>
        !query.excludeIngredients!.some(ing => i.ingredients.some(itemIng => itemIng.includes(ing)))
      );
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        i =>
          i.name.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s) ||
          i.tags.some(t => t.toLowerCase().includes(s))
      );
    }

    const sortBy = query.sortBy || 'salesCount';
    const sortOrder = query.sortOrder || 'desc';
    items.sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      return multiplier * ((a[sortBy] as number) - (b[sortBy] as number));
    });

    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return items.slice(offset, offset + limit);
  },

  async getMenuItemById(id: string): Promise<MenuItem | null> {
    try {
      const db = await prisma.menuItem.findUnique({ where: { id } });
      if (!db) return null;
      return mapMenuItemFromDB(db as unknown as Record<string, unknown>);
    } catch {
      return cachedMenuItems?.find(i => i.id === id) || null;
    }
  },
};
