import { NextResponse } from 'next/server';
const capture = require('@/lib/capture.js');
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { saveCameraConfig } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { direction } = await request.json();
    const currentRotation = capture.rotation || 0;
    
    let newRotation: number;
    if (direction === 'left') {
      newRotation = (currentRotation - 90 + 360) % 360;
    } else if (direction === 'right') {
      newRotation = (currentRotation + 90) % 360;
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '无效的旋转方向' 
      }, { status: 400 });
    }
    
    capture.rotation = newRotation;
    console.log(`旋转角度: ${currentRotation} -> ${newRotation}`);
    
    if (capture.activeCameraId) {
      await saveCameraConfig(capture.activeCameraId, newRotation);
      console.log(`已保存摄像头 ${capture.activeCameraId} 的旋转配置: ${newRotation}`);
    }
    
    if (capture.ffmpegProcess && capture.activeCameraId) {
      console.log('正在重启 ffmpeg 以应用旋转...');
      
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`taskkill /pid ${capture.ffmpegProcess.pid} /T /F`, (err: any) => {
          if (err) {
            console.error('taskkill 失败:', err);
          } else {
            console.log('ffmpeg 进程已停止，准备重启');
            capture.ffmpegProcess = null;
            restartCapture(capture.activeCameraId, newRotation);
          }
        });
      } else {
        capture.ffmpegProcess.kill('SIGTERM');
        capture.ffmpegProcess = null;
        restartCapture(capture.activeCameraId, newRotation);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      rotation: newRotation 
    });
  } catch (error) {
    console.error('旋转失败:', error);
    return NextResponse.json({ 
      success: false, 
      message: '旋转失败' 
    }, { status: 500 });
  }
}

function restartCapture(cameraId: string, rotation: number) {
  const hlsDir = path.join(process.cwd(), 'hls');
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
  }
  
  console.log('清理 hls 目录...');
  const files = fs.readdirSync(hlsDir);
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.m3u8') || file.endsWith('.m3u8.tmp')) {
      const filePath = path.join(hlsDir, file);
      fs.unlinkSync(filePath);
      console.log(`删除文件: ${file}`);
    }
  }
  
  const transposeMap: Record<number, number> = {
    0: 0,
    90: 1,
    180: 2,
    270: 3
  };
  
  const transpose = transposeMap[rotation] || 0;
  
  const ffmpegArgs = [
    '-f', 'dshow',
    '-i', `video=${cameraId}`,
  ];
  
  if (transpose > 0) {
    ffmpegArgs.push('-vf', `transpose=${transpose}`);
  }
  
  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-b:v', '1000k',
    '-maxrate', '1500k',
    '-bufsize', '2000k',
    '-g', '60',
    '-keyint_min', '60',
    '-sc_threshold', '0',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '10',
    '-hls_flags', 'delete_segments+split_by_time',
    '-hls_segment_filename', path.join(hlsDir, 'stream_%06d.ts'),
    path.join(hlsDir, 'stream.m3u8')
  );
  
  const ffmpegCommand = spawn('ffmpeg', ffmpegArgs);
  
  capture.ffmpegProcess = ffmpegCommand;
  console.log('ffmpeg 进程已重启:', ffmpegCommand.pid, '旋转角度:', rotation);
  
  ffmpegCommand.stdout.on('data', (data: any) => {
    console.log(`ffmpeg stdout: ${data}`);
  });
  
  ffmpegCommand.stderr.on('data', (data: any) => {
    console.error(`ffmpeg stderr: ${data}`);
  });
  
  ffmpegCommand.on('close', (code: any) => {
    console.log(`ffmpeg process exited with code ${code}`);
    capture.ffmpegProcess = null;
  });
}
