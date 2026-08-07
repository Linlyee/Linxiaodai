'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart';
import { useChatStore } from '@/store/chat';
import { CartPanel } from './CartPanel';
import { OrderTracker } from './OrderTracker';

type PanelTab = 'requirements' | 'cart' | 'tracking';

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>('requirements');
  const itemCount = useCartStore(s => s.getItemCount());
  const requirements = useChatStore(s => s.requirements);
  const hasRequirements = Object.keys(requirements).length > 0;

  return (
    <aside className="w-80 h-screen bg-white border-l border-[#F0E4DA] flex flex-col flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-[#F0E4DA]">
        {[
          { key: 'requirements', label: '需求摘要', icon: '📝' },
          { key: 'cart', label: '购物车', icon: '🛒', badge: itemCount },
          { key: 'tracking', label: '订单追踪', icon: '📍' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as PanelTab)}
            className={`flex-1 py-3 text-xs font-medium relative transition-colors ${
              activeTab === tab.key
                ? 'text-[#FF6A3D] border-b-2 border-[#FF6A3D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="text-sm mb-0.5">{tab.icon}</div>
            {tab.label}
            {tab.badge ? (
              <span className="absolute top-1 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'requirements' && (
          <RequirementsSummary requirements={requirements} />
        )}
        {activeTab === 'cart' && <CartPanel />}
        {activeTab === 'tracking' && <OrderTracker />}
      </div>
    </aside>
  );
}

function RequirementsSummary({ requirements }: { requirements: Record<string, unknown> }) {
  const entries = Object.entries(requirements).filter(([, v]) => {
    if (v == null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'object' && Object.keys(v as object).length === 0) return false;
    return true;
  });

  const labels: Record<string, string> = {
    peopleCount: '用餐人数',
    budget: '预算',
    cuisines: '菜系偏好',
    spiceLevel: '辣度',
    mustAvoid: '忌口',
    deliveryTimeLimit: '配送时间',
    additionalNotes: '备注',
  };

  const spiceLabels: Record<string, string> = {
    none: '不辣', mild: '微辣', medium: '中辣', hot: '辣', extra_hot: '特辣',
  };

  const formatValue = (key: string, val: unknown): string => {
    if (key === 'spiceLevel') return spiceLabels[val as string] || String(val);
    if (key === 'budget') {
      const b = val as { min: number; max: number };
      return `¥${b.min} - ¥${b.max}`;
    }
    if (key === 'deliveryTimeLimit') return `${val} 分钟`;
    if (Array.isArray(val)) return val.join('、');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3">当前需求</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          还没有提取到需求<br />在对话中告诉饭小智你想吃什么吧
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, val]) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 bg-[#FFF8F3] rounded-lg">
              <span className="text-xs text-gray-500">{labels[key] || key}</span>
              <span className="text-sm font-medium text-gray-800">{formatValue(key, val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Blind box tip */}
      <div className="mt-6 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100">
        <p className="text-sm font-bold text-gray-800 mb-1">🎁 外卖盲盒</p>
        <p className="text-xs text-gray-500">
          不知道吃什么？试试外卖盲盒，在遵守你的口味和预算的前提下随机推荐！
        </p>
      </div>
    </div>
  );
}
