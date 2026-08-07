'use client';

import { useEffect, useState, useCallback } from 'react';

interface OrderData {
  id: string;
  restaurantName: string;
  status: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  riderLat?: number;
  riderLng?: number;
  estimatedDeliveryTime: number;
  createdAt: string;
  deliveredAt?: string;
  paidAt?: string;
  feedback?: { rating: number; tags: string[]; comment?: string };
}

const STATUS_FLOW = [
  { key: 'pending_payment', label: '待支付', icon: '💳' },
  { key: 'paid', label: '已支付', icon: '✅' },
  { key: 'accepted', label: '商家接单', icon: '👨‍🍳' },
  { key: 'preparing', label: '制作中', icon: '🍳' },
  { key: 'picked_up', label: '骑手取餐', icon: '🛵' },
  { key: 'delivering', label: '配送中', icon: '📦' },
  { key: 'completed', label: '已完成', icon: '🎉' },
  { key: 'cancelled', label: '已取消', icon: '❌' },
];

export function OrderTracker() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<OrderData | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleTrackOrder = async (orderId: string) => {
    setActiveOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setTrackingOrder(data.data);
      }
    } catch {
      // ignore
    }

    // Subscribe to SSE
    try {
      const eventSource = new EventSource(`/api/orders/${orderId}/sse`);
      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data);
        if (update.type === 'status_change') {
          setTrackingOrder(prev => prev ? { ...prev, status: update.status } : prev);
        }
      };
      return () => eventSource.close();
    } catch {
      // SSE not available in some environments
    }
  };

  const currentStatusIndex = (status: string) =>
    STATUS_FLOW.findIndex(s => s.key === status);

  if (activeOrderId && trackingOrder) {
    return (
      <div className="p-4">
        <button
          onClick={() => { setActiveOrderId(null); setTrackingOrder(null); }}
          className="text-sm text-[#FF6A3D] mb-4 hover:underline"
        >
          ← 返回订单列表
        </button>

        <h3 className="text-sm font-bold text-gray-800 mb-1">{trackingOrder.restaurantName}</h3>
        <p className="text-xs text-gray-400 mb-4">订单号: {trackingOrder.id.slice(0, 8)}...</p>

        {/* Status Timeline */}
        <div className="space-y-0">
          {STATUS_FLOW.filter(s => s.key !== 'cancelled').map((s, idx) => {
            const currentIdx = currentStatusIndex(trackingOrder.status);
            const isDone = idx <= currentIdx && trackingOrder.status !== 'cancelled';
            const isCurrent = idx === currentIdx;

            return (
              <div key={s.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isDone ? 'bg-[#FF6A3D] text-white' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-2 ring-[#FF6A3D] ring-offset-2' : ''}`}>
                    {s.icon}
                  </div>
                  {idx < STATUS_FLOW.length - 2 && (
                    <div className={`w-0.5 h-8 ${isDone ? 'bg-[#FF6A3D]' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="pb-2">
                  <p className={`text-sm ${isDone ? 'font-bold text-gray-800' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                  {isCurrent && trackingOrder.status === 'delivering' && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      🛵 骑手位置: {trackingOrder.riderLat?.toFixed(4)}, {trackingOrder.riderLng?.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Items */}
        <div className="mt-4 pt-4 border-t border-[#F0E4DA]">
          <p className="text-xs text-gray-500 mb-2">订单餐品</p>
          {(trackingOrder.items as Array<{ name: string; quantity: number; price: number }>).map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-gray-800">{item.name} x{item.quantity}</span>
              <span className="text-gray-500">¥{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100 mt-2">
            <span>合计</span>
            <span className="text-[#FF6A3D]">¥{trackingOrder.total.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">我的订单</h3>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">暂无订单</p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div
              key={order.id}
              className="p-3 bg-white border border-[#F0E4DA] rounded-xl cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => handleTrackOrder(order.id)}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-sm font-medium text-gray-800">{order.restaurantName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  order.status === 'completed' ? 'bg-green-50 text-green-600' :
                  order.status === 'cancelled' ? 'bg-gray-50 text-gray-400' :
                  'bg-orange-50 text-orange-600'
                }`}>
                  {STATUS_FLOW.find(s => s.key === order.status)?.label || order.status}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>¥{order.total.toFixed(0)}</span>
                <span>{new Date(order.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
