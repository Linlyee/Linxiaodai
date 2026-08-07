'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { AuthModal } from './AuthModal';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, isAuthenticated, isLoading } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetchUser().then(() => {
      // Check if user needs to log in
      const state = useAuthStore.getState();
      if (!state.isAuthenticated) {
        setShowAuth(true);
      }
    });
  }, [fetchUser]);

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FFF8F3]">
        <div className="text-center">
          <div className="text-4xl mb-4">🍜</div>
          <h1 className="text-2xl font-bold text-[#FF6A3D]">饭小智</h1>
          <p className="text-gray-500 mt-2">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && showAuth) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FFF8F3]">
        <AuthModal onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return <>{children}</>;
}
