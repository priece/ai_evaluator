'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [showWaveform, setShowWaveform] = useState<boolean>(false);
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const audioPollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioMtimeRef = useRef<number>(0);

  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    console.log('开始轮询 m3u8...');
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/hls/stream.m3u8');
        if (res.ok) {
          const content = await res.text();
          console.log('m3u8 内容:', content.substring(0, 100));
          if (content.includes('.ts')) {
            console.log('检测到 ts 切片，开始播放');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            
            if (playerRef.current) {
              console.log('设置播放器源');
              playerRef.current.src({ src: '/hls/stream.m3u8', type: 'application/x-mpegURL' });
              playerRef.current.play();
            } else {
              console.log('播放器未初始化');
            }
          }
        }
      } catch (error) {
        console.error('轮询 m3u8 失败:', error);
      }
    }, 3000);
  };

  const initWaveSurfer = async () => {
    if (typeof window === 'undefined') return;
    
    if (wavesurferRef.current) return;
    
    setShowWaveform(true);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!waveformRef.current) {
      console.error('waveformRef.current is null');
      return;
    }
    
    try {
      const WaveSurfer = (await import('wavesurfer.js')).default;
      
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4F46E5',
        progressColor: '#818CF8',
        height: 60,
        normalize: true,
        backend: 'WebAudio'
      });
      
      wavesurferRef.current.on('error', (err: any) => {
        console.error('WaveSurfer error:', err);
      });
      
      wavesurferRef.current.on('ready', () => {
        console.log('WaveSurfer ready');
      });
    } catch (error) {
      console.error('初始化 WaveSurfer 失败:', error);
    }
  };

  const checkAndLoadAudio = async () => {
    try {
      const infoRes = await fetch('/api/audio/last_info');
      console.log('audio info response:', infoRes.status);
      
      if (!infoRes.ok) {
        console.log('audio info not ok, hiding waveform');
        setShowWaveform(false);
        lastAudioMtimeRef.current = 0;
        return;
      }
      
      const info = await infoRes.json();
      console.log('audio info:', info);
      
      if (!info.success || !info.filename) {
        setShowWaveform(false);
        return;
      }
      
      if (info.mtime === lastAudioMtimeRef.current) {
        console.log('same mtime, skip loading');
        return;
      }
      
      console.log('new audio file detected:', info.filename);
      lastAudioMtimeRef.current = info.mtime;
      
      if (!wavesurferRef.current) {
        await initWaveSurfer();
      }
      
      if (wavesurferRef.current) {
        console.log('loading audio:', info.filename);
        wavesurferRef.current.load(`/api/audio/file?name=${encodeURIComponent(info.filename)}`);
      }
    } catch (error) {
      console.error('检查音频失败:', error);
    }
  };

  const startAudioPolling = () => {
    if (audioPollingRef.current) {
      clearInterval(audioPollingRef.current);
    }
    
    checkAndLoadAudio();
    
    audioPollingRef.current = setInterval(() => {
      checkAndLoadAudio();
    }, 2000);
  };

  const stopAudioPolling = () => {
    if (audioPollingRef.current) {
      clearInterval(audioPollingRef.current);
      audioPollingRef.current = null;
    }
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/cameras');
        const data = await res.json();
        if (data.success) {
          if (data.cameras && data.cameras.length > 0) {
            setCameras(data.cameras);
          }
          if (data.audioDevices && data.audioDevices.length > 0) {
            setAudioDevices(data.audioDevices);
          }
          
          if (data.isCapturing && data.activeCameraId) {
            setSelectedCamera(data.activeCameraId);
            setIsCapturing(true);
          } else if (data.cameras && data.cameras.length > 0) {
            setSelectedCamera(data.cameras[0].id);
          }
          
          if (data.activeAudioId) {
            setSelectedAudio(data.activeAudioId);
          }
          
          if (data.rotation !== undefined) {
            setRotation(data.rotation);
          }
        }
      } catch (error) {
        console.error('获取设备列表失败:', error);
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !videojs || !videoRef.current) return;
    
    if (!playerRef.current) {
      console.log('初始化播放器');
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);
      
      playerRef.current = videojs(videoElement, {
        autoplay: false,
        controls: true,
        responsive: true,
        fluid: true,
        sources: []
      }, function onPlayerReady() {
        console.log('播放器已就绪');
      });
    }
    
    return () => {
      console.log('组件卸载');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      stopAudioPolling();
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      if (playerRef.current) {
        console.log('销毁播放器');
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log('isCapturing 变化:', isCapturing);
    if (isCapturing) {
      startPolling();
      if (selectedAudio) {
        startAudioPolling();
      }
    } else if (playerRef.current) {
      console.log('停止播放');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      stopAudioPolling();
      playerRef.current.pause();
      playerRef.current.src('');
    }
  }, [isCapturing, selectedAudio]);

  const startCapture = async () => {
    if (!selectedCamera) {
      alert('请选择摄像头');
      return;
    }
    try {
      const res = await fetch('/api/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId: selectedCamera, audioId: selectedAudio || null }),
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
        setShowWaveform(false);
        lastAudioMtimeRef.current = 0;
      }
    } catch (error) {
      console.error('停止摄像头失败:', error);
    }
  };

  const rotateVideo = async (direction: 'left' | 'right') => {
    try {
      console.log('rotateVideo called:', direction, 'isCapturing:', isCapturing);
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.src('');
      }
      
      const res = await fetch('/api/capture/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      console.log('rotate response:', data);
      if (data.success) {
        setRotation(data.rotation);
        
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
      
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center space-x-4 mb-4">
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
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">选择音频源</label>
            <select
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              disabled={isCapturing}
            >
              <option value="">不使用音频</option>
              {audioDevices.map((audio) => (
                <option key={audio.id} value={audio.id}>
                  {audio.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex space-x-2 mb-4">
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

        <div className="flex-1 flex flex-col">
          <div className="w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <div data-vjs-player className="w-full h-full">
              <div ref={videoRef} className="w-full h-full" />
            </div>
          </div>
          
          {showWaveform && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">音频波形</div>
              <div ref={waveformRef} className="w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
