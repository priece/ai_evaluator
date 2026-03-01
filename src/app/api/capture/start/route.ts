import { NextResponse } from 'next/server';
import * as capture from '@/lib/capture.js';
const ffmpeg = require('fluent-ffmpeg');
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const { cameraId } = await request.json();
    if (!cameraId) {
      return NextResponse.json({ success: false, message: '缺少摄像头ID' }, { status: 400 });
    }
    
    // 检查是否已经有 ffmpeg 进程在运行
    if (capture.ffmpegProcess) {
      console.log('ffmpeg 进程已经在运行，不需要启动新进程');
      return NextResponse.json({ success: true, message: 'ffmpeg 进程已经在运行' });
    }
    
    // 确保 hls 目录存在
    const hlsDir = path.join(process.cwd(), 'hls');
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }
    
    // 清理 hls 目录下的切片和索引文件
    console.log('清理 hls 目录...');
    const files = fs.readdirSync(hlsDir);
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.m3u8') || file.endsWith('.m3u8.tmp')) {
        const filePath = path.join(hlsDir, file);
        fs.unlinkSync(filePath);
        console.log(`删除文件: ${file}`);
      }
    }
    
    // 构建 ffmpeg 命令
    const ffmpegCommand = spawn('ffmpeg', [
      '-f', 'dshow',
      '-i', `video=${cameraId}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', '1000k',
      '-maxrate', '1500k',
      '-bufsize', '2000k',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', path.join(hlsDir, 'stream_%03d.ts'),
      path.join(hlsDir, 'stream.m3u8')
    ]);
    
    // 保存 ffmpeg 进程
    capture.ffmpegProcess = ffmpegCommand;
    console.log('ffmpeg 进程已启动:', ffmpegCommand.pid);
    
    // 处理 ffmpeg 输出
    ffmpegCommand.stdout.on('data', (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });
    
    ffmpegCommand.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data}`);
    });
    
    ffmpegCommand.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
      capture.ffmpegProcess = null;
    });
    
    return NextResponse.json({ success: true, message: '开始采集成功' });
  } catch (error) {
    console.error('开始采集失败:', error);
    return NextResponse.json({ success: false, message: '开始采集失败' }, { status: 500 });
  }
}
