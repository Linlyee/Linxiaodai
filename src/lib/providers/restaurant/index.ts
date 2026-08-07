import { RestaurantProvider } from './types';
import { mockRestaurantProvider } from './mock';

export type { RestaurantProvider, RestaurantQuery, MenuItemQuery } from './types';

export function getRestaurantProvider(): RestaurantProvider {
  const provider = process.env.RESTAURANT_PROVIDER || 'mock';

  // Future: support 'meituan', 'eleme' etc.
  switch (provider) {
    case 'mock':
    default:
      return mockRestaurantProvider;
  }
}

export { mockRestaurantProvider };
