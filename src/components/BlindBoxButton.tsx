'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chat';

export function BlindBoxButton() {
  const [isAnimating, setIsAnimating] = useState(false);
  const sendMessage = useChatStore(s => s.sendMessage);

  const handleClick = async () => {
    setIsAnimating(true);
    await sendMessage('帮我开个外卖盲盒！');
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isAnimating}
      className={`flex-shrink-0 px-4 py-3 bg-gradient-to-br from-yellow-400 to-orange-400 text-white font-bold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all text-sm shadow-md hover:shadow-lg disabled:opacity-50 ${
        isAnimating ? 'animate-blind-box' : ''
      }`}
      title="外卖盲盒"
    >
      <span className="text-lg">🎁</span>
      <span className="ml-1 hidden sm:inline">盲盒</span>
    </button>
  );
}
