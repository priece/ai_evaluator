'use client';

import { useEffect, useState, useRef } from 'react';

interface MotionConfig {
  id: string;
  image: string;
  frames: string[];
}

interface ScreenConfig {
  background: string;
  motions: MotionConfig[];
}

interface ScreenData {
  hasPublishedRound: boolean;
  round?: {
    id: string;
    round_number: number;
    score: number | null;
    status: number;
    submit: number;
  };
  session?: {
    session_id: string;
    name: string;
  };
}

export default function ScreenPage() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [backgroundTimestamp, setBackgroundTimestamp] = useState(Date.now());
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const fetchScreenData = async () => {
    try {
      const res = await fetch('/api/screen');
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to get screen data:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/screen/config');
      const result = await res.json();
      if (result.success) {
        setConfig({
          background: result.background,
          motions: result.motions
        });
        setBackgroundTimestamp(Date.now());
      }
    } catch (error) {
      console.error('Failed to get config:', error);
    }
  };

  useEffect(() => {
    fetchScreenData();
    fetchConfig();
    const dataInterval = setInterval(fetchScreenData, 5000);
    const configInterval = setInterval(fetchConfig, 5000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(configInterval);
    };
  }, []);

  useEffect(() => {
    if (data && config) {
      setLoading(false);
    }
  }, [data, config]);

  const getMotionByScore = (score: number | null): MotionConfig | null => {
    if (score === null || !config) return null;
    
    if (score >= 0 && score <= 39) {
      return config.motions.find(m => m.id === 'motion_00') || null;
    } else if (score >= 40 && score <= 79) {
      return config.motions.find(m => m.id === 'motion_01') || null;
    } else if (score >= 80 && score <= 100) {
      return config.motions.find(m => m.id === 'motion_02') || null;
    }
    return null;
  };

  const currentMotion = getMotionByScore(data?.round?.score || null);
  const frames = currentMotion?.frames || [];

  useEffect(() => {
    if (frames.length === 0) return;

    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    };

    animationRef.current = setInterval(animate, 100);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [frames.length]);

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: config?.background ? `url(${config.background}?t=${backgroundTimestamp})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1a1a2e'
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="text-white text-3xl font-bold animate-pulse z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Loading...</div>
      </div>
    );
  }

  if (!data || !data.hasPublishedRound) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: config?.background ? `url(${config.background}?t=${backgroundTimestamp})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1a1a2e'
        }}
      >
        {/* 未发布时只显示背景图，不显示任何内容 */}
      </div>
    );
  }

  const { round } = data;

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: config?.background ? `url(${config.background}?t=${backgroundTimestamp})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1a1a2e'
      }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="flex items-center justify-center gap-16 z-10">
        <div className="w-96 h-96 flex flex-col items-center justify-center">
          <div className="text-white/90 text-3xl mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">AI 评分</div>
          <div className="text-8xl font-bold text-white mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)' }}>
            {round?.score !== null ? round?.score : '--'}
          </div>
          <div className="text-white/80 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">分</div>
        </div>

        {frames.length > 0 && (
          <div className="w-96 h-96 flex items-center justify-center">
            <img 
              src={frames[currentFrame]} 
              alt="motion" 
              className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
