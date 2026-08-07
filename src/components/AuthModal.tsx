'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';

export function AuthModal({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@fanxiaozhi.com');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let success: boolean;

    if (mode === 'login') {
      success = await login(email, password);
    } else {
      if (!name.trim()) {
        setError('请输入姓名');
        setLoading(false);
        return;
      }
      success = await register(name, email, password);
    }

    setLoading(false);

    if (success) {
      onSuccess();
    } else {
      setError(mode === 'login' ? '邮箱或密码错误' : '注册失败，请重试');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FFF8F3] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🍜</div>
          <h1 className="text-3xl font-bold text-[#FF6A3D]">饭小智</h1>
          <p className="text-gray-500 mt-2">AI 外卖决策助手</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex mb-6 border-b border-gray-100">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 pb-3 text-center font-medium transition-colors ${
                mode === 'login'
                  ? 'text-[#FF6A3D] border-b-2 border-[#FF6A3D]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 pb-3 text-center font-medium transition-colors ${
                mode === 'register'
                  ? 'text-[#FF6A3D] border-b-2 border-[#FF6A3D]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A3D]/20 focus:border-[#FF6A3D] transition-colors"
                  placeholder="你的称呼"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A3D]/20 focus:border-[#FF6A3D] transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A3D]/20 focus:border-[#FF6A3D] transition-colors"
                placeholder="至少6位"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#FF6A3D] text-white font-medium rounded-xl hover:bg-[#E55A2F] disabled:opacity-50 transition-colors"
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            演示账号: demo@fanxiaozhi.com / demo123
          </p>
        </div>
      </div>
    </div>
  );
}
