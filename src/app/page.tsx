'use client';

import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { RightPanel } from '@/components/RightPanel';

export default function Home() {
  return (
    <div className="flex h-screen bg-[#FFF8F3]">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Center Chat Area */}
      <ChatArea />

      {/* Right Panel */}
      <RightPanel />
    </div>
  );
}
