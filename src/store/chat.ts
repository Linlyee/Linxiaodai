'use client';

import { create } from 'zustand';
import { ExtractedRequirements, RecommendationResult } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  recommendations?: RecommendationResult[];
  clarificationQuestions?: string[];
  action?: string;
  createdAt: string;
}

interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  requirements: ExtractedRequirements;
  isLoading: boolean;
  error: string | null;
  setConversationId: (id: string | null) => void;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  conversations: Array<{ id: string; title: string; createdAt: string; updatedAt: string }>;
  loadConversations: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messages: [],
  requirements: {},
  isLoading: false,
  error: null,
  conversations: [],

  setConversationId: (id) => set({ conversationId: id }),

  sendMessage: async (message: string) => {
    const state = get();
    set({ isLoading: true, error: null });

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    set({ messages: [...state.messages, userMsg] });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: state.conversationId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.data.message.content,
          recommendations: data.data.message.recommendations,
          clarificationQuestions: data.data.message.clarificationQuestions,
          action: data.data.message.action,
          createdAt: new Date().toISOString(),
        };

        set({
          conversationId: data.data.conversationId,
          messages: [...get().messages, assistantMsg],
          requirements: data.data.extractedRequirements || {},
          isLoading: false,
        });
      } else {
        set({
          isLoading: false,
          error: data.error || '消息发送失败',
        });
      }
    } catch {
      set({
        isLoading: false,
        error: '网络错误，请稍后重试',
      });
    }
  },

  clearChat: () => set({
    conversationId: null,
    messages: [],
    requirements: {},
    error: null,
  }),

  loadConversation: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/chat?id=${id}`);
      const data = await res.json();
      if (data.success) {
        set({
          conversationId: data.data.id,
          messages: (data.data.messages as ChatMessage[]).map((m, i) => ({
            ...m,
            id: m.id || `msg-${i}`,
            createdAt: m.createdAt || new Date().toISOString(),
          })),
          requirements: data.data.extractedRequirements || {},
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  loadConversations: async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      if (data.success) {
        set({ conversations: data.data });
      }
    } catch {
      // Silently fail
    }
  },
}));
