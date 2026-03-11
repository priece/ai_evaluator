'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [highlightRound, setHighlightRound] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [screenRefreshKey, setScreenRefreshKey] = useState(0);
  const logPollingRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const lastLogTimeRef = useRef<string | null>(null);

  const handleSessionChange = (session: any) => {
    setSelectedSession(session);
    setCurrentRound(null);
    setHighlightRound(null);
  };

  const handleRoundChange = (round: any) => {
    setHighlightRound(round);
  };

  const handleRoundUpdate = (round: any) => {
    setCurrentRound(round);
    setHighlightRound(round);
  };

  const handlePublish = () => {
    setScreenRefreshKey(prev => prev + 1);
  };

  const fetchLogs = async () => {
    try {
      let url = '/api/logs';
      if (lastLogTimeRef.current) {
        url += `?from=${encodeURIComponent(lastLogTimeRef.current)}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.logs) {
        if (data.logs.length > 0) {
          setLogs(prev => [...prev, ...data.logs]);
          
          // 解析新格式: [级别] __yyyyMMddTHHmmss.SSS__  消息详细
          const lastLog = data.logs[data.logs.length - 1];
          const timestampMatch = lastLog.match(/__(\d{8}T\d{6}\.\d{3})__/);
          if (timestampMatch) {
            lastLogTimeRef.current = timestampMatch[1];
          }
        }
      }
    } catch (error) {
      console.error('Failed to get logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    logPollingRef.current = setInterval(fetchLogs, 2000);
    
    return () => {
      if (logPollingRef.current) {
        clearInterval(logPollingRef.current);
        logPollingRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const renderLog = (log: string) => {
    // 新格式: [级别] __yyyyMMddTHHmmss.SSS__  消息详细
    // 例如: [CAPTURE] __20260311T142519.588__  消息内容
    
    // 检查是否为新格式（以[级别]开头）
    const levelMatch = log.match(/^\s*(\[[^\]]+\])/);
    if (!levelMatch) {
      return <span className="text-gray-400">{log}</span>;
    }
    
    const level = levelMatch[1];
    const afterLevel = log.slice(levelMatch[0].length).trim();
    
    // 检查是否包含 __时间__ 格式
    const timeMatch = afterLevel.match(/^__(.+?)__/);
    if (timeMatch) {
      // 新格式
      const timestamp = timeMatch[1];
      const message = afterLevel.slice(timeMatch[0].length).trim();
      
      let levelColor = 'text-gray-400';
      if (level === '[CAPTURE]' || level === '[INFO]') levelColor = 'text-green-400';
      else if (level === '[ERROR]') levelColor = 'text-red-400';
      else if (level === '[WARN]') levelColor = 'text-yellow-400';
      else if (level === '[DEBUG]') levelColor = 'text-blue-400';
      
      return (
        <>
          <span className={levelColor}>{level}</span>
          <span className="text-gray-500"> </span>
          <span className="text-cyan-500">__{timestamp}__</span>
          <span className="text-gray-500">  </span>
          <span className="text-gray-400">{message}</span>
        </>
      );
    }
    
    // 兼容旧格式: [2026-03-10 19:44:00.123] [INFO] message
    // 检查第一个中括号是否为时间戳格式
    const isOldTimestamp = level.match(/^\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3}\]$/);
    if (isOldTimestamp) {
      // 旧格式，第一个是时间戳，查找后面的级别
      const nextLevelMatch = afterLevel.match(/^\s*(\[(INFO|ERROR|WARN|DEBUG)\])/);
      if (nextLevelMatch) {
        const nextLevel = nextLevelMatch[1];
        const rest = afterLevel.slice(nextLevelMatch[0].length);
        
        let levelColor = 'text-gray-400';
        if (nextLevel === '[INFO]') levelColor = 'text-green-400';
        else if (nextLevel === '[ERROR]') levelColor = 'text-red-400';
        else if (nextLevel === '[WARN]') levelColor = 'text-yellow-400';
        else if (nextLevel === '[DEBUG]') levelColor = 'text-blue-400';
        
        return (
          <>
            <span className="text-cyan-500">{level}</span>
            <span className="text-gray-500"> </span>
            <span className={levelColor}>{nextLevel}</span>
            <span className="text-gray-400">{rest}</span>
          </>
        );
      }
      
      return (
        <>
          <span className="text-cyan-500">{level}</span>
          <span className="text-gray-400">{afterLevel}</span>
        </>
      );
    }
    
    // 其他情况，直接显示
    return (
      <>
        <span className="text-gray-400">{log}</span>
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f]">
      {/* 顶部导航栏 */}
      <nav className="bg-[#1a1a1a] shadow-md h-14 flex-shrink-0 border-b border-gray-800">
        <div className="h-full px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-400">AI评委数据采集分析系统</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm">
              欢迎，{user.username} ({user.role === 'admin' ? '管理员' : '访客'})
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      {/* 主内容区域 - 三列布局 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：视频监看区域 */}
        <div className="w-2/5 p-4 border-r border-gray-800">
          <VideoMonitor 
            selectedSession={selectedSession}
            currentRound={currentRound}
            user={user}
            onRoundChange={handleRoundChange}
            screenRefreshKey={screenRefreshKey}
          />
        </div>

        {/* 中间：场次管理区域 */}
        <div className="w-2/5 p-4 overflow-auto border-r border-gray-800">
          <BusinessPanel 
            selectedSession={selectedSession}
            currentRound={currentRound}
            highlightRound={highlightRound}
            user={user}
            onSessionChange={handleSessionChange}
            onRoundChange={handleRoundChange}
            onRoundUpdate={handleRoundUpdate}
            onPublish={handlePublish}
          />
        </div>

        {/* 右侧：系统日志区域 */}
        <div className="w-1/5 p-4 overflow-hidden flex flex-col">
          <div 
            ref={logContainerRef}
            className="flex-1 bg-[#1a1a1a] rounded-lg p-3 overflow-y-auto font-mono text-xs text-gray-400 border border-gray-800"
          >
            {logs.length === 0 ? (
              <div className="text-gray-600">暂无日志</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap break-all py-0.5">
                  {renderLog(log)}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
