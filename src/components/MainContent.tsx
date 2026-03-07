'use client';

import { useState } from 'react';
import VideoMonitor from '@/components/VideoMonitor';
import BusinessPanel from '@/components/BusinessPanel';

interface User {
  id: string;
  username: string;
  role: string;
}

interface MainContentProps {
  user: User;
  onLogout: () => void;
}

export default function MainContent({ user, onLogout }: MainContentProps) {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);

  const handleSessionChange = (session: any) => {
    setSelectedSession(session);
    setCurrentRound(null);
  };

  const handleRoundChange = (round: any) => {
    setCurrentRound(round);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-md h-14 flex-shrink-0">
        <div className="h-full px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">AI评委数据采集分析系统</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 text-sm">
              欢迎，{user.username} ({user.role === 'admin' ? '管理员' : '访客'})
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      {/* 主内容区域 - 左右布局 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：视频监看区域 */}
        <div className="w-1/2 p-4 border-r border-gray-200">
          <VideoMonitor 
            selectedSession={selectedSession}
            currentRound={currentRound}
            onRoundChange={handleRoundChange}
          />
        </div>

        {/* 右侧：业务区域 */}
        <div className="w-1/2 p-4 overflow-auto">
          <BusinessPanel 
            selectedSession={selectedSession}
            currentRound={currentRound}
            onSessionChange={handleSessionChange}
            onRoundChange={handleRoundChange}
          />
        </div>
      </main>
    </div>
  );
}
