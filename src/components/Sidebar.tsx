'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { conversations, loadConversations, loadConversation, clearChat } = useChatStore();
  const [activeTab, setActiveTab] = useState<'chats' | 'orders' | 'favorites' | 'profile'>('chats');

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewChat = () => {
    clearChat();
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-[#F0E4DA] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-[#F0E4DA]">
        <button
          onClick={handleNewChat}
          className="w-full py-2.5 bg-[#FF6A3D] text-white rounded-xl font-medium hover:bg-[#E55A2F] transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          新对话
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex border-b border-[#F0E4DA]">
        {[
          { key: 'chats', label: '对话', icon: '💬' },
          { key: 'orders', label: '订单', icon: '📋' },
          { key: 'favorites', label: '收藏', icon: '⭐' },
          { key: 'profile', label: '我的', icon: '👤' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#FF6A3D] border-b-2 border-[#FF6A3D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="text-lg mb-0.5">{tab.icon}</div>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'chats' && (
          <div className="space-y-1">
            {conversations.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                暂无对话记录<br />点击上方按钮开始
              </p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="w-full text-left p-3 rounded-xl hover:bg-[#FFF8F3] transition-colors group"
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'favorites' && <FavoritesTab />}
        {activeTab === 'profile' && <ProfileTab user={user} onLogout={logout} />}
      </div>

      {/* User Info */}
      <div className="p-3 border-t border-[#F0E4DA]">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-[#FF6A3D] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {(user?.name || 'U')[0]}
          </div>
          <span className="text-gray-700 text-sm truncate">{user?.name || '用户'}</span>
        </div>
      </div>
    </aside>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<Array<{ id: string; restaurantName: string; status: string; total: number; createdAt: string }>>([]);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { if (d.success) setOrders(d.data); })
      .catch(() => {});
  }, []);

  const statusLabel: Record<string, string> = {
    pending_payment: '待支付',
    paid: '已支付',
    accepted: '商家接单',
    preparing: '制作中',
    picked_up: '骑手取餐',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  };

  const statusColor: Record<string, string> = {
    pending_payment: 'text-yellow-500',
    paid: 'text-blue-500',
    accepted: 'text-blue-500',
    preparing: 'text-orange-500',
    picked_up: 'text-orange-500',
    delivering: 'text-purple-500',
    completed: 'text-green-500',
    cancelled: 'text-gray-400',
  };

  return (
    <div className="space-y-2">
      {orders.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">暂无订单</p>
      ) : (
        orders.map(order => (
          <div key={order.id} className="p-3 bg-white border border-[#F0E4DA] rounded-xl">
            <p className="text-sm font-medium text-gray-800 truncate">{order.restaurantName}</p>
            <p className={`text-xs ${statusColor[order.status] || 'text-gray-500'}`}>
              {statusLabel[order.status] || order.status}
            </p>
            <p className="text-xs text-gray-500">¥{order.total.toFixed(0)}</p>
          </div>
        ))
      )}
    </div>
  );
}

function FavoritesTab() {
  const [favorites, setFavorites] = useState<Array<{ id: string; name: string; rating: number }>>([]);

  useEffect(() => {
    fetch('/api/user/favorites')
      .then(r => r.json())
      .then(d => { if (d.success) setFavorites(d.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-2">
      {favorites.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">暂无收藏餐厅</p>
      ) : (
        favorites.map(r => (
          <div key={r.id} className="p-3 bg-white border border-[#F0E4DA] rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-gray-800">{r.name}</span>
            <span className="text-xs text-yellow-500">⭐{r.rating}</span>
          </div>
        ))
      )}
    </div>
  );
}

function ProfileTab({ user, onLogout }: { user: { name: string; email: string } | null; onLogout: () => void }) {
  return (
    <div className="space-y-3">
      <div className="p-4 bg-white border border-[#F0E4DA] rounded-xl">
        <p className="text-sm font-medium text-gray-800">{user?.name || '用户'}</p>
        <p className="text-xs text-gray-500 mt-1">{user?.email || ''}</p>
      </div>
      <button
        onClick={onLogout}
        className="w-full py-2.5 text-sm text-red-500 font-medium border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
      >
        退出登录
      </button>
    </div>
  );
}
