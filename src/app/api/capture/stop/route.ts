import { NextResponse } from 'next/server';
const capture = require('@/lib/capture.js');

export async function POST() {
  try {
    console.log('停止采集请求，当前 ffmpeg 进程:', capture.ffmpegProcess ? capture.ffmpegProcess.pid : 'null');
    
    // 清除定时任务
    if (capture.captureInterval) {
      clearInterval(capture.captureInterval);
      capture.captureInterval = null;
      console.log('定时任务已清除');
    }
    
    // 停止 ffmpeg 进程
    if (capture.ffmpegProcess) {
      console.log('正在停止 ffmpeg 进程:', capture.ffmpegProcess.pid);
      
      // 在 Windows 上，需要使用 taskkill 来强制终止进程树
      if (process.platform === 'win32') {
        try {
          const { exec } = require('child_process');
          exec(`taskkill /pid ${capture.ffmpegProcess.pid} /T /F`, (err: any) => {
            if (err) {
              console.error('taskkill 失败:', err);
            } else {
              console.log('ffmpeg 进程已通过 taskkill 停止');
            }
          });
        } catch (killError) {
          console.error('停止 ffmpeg 进程失败:', killError);
        }
      } else {
        // Linux/Mac 使用 kill
        capture.ffmpegProcess.kill('SIGTERM');
      }
      
      capture.ffmpegProcess = null;
      capture.activeCameraId = null;
      console.log('ffmpeg 进程已停止');
    } else {
      console.log('没有正在运行的 ffmpeg 进程');
    }
    
    return NextResponse.json({ success: true, message: '停止采集成功' });
  } catch (error) {
    console.error('停止采集失败:', error);
    return NextResponse.json({ success: false, message: '停止采集失败' }, { status: 500 });
  }
}
