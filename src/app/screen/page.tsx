'use client';

import { useEffect, useState } from 'react';

interface MotionConfig {
  id: string;
  image: string;
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

  const fetchScreenData = async () => {
    try {
      const res = await fetch('/api/screen');
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('获取大屏数据失败:', error);
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
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

  useEffect(() => {
    fetchScreenData();
    fetchConfig();
    const interval = setInterval(fetchScreenData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (data && config) {
      setLoading(false);
    }
  }, [data, config]);

  // 根据分数获取对应的 motion 图片
  const getMotionImage = (score: number | null): string | null => {
    if (score === null || !config) return null;
    
    // 将分数转换为整数，例如 5.4 -> 5
    const scoreInt = Math.floor(score);
    const motion = config.motions.find(m => m.id === String(scoreInt));
    return motion?.image || null;
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: config?.background ? `url(${config.background})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1a1a2e'
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="text-white text-3xl font-bold animate-pulse z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">加载中...</div>
      </div>
    );
  }

  if (!data || !data.hasPublishedRound) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: config?.background ? `url(${config.background})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1a1a2e'
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="text-center z-10">
          <div className="text-white text-6xl font-bold mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">尚未发布</div>
          <div className="text-white/80 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">等待最新轮次发布结果...</div>
        </div>
      </div>
    );
  }

  const { round } = data;
  const motionImage = getMotionImage(round?.score || null);

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: config?.background ? `url(${config.background})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1a1a2e'
      }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="flex items-center justify-center gap-16 z-10">
        {/* 评分显示 */}
        <div className="w-96 h-96 flex flex-col items-center justify-center">
          <div className="text-white/90 text-3xl mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">AI 评分</div>
          <div className="text-8xl font-bold text-white mb-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)' }}>
            {round?.score !== null ? round?.score : '--'}
          </div>
          <div className="text-white/80 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">分</div>
        </div>

        {/* Motion 图片 */}
        {motionImage && (
          <div className="w-96 h-96 flex items-center justify-center">
            <img 
              src={motionImage} 
              alt="motion" 
              className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
