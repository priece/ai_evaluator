'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from '@/types';
import type { RegularEvaluation as RegularEvaluationType } from '@/types';

// 动态导入 video.js，确保只在客户端使用
let videojs: any;
if (typeof window !== 'undefined') {
  const videojsModule = require('video.js');
  videojs = videojsModule.default || videojsModule;
  require('video.js/dist/video-js.css');
  // video.js 8.x 已经内置了对 HLS 的支持，不需要额外的插件
}

// 声明 video.js 类型
declare global {
  interface Window {
    videojs: any;
  }
}

export default function RegularEvaluation() {
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [evaluations, setEvaluations] = useState<RegularEvaluationType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 获取摄像头列表
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await fetch('/api/cameras');
        const data = await res.json();
        if (data.success && data.cameras.length > 0) {
          setCameras(data.cameras);
          // 自动选择第一个摄像头
          setSelectedCamera(data.cameras[0].id);
        }
      } catch (error) {
        console.error('Failed to get camera list:', error);
      }
    };

    fetchCameras();
  }, []);

  // 获取场次列表
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        if (data.success) {
          setSessions(data.sessions);
        }
      } catch (error) {
        console.error('Failed to get session list:', error);
      }
    };

    fetchSessions();
  }, []);

  // 获取场次评估数据
  const fetchSessionEvaluations = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        const regularEvaluations = data.regularEvaluations || [];
        setEvaluations(regularEvaluations);
        // 根据已有评估记录计算当前轮次
        if (regularEvaluations.length > 0) {
          const maxRound = Math.max(...regularEvaluations.map((e: RegularEvaluationType) => e.round));
          setCurrentRound(maxRound + 1);
        } else {
          setCurrentRound(1);
        }
      }
    } catch (error) {
      console.error('Failed to get evaluation data:', error);
    }
  };

  // 视频播放器逻辑
  useEffect(() => {
    if (isCapturing && videoRef.current && videojs) {
      // 开始轮询 m3u8 文件
      const startPolling = () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }

        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch('/hls/stream.m3u8');
            if (res.ok) {
              const content = await res.text();
              // 检查 m3u8 内容中是否有 ts 文件
              if (content.includes('.ts')) {
                console.log('m3u8 file and TS segment detected, starting playback');
                // 清除轮询
                if (pollingRef.current) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                }
                
                // 初始化或更新播放器
                if (!playerRef.current) {
                  playerRef.current = videojs(videoRef.current, {
                    autoplay: true,
                    controls: true,
                    sources: [
                      {
                        src: '/hls/stream.m3u8',
                        type: 'application/x-mpegURL'
                      }
                    ]
                  });
                } else {
                  playerRef.current.src({
                    src: '/hls/stream.m3u8',
                    type: 'application/x-mpegURL'
                  });
                  playerRef.current.play();
                }
              }
            }
          } catch (error) {
            console.error('Failed to poll m3u8 file:', error);
          }
        }, 3000); // 每 3 秒轮询一次
      };

      startPolling();
    } else if (!isCapturing && playerRef.current) {
      // 停止轮询
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      playerRef.current.pause();
    }
    
    // 清理函数
    return () => {
      // 停止轮询
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [isCapturing]);

  const startCapture = async () => {
    if (!selectedCamera) {
      alert('请选择摄像头');
      return;
    }
    try {
      const res = await fetch('/api/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: selectedCamera }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCapturing(true);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('无法启动摄像头');
    }
  };

  const stopCapture = async () => {
    try {
      const res = await fetch('/api/capture/stop', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setIsCapturing(false);
      }
    } catch (error) {
      console.error('Failed to stop camera:', error);
    }
  };

  const submitEvaluation = async () => {
    if (!session) {
      alert('请先创建或加载场次');
      return;
    }
    try {
      const res = await fetch('/api/regular-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.session_id, round: currentRound }),
      });
      const data = await res.json();
      if (data.success) {
        setLatestScore(data.evaluation.score);
        setCurrentRound(currentRound + 1);
        fetchSessionEvaluations(session.session_id);
      }
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
    }
  };

  const openModal = () => {
    setNewSessionName('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewSessionName('');
  };

  const createNewSession = async () => {
    if (!newSessionName.trim()) {
      alert('请输入场次名称');
      return;
    }
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSessions([...sessions, data.session]);
        setSession(data.session);
        setCurrentRound(1);
        setEvaluations([]);
        setLatestScore(null);
        closeModal();
      } else {
        alert(data.message || '创建场次失败');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('创建场次失败');
    }
  };

  return (
    <div className="p-6 h-full">
      <div className="flex gap-6 h-full">
        {/* 左侧：摄像头控制区域 */}
        <div className="w-1/2 bg-white rounded-lg shadow p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">摄像头监看</h3>
          
          {/* 摄像头选择和控制 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">选择摄像头</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">请选择摄像头</option>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={startCapture}
              disabled={isCapturing || !selectedCamera}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              开始采集
            </button>
            <button
              onClick={stopCapture}
              disabled={!isCapturing}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
            >
              停止采集
            </button>
          </div>
          
          {/* 视频预览 */}
          <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ width: '700px', aspectRatio: '16/9' }}>
            <video ref={videoRef} className="w-full h-full object-contain" />
          </div>
          {isCapturing && (
            <div className="mt-2 text-center text-sm text-gray-500">
              <p>正在采集视频...</p>
            </div>
          )}
        </div>

        {/* 右侧：场次业务区域 */}
        <div className="w-1/2 bg-white rounded-lg shadow p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">评估管理</h3>
          
          {/* 场次选择和新建 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">选择场次</label>
            <div className="flex gap-2">
              <select
                value={session?.session_id || ''}
                onChange={async (e) => {
                  const selectedSession = sessions.find(s => s.session_id === e.target.value);
                  if (selectedSession) {
                    setSession(selectedSession);
                    await fetchSessionEvaluations(selectedSession.session_id);
                  } else {
                    setSession(null);
                    setEvaluations([]);
                    setCurrentRound(1);
                  }
                }}
                className="flex-1 border rounded-lg px-3 py-2"
              >
                <option value="">请选择场次</option>
                {sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={openModal}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 whitespace-nowrap"
              >
                新建场次
              </button>
            </div>
          </div>
          
          {/* 场次信息 */}
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600 mb-1">
              当前轮次: <span className="font-medium text-blue-600">{currentRound}</span>
            </p>
            {session && (
              <p className="text-sm text-gray-600">
                场次: <span className="font-medium">{session.name}</span>
              </p>
            )}
          </div>
          
          {/* 提交评估 */}
          <button
            onClick={submitEvaluation}
            disabled={!session}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 w-full mb-4"
          >
            提交评估
          </button>
          
          {/* 最新评分 */}
          {latestScore !== null && (
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="font-medium text-center">
                最新评分: <span className="text-blue-600 text-xl">{latestScore}</span>
              </p>
            </div>
          )}
          
          {/* 历史评估记录 */}
          <h4 className="text-md font-medium mb-3 text-gray-600">历史评估记录</h4>
          <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
            {evaluations.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 border-b font-medium text-gray-700">轮次</th>
                    <th className="text-left py-2 px-3 border-b font-medium text-gray-700">评分</th>
                    <th className="text-left py-2 px-3 border-b font-medium text-gray-700">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evalItem) => (
                    <tr key={evalItem.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-b">{evalItem.round}</td>
                      <td className="py-2 px-3 border-b font-medium text-blue-600">{evalItem.score}</td>
                      <td className="py-2 px-3 border-b text-gray-500 text-sm">
                        {new Date(evalItem.evaluated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">暂无评估数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新建场次弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">新建场次</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">场次名称</label>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="请输入场次名称"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={createNewSession}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
