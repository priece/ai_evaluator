'use client';

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';

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
  };
  session?: {
    session_id: string;
    name: string;
  };
}

interface ScreenPreviewProps {
  refreshKey?: number;
}

export interface ScreenPreviewRef {
  clearEvaluation: () => Promise<void>;
  openScreen: () => void;
  uploadBackground: () => void;
}

const ScreenPreview = forwardRef<ScreenPreviewRef, ScreenPreviewProps>(({ refreshKey }, ref) => {
  const [data, setData] = useState<ScreenData | null>(null);
  const [config, setConfig] = useState<ScreenConfig | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isCleared, setIsCleared] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backgroundTimestamp, setBackgroundTimestamp] = useState(Date.now());
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [maskOpacity, setMaskOpacity] = useState(0.8); // 初始mask透明度
  const [showContent, setShowContent] = useState(false); // 是否显示分数内容
  const prevRefreshKeyRef = useRef(refreshKey);

  const fetchScreenData = async (): Promise<ScreenData | null> => {
    try {
      const res = await fetch('/api/screen');
      const result = await res.json();
      if (result.success) {
        setData(result);
        return result;
      }
      return null;
    } catch (error) {
      console.error('Failed to get screen data:', error);
      return null;
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
      console.error('Failed to get config:', error);
    }
  };

  // 初始化时获取配置和数据
  useEffect(() => {
    const init = async () => {
      await fetchConfig();
      const screenData = await fetchScreenData();
      // 如果有已发布的评估，设置初始状态为显示内容
      if (screenData?.hasPublishedRound) {
        setMaskOpacity(0.8);
        setShowContent(true);
      }
    };
    init();
  }, []);

  // 处理发布动画效果
  useEffect(() => {
    // 检测 refreshKey 是否变化（表示新的发布）
    if (refreshKey !== prevRefreshKeyRef.current) {
      prevRefreshKeyRef.current = refreshKey;
      
      // 重置状态
      setIsCleared(false);
      setCurrentFrame(0);
      setMaskOpacity(0); // 从透明开始
      setShowContent(false); // 先不显示内容
      
      fetchScreenData();
      fetchConfig();
      
      // 开始mask渐变动画：从0到0.8，持续2秒
      const duration = 2000; // 2秒
      const targetOpacity = 0.8;
      const steps = 60; // 动画帧数
      const interval = duration / steps;
      let currentStep = 0;
      
      const animateMask = setInterval(() => {
        currentStep++;
        const newOpacity = (currentStep / steps) * targetOpacity;
        setMaskOpacity(newOpacity);
        
        if (currentStep >= steps) {
          clearInterval(animateMask);
          // 动画结束，显示内容
          setShowContent(true);
        }
      }, interval);
      
      return () => {
        clearInterval(animateMask);
      };
    }
  }, [refreshKey]);

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
    if (frames.length === 0 || isCleared) return;

    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % frames.length);
    };

    animationRef.current = setInterval(animate, 100);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [frames.length, isCleared]);

  const handleClearEvaluation = async () => {
    try {
      // 调用接口清除后台的发布轮次ID
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearPublish' })
      });
      const result = await res.json();
      if (result.success) {
        // 清除页面状态
        setIsCleared(true);
        setCurrentFrame(0);
        setData(null);
      } else {
        alert(result.message || '清除失败');
      }
    } catch (error) {
      console.error('Clear publish error:', error);
      alert('清除失败');
    }
  };

  const handleOpenScreen = () => {
    window.open('/screen', '_blank', 'width=1920,height=1080');
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/screen/upload-background', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (result.success) {
        // 刷新配置以获取新背景
        setBackgroundTimestamp(Date.now());
        await fetchConfig();
        alert('背景图上传成功！');
      } else {
        alert(result.message || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败');
    } finally {
      setIsUploading(false);
      setIsUploadModalOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    clearEvaluation: handleClearEvaluation,
    openScreen: handleOpenScreen,
    uploadBackground: handleUploadClick
  }));

  // 是否显示评估内容（评分、动画、mask）
  const showEvaluationContent = !isCleared && data?.hasPublishedRound;

  return (
    <div className="flex flex-col gap-2">
      {/* 预览窗口 */}
      <div 
        className="flex-shrink-0 flex items-center justify-center relative overflow-hidden rounded-lg border border-gray-700"
        style={{
          width: '400px',
          height: '225px',
          backgroundImage: config?.background ? `url(${config.background}?t=${backgroundTimestamp})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1a1a2e'
        }}
      >
        {showEvaluationContent && (
          <>
            <div 
              className="absolute inset-0 transition-opacity"
              style={{ backgroundColor: `rgba(0, 0, 0, ${maskOpacity})` }}
            ></div>
            {showContent && (
              <div className="flex items-center justify-center z-10" style={{ gap: '10%', transform: 'scale(0.5)', transformOrigin: 'center' }}>
                <div className="flex flex-col items-center justify-center" style={{ width: '40%', height: '80%' }}>
                  <div className="text-white/90 text-xl mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">AI 评分</div>
                  <div className="text-5xl font-bold text-white mb-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)' }}>
                    {data?.round?.score !== null ? data?.round?.score : '--'}
                  </div>
                  <div className="text-white/80 text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">分</div>
                </div>

                {frames.length > 0 && (
                  <div className="flex items-center justify-center" style={{ width: '40%', height: '80%' }}>
                    <img 
                      src={frames[currentFrame]} 
                      alt="motion" 
                      className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
      {/* 清除后或未发布时不显示任何内容，只显示背景图 */}
      </div>

      {/* 上传背景图弹窗 */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">上传背景图</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">选择本地图片文件上传：</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                disabled={isUploading}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                disabled={isUploading}
              >
                取消
              </button>
            </div>
            {isUploading && (
              <div className="mt-2 text-center text-sm text-blue-400">上传中...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ScreenPreview.displayName = 'ScreenPreview';

export default ScreenPreview;
