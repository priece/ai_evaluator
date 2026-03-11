'use client';

import { useEffect, useState, useRef } from 'react';

interface MotionConfig {
  id: string;
  image: string;
  frames: string[];
}

interface ScreenConfig {
  background: string;
  backgroundSize: number;
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

// 大屏状态枚举
// 0 - 背景态：只显示背景图
// 1 - Mask动画态：mask从透明渐变到半透明
// 2 - 评估和动图态：显示评分和播放动图
// 3 - 动图结束态：动图播放完毕，停在最后一帧
enum ScreenState {
  BACKGROUND = 0,
  MASK_ANIMATION = 1,
  EVALUATION_PLAYING = 2,
  MOTION_ENDED = 3
}

export default function ScreenPage() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>(ScreenState.BACKGROUND);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [backgroundTimestamp, setBackgroundTimestamp] = useState(Date.now());
  const [maskOpacity, setMaskOpacity] = useState(0);
  
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundSizeRef = useRef<number>(0);
  const prevHasPublishedRoundRef = useRef<boolean>(false);
  const maskAnimationRef = useRef<NodeJS.Timeout | null>(null);

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
        const newBackgroundSize = result.backgroundSize || 0;
        
        // 只有当背景图大小变化时才更新时间戳，触发刷新
        if (newBackgroundSize !== backgroundSizeRef.current) {
          backgroundSizeRef.current = newBackgroundSize;
          setBackgroundTimestamp(Date.now());
        }
        
        setConfig({
          background: result.background,
          backgroundSize: newBackgroundSize,
          motions: result.motions
        });
      }
    } catch (error) {
      console.error('Failed to get config:', error);
    }
  };

  useEffect(() => {
    fetchScreenData();
    fetchConfig();
    const dataInterval = setInterval(fetchScreenData, 3000);
    const configInterval = setInterval(fetchConfig, 3000);
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

  // 检测发布状态变化，触发状态机
  useEffect(() => {
    const hasPublishedRound = data?.hasPublishedRound || false;
    
    // 从未发布变为发布状态时，进入Mask动画态
    if (hasPublishedRound && !prevHasPublishedRoundRef.current) {
      // 重置状态
      setCurrentFrame(0);
      setMaskOpacity(0);
      setScreenState(ScreenState.MASK_ANIMATION);
      
      // 清理之前的动画
      if (maskAnimationRef.current) {
        clearInterval(maskAnimationRef.current);
      }
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      
      // 开始mask渐变动画：从0到0.8，持续2秒
      const duration = 2000; // 2秒
      const targetOpacity = 0.8;
      const steps = 60;
      const interval = duration / steps;
      let currentStep = 0;
      
      maskAnimationRef.current = setInterval(() => {
        currentStep++;
        const newOpacity = (currentStep / steps) * targetOpacity;
        setMaskOpacity(newOpacity);
        
        if (currentStep >= steps) {
          if (maskAnimationRef.current) {
            clearInterval(maskAnimationRef.current);
            maskAnimationRef.current = null;
          }
          // Mask动画结束，进入评估和动图态
          setScreenState(ScreenState.EVALUATION_PLAYING);
        }
      }, interval);
    }
    
    // 如果发布状态变为false，重置到背景态
    if (!hasPublishedRound && prevHasPublishedRoundRef.current) {
      setScreenState(ScreenState.BACKGROUND);
      setMaskOpacity(0);
      setCurrentFrame(0);
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }
    
    prevHasPublishedRoundRef.current = hasPublishedRound;
    
    return () => {
      if (maskAnimationRef.current) {
        clearInterval(maskAnimationRef.current);
      }
    };
  }, [data?.hasPublishedRound]);

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

  // 动图动画 - 只在评估和动图态播放
  useEffect(() => {
    // 清理之前的动画
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    // 只在评估和动图态播放
    if (frames.length === 0 || screenState !== ScreenState.EVALUATION_PLAYING) return;

    const animate = () => {
      setCurrentFrame(prev => {
        const nextFrame = prev + 1;
        // 如果下一帧是最后一帧，播放完后进入结束态
        if (nextFrame >= frames.length) {
          // 已经播放完所有帧，进入结束态
          if (animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
          }
          setScreenState(ScreenState.MOTION_ENDED);
          return prev; // 停在最后一帧
        }
        return nextFrame;
      });
    };

    animationRef.current = setInterval(animate, 100);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [frames.length, screenState]);

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

  // 状态0：背景态
  if (!data || !data.hasPublishedRound || screenState === ScreenState.BACKGROUND) {
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
        {/* 背景态：只显示背景图，不显示任何内容 */}
      </div>
    );
  }

  const { round } = data;

  // 状态1：Mask动画态、状态2：评估和动图态、状态3：动图结束态
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
      <div 
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${maskOpacity})` }}
      ></div>
      {/* 状态2和状态3：显示评分和动图 */}
      {(screenState === ScreenState.EVALUATION_PLAYING || screenState === ScreenState.MOTION_ENDED) && (
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
      )}
    </div>
  );
}