import { NextResponse } from 'next/server';
const capture = require('@/lib/capture.js');
import { logInfo, logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    logInfo('停止采集请求');
    logInfo(`当前状态: ffmpegProcess=${capture.ffmpegProcess ? capture.ffmpegProcess.pid : 'null'}, activeCameraId=${capture.activeCameraId}, activeAudioId=${capture.activeAudioId}, rotation=${capture.rotation}`);
    
    if (capture.captureInterval) {
      clearInterval(capture.captureInterval);
      capture.captureInterval = null;
      logInfo('定时任务已清除');
    }
    
    if (capture.ffmpegProcess) {
      logInfo(`正在停止 ffmpeg 进程: ${capture.ffmpegProcess.pid}`);
      
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process');
          execSync(`taskkill /pid ${capture.ffmpegProcess.pid} /T /F`, { timeout: 5000 });
          logInfo('ffmpeg 进程已通过 taskkill 停止');
        } catch (killError: any) {
          logError(`taskkill 失败: ${killError.message}`);
        }
      } else {
        capture.ffmpegProcess.kill('SIGTERM');
        logInfo('ffmpeg 进程已发送 SIGTERM');
      }
      
      capture.ffmpegProcess = null;
      capture.activeCameraId = null;
      capture.activeAudioId = null;
      logInfo('状态已清理');
    } else {
      logInfo('没有正在运行的 ffmpeg 进程');
    }
    
    logInfo(`停止后状态: ffmpegProcess=${capture.ffmpegProcess ? capture.ffmpegProcess.pid : 'null'}, activeCameraId=${capture.activeCameraId}, activeAudioId=${capture.activeAudioId}, rotation=${capture.rotation}`);
    
    return NextResponse.json({ success: true, message: '停止采集成功' });
  } catch (error) {
    logError(`停止采集失败: ${error}`);
    return NextResponse.json({ success: false, message: '停止采集失败' }, { status: 500 });
  }
}
