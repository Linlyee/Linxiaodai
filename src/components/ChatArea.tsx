'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chat';
import { useCartStore } from '@/store/cart';
import { ChatMessage } from './ChatMessage';
import { RecommendationCard } from './RecommendationCard';
import { BlindBoxButton } from './BlindBoxButton';

export function ChatArea() {
  const { messages, isLoading, sendMessage, requirements } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    await sendMessage(trimmed);

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRecommendationAction = (action: string, payload?: unknown) => {
    if (action === 'add_to_cart' && payload) {
      const { item, restaurant } = payload as { item: { menuItem: unknown; restaurant: unknown }; restaurant: unknown };
      const cartStore = useCartStore.getState();
      cartStore.addItem(item as never, restaurant as never);
    }
  };

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-14 bg-white border-b border-[#F0E4DA] flex items-center px-6 flex-shrink-0">
        <h1 className="text-lg font-bold text-[#FF6A3D]">🍜 饭小智</h1>
        <span className="text-xs text-gray-400 ml-3">AI 外卖助手</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          messages.map(msg => (
            <div key={msg.id}>
              <ChatMessage message={msg} />
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3 space-y-3">
                  {msg.recommendations.map((rec, idx) => (
                    <RecommendationCard
                      key={idx}
                      recommendation={rec}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 py-4">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[#FF6A3D] rounded-full animate-pulse-dot" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 bg-[#FF6A3D] rounded-full animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 bg-[#FF6A3D] rounded-full animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-sm text-gray-400">饭小智正在思考...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[#F0E4DA] bg-white p-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <BlindBoxButton />

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="告诉饭小智你想吃什么... 比如：两个人吃，想吃辣，60元以内"
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-[#F0E4DA] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6A3D]/20 focus:border-[#FF6A3D] transition-colors text-sm"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 w-8 h-8 bg-[#FF6A3D] text-white rounded-lg flex items-center justify-center hover:bg-[#E55A2F] disabled:opacity-40 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 2L8 14L6 10L2 8Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </main>
  );
}

function WelcomeMessage() {
  const examples = [
    '两个人吃，想吃辣，60元以内',
    '推荐几家日料，不要生鱼片',
    '开个外卖盲盒试试！',
    '换成清淡一点的，预算降到40',
  ];

  const { sendMessage } = useChatStore();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🍜</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">你好，我是饭小智</h2>
        <p className="text-gray-500 mb-8">
          告诉我你想吃什么，我帮你找到最合适的选择
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => sendMessage(ex)}
              className="px-4 py-2 text-sm bg-white border border-[#F0E4DA] rounded-full hover:border-[#FF6A3D] hover:text-[#FF6A3D] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
