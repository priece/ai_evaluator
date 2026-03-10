'use client';

import { useState, useEffect, useRef } from 'react';
import ScreenPreview from './ScreenPreview';

let videojs: any;
if (typeof window !== 'undefined') {
  const videojsModule = require('video.js');
  videojs = videojsModule.default || videojsModule;
  require('video.js/dist/video-js.css');
}

interface User {
  id: string;
  username: string;
  role: string;
}

interface VideoMonitorProps {
  selectedSession: any;
  currentRound: any;
  user: User;
  onRoundChange: (round: any) => void;
  screenRefreshKey?: number;
}

export default function VideoMonitor({ selectedSession, currentRound, user, onRoundChange, screenRefreshKey }: VideoMonitorProps) {
  const isAdmin = user.role === 'admin';
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [showWaveform, setShowWaveform] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
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

    console.log('Start polling m3u8...');
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/hls/stream.m3u8');
        if (res.ok) {
          const content = await res.text();
          console.log('m3u8 content:', content.substring(0, 100));
          if (content.includes('.ts')) {
            console.log('TS segment detected, starting playback');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            
            if (playerRef.current) {
              console.log('Setting player source');
              playerRef.current.src({ src: '/hls/stream.m3u8', type: 'application/x-mpegURL' });
              playerRef.current.play();
            } else {
              console.log('Player not initialized');
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll m3u8:', error);
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
        height: 30,
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
      console.error('Failed to initialize WaveSurfer:', error);
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
      console.error('Failed to check audio:', error);
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
        console.error('Failed to get device list:', error);
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !videojs || !videoRef.current) return;
    
    if (!playerRef.current) {
      console.log('Initializing player');
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
        console.log('Player ready');
      });
    }
    
    return () => {
      console.log('Component unmounting');
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
        console.log('Destroying player');
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log('isCapturing changed:', isCapturing);
    if (isCapturing) {
      startPolling();
      if (selectedAudio) {
        startAudioPolling();
      }
    } else if (playerRef.current) {
      console.log('Stopping playback');
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
      console.error('Failed to start camera:', error);
      alert('无法启动摄像头');
    }
  };

  const stopCapture = async () => {
    try {
      const res = await fetch('/api/capture/stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsCapturing(false);
        // 不再隐藏波形，只是停止轮询更新
        lastAudioMtimeRef.current = 0;
      }
    } catch (error) {
      console.error('Failed to stop camera:', error);
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
      console.error('Failed to rotate:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] rounded-lg shadow-md border border-gray-800">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-100">视频监看</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={isCapturing ? stopCapture : startCapture}
            disabled={!isAdmin || (!isCapturing && !selectedCamera)}
            className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={isCapturing ? '停止采集' : '开始采集'}
          >
            {isCapturing ? (
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-700 transition"
            title="设置"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <div data-vjs-player className="w-full h-full">
              <div ref={videoRef} className="w-full h-full" />
            </div>
          </div>
          
          <div className="mt-2 p-2 bg-[#252525] rounded-lg border border-gray-700">
            <div ref={waveformRef} className="w-full" style={{ minHeight: '30px' }} />
          </div>

          <div className="mt-3 flex items-center justify-center bg-[#252525] rounded-lg border border-gray-700 overflow-hidden" style={{ height: '260px' }}>
            <ScreenPreview refreshKey={screenRefreshKey} />
          </div>
        </div>
      </div>

      {/* 设置面板弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-96 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-gray-100">视频设置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">选择摄像头</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-600 rounded-lg px-3 py-2 text-gray-100"
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
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">选择音频源</label>
                <select
                  value={selectedAudio}
                  onChange={(e) => setSelectedAudio(e.target.value)}
                  className="w-full bg-[#252525] border border-gray-600 rounded-lg px-3 py-2 text-gray-100"
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
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => rotateVideo('left')}
                  disabled={!isCapturing || !isAdmin}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="左转90度"
                >
                  左转
                </button>
                <button
                  onClick={() => rotateVideo('right')}
                  disabled={!isCapturing || !isAdmin}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="右转90度"
                >
                  右转
                </button>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
