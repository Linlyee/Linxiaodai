'use client';

import { useCartStore } from '@/store/cart';
import { RecommendationResult } from '@/types';

export function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: RecommendationResult;
  index: number;
}) {
  const addItem = useCartStore(s => s.addItem);
  const setCartOpen = useCartStore(s => s.setCartOpen);

  const { restaurant, menuItems, totalPrice, deliveryFee, estimatedDeliveryTime, reason } = recommendation;

  const handleAddAll = () => {
    menuItems.forEach(item => {
      addItem(item as never, restaurant as never);
    });
    setCartOpen(true);
  };

  return (
    <div className="bg-white border border-[#F0E4DA] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow max-w-lg animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-[#FF6A3D] text-white text-xs rounded-full flex items-center justify-center font-bold">
            {index + 1}
          </span>
          <h3 className="font-bold text-gray-800">{restaurant.name}</h3>
          <span className="text-yellow-500 text-sm">⭐{restaurant.rating}</span>
        </div>
        <span className="text-xs text-gray-400">约{estimatedDeliveryTime}分钟</span>
      </div>

      {/* Menu Items */}
      <div className="space-y-2 mb-3">
        {menuItems.map(item => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {item.name}
                {item.spiceLevel !== 'none' && (
                  <span className="ml-1 text-xs">
                    {'🌶️'.repeat(
                      item.spiceLevel === 'mild' ? 1 :
                      item.spiceLevel === 'medium' ? 2 :
                      item.spiceLevel === 'hot' ? 3 : 4
                    )}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 truncate">{item.description}</p>
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <p className="text-sm font-bold text-[#FF6A3D]">¥{item.price.toFixed(0)}</p>
              {item.originalPrice && (
                <p className="text-xs text-gray-400 line-through">¥{item.originalPrice.toFixed(0)}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Price Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>小计 ¥{totalPrice.toFixed(0)}</span>
        <span>配送费 ¥{deliveryFee.toFixed(0)}</span>
        <span className="font-bold text-[#FF6A3D] text-sm">
          合计 ¥{(totalPrice + deliveryFee).toFixed(0)}
        </span>
      </div>

      {/* Reason */}
      <p className="text-xs text-gray-400 mb-3 bg-[#FFF8F3] px-3 py-2 rounded-lg">
        💡 {reason}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleAddAll}
          className="flex-1 py-2 bg-[#FF6A3D] text-white text-sm font-medium rounded-lg hover:bg-[#E55A2F] transition-colors"
        >
          加入购物车
        </button>
        <button
          onClick={() => setCartOpen(true)}
          className="px-4 py-2 border border-[#F0E4DA] text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          查看购物车
        </button>
      </div>
    </div>
  );
}
