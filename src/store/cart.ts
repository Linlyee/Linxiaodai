'use client';

import { create } from 'zustand';
import { CartItem, MenuItem, Restaurant } from '@/types';

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  isOpen: boolean;
  addItem: (menuItem: MenuItem, restaurant: Restaurant, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  restaurantId: null,
  restaurantName: null,
  isOpen: false,

  addItem: (menuItem, restaurant, quantity = 1) => {
    const state = get();

    // If cart has items from a different restaurant, warn
    if (state.restaurantId && state.restaurantId !== restaurant.id) {
      // Clear and start fresh - in a real app we'd show a dialog
      set({ items: [], restaurantId: null, restaurantName: null });
    }

    const existing = state.items.find(i => i.menuItem.id === menuItem.id);
    if (existing) {
      set({
        items: state.items.map(i =>
          i.menuItem.id === menuItem.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        ),
      });
    } else {
      set({
        items: [...state.items, {
          id: crypto.randomUUID(),
          menuItem,
          restaurant,
          quantity,
        }],
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
      });
    }
  },

  removeItem: (itemId) => {
    const state = get();
    const newItems = state.items.filter(i => i.id !== itemId);
    set({
      items: newItems,
      restaurantId: newItems.length > 0 ? state.restaurantId : null,
      restaurantName: newItems.length > 0 ? state.restaurantName : null,
    });
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set(state => ({
      items: state.items.map(i =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    }));
  },

  clearCart: () => set({ items: [], restaurantId: null, restaurantName: null }),

  toggleCart: () => set(state => ({ isOpen: !state.isOpen })),
  setCartOpen: (open) => set({ isOpen: open }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },
}));
