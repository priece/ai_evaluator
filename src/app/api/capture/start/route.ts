import { NextResponse } from 'next/server';
const capture = require('@/lib/capture.js');
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getCameraConfig, saveCameraConfig } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { cameraId, audioId } = await request.json();
    if (!cameraId) {
      return NextResponse.json({ success: false, message: '缺少摄像头ID' }, { status: 400 });
    }
    
    console.log('开始采集请求:', { cameraId, audioId });
    console.log('当前状态:', {
      ffmpegProcess: capture.ffmpegProcess ? capture.ffmpegProcess.pid : 'null',
      activeCameraId: capture.activeCameraId,
      activeAudioId: capture.activeAudioId,
      rotation: capture.rotation
    });
    
    if (capture.ffmpegProcess) {
      console.log('ffmpeg 进程已经在运行，pid:', capture.ffmpegProcess.pid);
      return NextResponse.json({ success: true, message: 'ffmpeg 进程已经在运行' });
    }
    
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
    
    const savedConfig = await getCameraConfig(cameraId);
    const rotation = savedConfig?.rotation || 0;
    
    const transposeMap: Record<number, number> = {
      0: 0,
      90: 1,
      180: 2,
      270: 3
    };
    const transpose = transposeMap[rotation] || 0;
    
    const ffmpegArgs: string[] = [];
    
    if (audioId) {
      ffmpegArgs.push(
        '-f', 'dshow',
        '-i', `video=${cameraId}:audio=${audioId}`
      );
    } else {
      ffmpegArgs.push(
        '-f', 'dshow',
        '-i', `video=${cameraId}`
      );
    }
    
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
      '-ar', '44100',
      '-b:a', '64k',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments+split_by_time',
      '-hls_segment_filename', path.join(hlsDir, 'stream_%06d.ts'),
      path.join(hlsDir, 'stream.m3u8')
    );
    
    console.log('ffmpeg 参数:', ffmpegArgs.join(' '));
    
    const ffmpegCommand = spawn('ffmpeg', ffmpegArgs);
    
    capture.ffmpegProcess = ffmpegCommand;
    capture.activeCameraId = cameraId;
    capture.activeAudioId = audioId || null;
    capture.rotation = rotation;
    
    console.log('ffmpeg 进程已启动:', ffmpegCommand.pid);
    console.log('状态已更新:', {
      ffmpegProcess: capture.ffmpegProcess ? capture.ffmpegProcess.pid : 'null',
      activeCameraId: capture.activeCameraId,
      activeAudioId: capture.activeAudioId,
      rotation: capture.rotation
    });
    
    ffmpegCommand.stdout.on('data', (data: any) => {
      console.log(`[ffmpeg] ${data}`);
    });
    
    ffmpegCommand.stderr.on('data', (data: any) => {
      console.log(`[ffmpeg] ${data}`);
    });
    
    ffmpegCommand.on('close', (code: any) => {
      console.log(`ffmpeg process exited with code ${code}`);
      if (capture.ffmpegProcess === ffmpegCommand) {
        capture.ffmpegProcess = null;
      }
    });
    
    ffmpegCommand.on('error', (err: any) => {
      console.error('ffmpeg 进程错误:', err);
      if (capture.ffmpegProcess === ffmpegCommand) {
        capture.ffmpegProcess = null;
      }
    });
    
    return NextResponse.json({ success: true, message: '开始采集成功', rotation });
  } catch (error) {
    console.error('开始采集失败:', error);
    return NextResponse.json({ success: false, message: '开始采集失败' }, { status: 500 });
  }
}
