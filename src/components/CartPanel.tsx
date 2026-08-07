'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';

type CheckoutStep = 'cart' | 'confirm' | 'paid' | 'tracking';

export function CartPanel() {
  const { items, restaurantName, removeItem, updateQuantity, clearCart } = useCartStore();
  const user = useAuthStore(s => s.user);
  const subtotal = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const deliveryFee = items.length > 0 ? (items[0]?.restaurant.deliveryFee || 5) : 0;
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    const defaultAddress = user?.addresses?.find(a => a.isDefault);
    if (!defaultAddress) {
      setError('请先在个人设置中添加收货地址');
      return;
    }

    setStep('confirm');
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const item = items[0];
      if (!item) return;

      const defaultAddress = user?.addresses?.find(a => a.isDefault);
      if (!defaultAddress) {
        setError('缺少收货地址');
        setIsProcessing(false);
        return;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: item.restaurant.id,
          restaurantName: item.restaurant.name,
          items: items.map(i => ({
            menuItemId: i.menuItem.id,
            name: i.menuItem.name,
            price: i.menuItem.price,
            quantity: i.quantity,
            imageUrl: i.menuItem.imageUrl,
          })),
          subtotal,
          deliveryFee,
          discount: 0,
          total: subtotal + deliveryFee,
          deliveryAddressId: defaultAddress.id,
          estimatedDeliveryTime: item.restaurant.avgDeliveryTime,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Simulate payment
        const payRes = await fetch(`/api/orders/${data.data.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pay', paymentMethod: 'mock' }),
        });
        const payData = await payRes.json();

        if (payData.success) {
          clearCart();
          setTrackingOrderId(data.data.id);
          setStep('paid');
        } else {
          setError(payData.error || '支付失败');
        }
      } else {
        setError(data.error || '下单失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-400 text-center py-8">
          🛒 购物车是空的<br />快去和饭小智聊聊吃什么吧
        </p>
      </div>
    );
  }

  if (step === 'paid' && trackingOrderId) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-bold text-green-600 mb-2">支付成功！</h3>
          <p className="text-sm text-gray-500 mb-4">订单已提交，商家正在准备中</p>
          <p className="text-xs text-gray-400">订单号: {trackingOrderId.slice(0, 8)}...</p>
          <p className="text-xs text-gray-400 mt-2">
            切换到「订单追踪」标签查看实时状态
          </p>
          <button
            onClick={() => { setStep('cart'); setTrackingOrderId(null); }}
            className="mt-6 px-6 py-2 bg-[#FF6A3D] text-white text-sm rounded-xl hover:bg-[#E55A2F] transition-colors"
          >
            再来一单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Restaurant header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800">
          {step === 'confirm' ? '确认订单' : '购物车'}
        </h3>
        {restaurantName && (
          <p className="text-xs text-gray-500 mt-1">来自 {restaurantName}</p>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-[#FFF8F3] rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.menuItem.name}</p>
              <p className="text-xs text-gray-400">¥{item.menuItem.price.toFixed(0)}</p>
            </div>
            {step === 'cart' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded-full border border-gray-200 text-xs flex items-center justify-center hover:bg-gray-100"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded-full border border-gray-200 text-xs flex items-center justify-center hover:bg-gray-100"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-2 text-xs text-red-400 hover:text-red-600"
                >
                  删除
                </button>
              </div>
            )}
            {step === 'confirm' && (
              <span className="text-sm text-gray-500">x{item.quantity}</span>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-[#F0E4DA] pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>商品小计</span>
          <span>¥{subtotal.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>配送费</span>
          <span>¥{deliveryFee.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-gray-800 font-bold text-base pt-2 border-t border-[#F0E4DA]">
          <span>合计</span>
          <span className="text-[#FF6A3D]">¥{(subtotal + deliveryFee).toFixed(0)}</span>
        </div>
      </div>

      {/* Delivery Address */}
      {step === 'confirm' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">送至</p>
          <p className="text-sm font-medium text-gray-800">
            {user?.addresses?.find(a => a.isDefault)?.detail || '未设置地址'}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
      )}

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {step === 'cart' && (
          <>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-[#FF6A3D] text-white font-medium rounded-xl hover:bg-[#E55A2F] transition-colors"
            >
              去结算 ¥{(subtotal + deliveryFee).toFixed(0)}
            </button>
            <button
              onClick={clearCart}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              清空购物车
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? '处理中...' : `确认支付 ¥${(subtotal + deliveryFee).toFixed(0)}`}
            </button>
            <button
              onClick={() => setStep('cart')}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              返回修改
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              🔒 模拟支付，不会实际扣款
            </p>
          </>
        )}
      </div>
    </div>
  );
}
