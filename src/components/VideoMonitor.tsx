'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

let videojs: any;
if (typeof window !== 'undefined') {
  const videojsModule = require('video.js');
  videojs = videojsModule.default || videojsModule;
  require('video.js/dist/video-js.css');
}

interface VideoMonitorProps {
  selectedSession: any;
  currentRound: any;
  onRoundChange: (round: any) => void;
}

export default function VideoMonitor({ selectedSession, currentRound, onRoundChange }: VideoMonitorProps) {
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/hls/stream.m3u8');
        if (res.ok) {
          const content = await res.text();
          if (content.includes('.ts')) {
            console.log('检测到 m3u8 文件和 ts 切片，开始播放');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            
            if (!playerRef.current && videoRef.current && videojs) {
              playerRef.current = videojs(videoRef.current, {
                autoplay: true,
                controls: true,
                sources: [{ src: '/hls/stream.m3u8', type: 'application/x-mpegURL' }]
              });
            } else if (playerRef.current) {
              playerRef.current.src({ src: '/hls/stream.m3u8', type: 'application/x-mpegURL' });
              playerRef.current.play();
            }
          }
        }
      } catch (error) {
        console.error('轮询 m3u8 文件失败:', error);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await fetch('/api/cameras');
        const data = await res.json();
        if (data.success && data.cameras.length > 0) {
          setCameras(data.cameras);
          
          if (data.isCapturing && data.activeCameraId) {
            setSelectedCamera(data.activeCameraId);
            setIsCapturing(true);
          } else if (data.cameras.length > 0) {
            setSelectedCamera(data.cameras[0].id);
          }
          
          if (data.rotation !== undefined) {
            setRotation(data.rotation);
          }
        }
      } catch (error) {
        console.error('获取摄像头列表失败:', error);
      }
    };
    fetchCameras();
  }, []);

  useEffect(() => {
    if (isCapturing && videoRef.current && videojs) {
      startPolling();
    } else if (!isCapturing && playerRef.current) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      playerRef.current.pause();
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [isCapturing, startPolling]);

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
        if (data.rotation !== undefined) {
          setRotation(data.rotation);
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('启动摄像头失败:', error);
      alert('无法启动摄像头');
    }
  };

  const stopCapture = async () => {
    try {
      const res = await fetch('/api/capture/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsCapturing(false);
      }
    } catch (error) {
      console.error('停止摄像头失败:', error);
    }
  };

  const rotateVideo = async (direction: 'left' | 'right') => {
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        try {
          playerRef.current.reset();
        } catch (e) {
          console.log('reset error:', e);
        }
      }
      
      const res = await fetch('/api/capture/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (data.success) {
        setRotation(data.rotation);
        
        if (playerRef.current) {
          try {
            playerRef.current.dispose();
          } catch (e) {
            console.log('dispose error:', e);
          }
          playerRef.current = null;
        }
        
        setTimeout(() => {
          startPolling();
        }, 1000);
      }
    } catch (error) {
      console.error('旋转失败:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">视频监看</h2>
      </div>
      
      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">选择摄像头</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              disabled={isCapturing}
            >
              <option value="">请选择摄像头</option>
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2 pt-5">
            <button
              onClick={startCapture}
              disabled={isCapturing || !selectedCamera}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始采集
            </button>
            <button
              onClick={stopCapture}
              disabled={!isCapturing}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              停止采集
            </button>
            <button
              onClick={() => rotateVideo('left')}
              disabled={!isCapturing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="左转90度"
            >
              左转
            </button>
            <button
              onClick={() => rotateVideo('right')}
              disabled={!isCapturing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="右转90度"
            >
              右转
            </button>
          </div>
        </div>

        <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <div data-vjs-player className="w-full h-full">
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered vjs-fill"
              playsInline
            />
          </div>
        </div>
      </div>
    </div>
  );
}
