import { Restaurant, MenuItem } from '@/types';

export interface RestaurantQuery {
  ids?: string[];
  categories?: string[];
  minRating?: number;
  maxDeliveryTime?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MenuItemQuery {
  ids?: string[];
  restaurantId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  spiceLevel?: string;
  isVegetarian?: boolean;
  excludeAllergens?: string[];
  excludeIngredients?: string[];
  search?: string;
  sortBy?: 'price' | 'rating' | 'salesCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface RestaurantProvider {
  name: string;
  getRestaurants(query: RestaurantQuery): Promise<Restaurant[]>;
  getRestaurantById(id: string): Promise<Restaurant | null>;
  getMenuItems(query: MenuItemQuery): Promise<MenuItem[]>;
  getMenuItemById(id: string): Promise<MenuItem | null>;
}
