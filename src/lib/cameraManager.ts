import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logInfo, logError, logWarn } from './logger';
import { createRecordDir, startFileWatcher, getHlsDir, cleanHlsDir } from './recorder';

const transposeMap: Record<number, number> = {
  0: 0,
  90: 1,
  180: 2,
  270: 3
};

export interface CaptureState {
  ffmpegProcess: ReturnType<typeof spawn> | null;
  activeCameraId: string | null;
  activeAudioId: string | null;
  rotation: number;
  recordDir: string | null;
  fileWatcher: fs.FSWatcher | null;
}

declare global {
  var cameraManagerState: CaptureState | undefined;
}

global.cameraManagerState = global.cameraManagerState || {
  ffmpegProcess: null,
  activeCameraId: null,
  activeAudioId: null,
  rotation: 0,
  recordDir: null,
  fileWatcher: null
};

const state = global.cameraManagerState;

export function getState(): CaptureState {
  return state;
}

export function isRunning(): boolean {
  return state.ffmpegProcess !== null;
}

export function getRotation(): number {
  return state.rotation;
}

export function setRotation(rotation: number): void {
  state.rotation = rotation;
}

export async function startCapture(cameraId: string, audioId: string | null, rotation?: number): Promise<{ success: boolean; message: string; rotation: number; recordDir?: string }> {
  logInfo(`开始采集: cameraId=${cameraId}, audioId=${audioId}, rotation=${rotation}`);
  
  if (state.ffmpegProcess) {
    logWarn(`ffmpeg 进程已经在运行，pid: ${state.ffmpegProcess.pid}`);
    return { success: true, message: 'ffmpeg 进程已经在运行', rotation: state.rotation };
  }
  
  const hlsDir = getHlsDir();
  cleanHlsDir(hlsDir);
  
  const recordDir = createRecordDir();
  state.recordDir = recordDir;
  
  const actualRotation = rotation ?? state.rotation;
  state.rotation = actualRotation;
  
  const transpose = transposeMap[actualRotation] || 0;
  
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
    ffmpegArgs.push('-vf', `transpose=${transpose},scale=1280:720`);
  } else {
    ffmpegArgs.push('-vf', 'scale=1280:720');
  }
  
  ffmpegArgs.push(
    '-aspect', '16:9',
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
  
  logInfo(`ffmpeg 参数: ${ffmpegArgs.join(' ')}`);
  
  const ffmpegCommand = spawn('ffmpeg', ffmpegArgs);
  
  state.ffmpegProcess = ffmpegCommand;
  state.activeCameraId = cameraId;
  state.activeAudioId = audioId;
  
  const fileWatcher = startFileWatcher(hlsDir, recordDir);
  state.fileWatcher = fileWatcher;
  
  logInfo(`ffmpeg 进程已启动: ${ffmpegCommand.pid}`);
  
  ffmpegCommand.stdout.on('data', (data: any) => {
    logInfo(`[ffmpeg] ${data}`);
  });
  
  ffmpegCommand.stderr.on('data', (data: any) => {
    logInfo(`[ffmpeg] ${data}`);
  });
  
  ffmpegCommand.on('close', (code: any) => {
    logInfo(`ffmpeg process exited with code ${code}`);
    cleanup();
  });
  
  ffmpegCommand.on('error', (err: any) => {
    logError(`ffmpeg 进程错误: ${err}`);
    cleanup();
  });
  
  return { success: true, message: '开始采集成功', rotation: actualRotation, recordDir };
}

export async function stopCapture(): Promise<{ success: boolean; message: string }> {
  logInfo('停止采集');
  
  if (!state.ffmpegProcess) {
    logInfo('没有正在运行的 ffmpeg 进程');
    return { success: true, message: '没有正在运行的 ffmpeg 进程' };
  }
  
  logInfo(`正在停止 ffmpeg 进程: ${state.ffmpegProcess.pid}`);
  
  cleanupFileWatcher();
  
  return new Promise((resolve) => {
    const pid = state.ffmpegProcess?.pid;
    
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${pid} /T /F`, { timeout: 5000 });
        logInfo('ffmpeg 进程已通过 taskkill 停止');
      } catch (killError: any) {
        logError(`taskkill 失败: ${killError.message}`);
      }
    } else {
      state.ffmpegProcess?.kill('SIGTERM');
      logInfo('ffmpeg 进程已发送 SIGTERM');
    }
    
    cleanup();
    resolve({ success: true, message: '停止采集成功' });
  });
}

export async function rotateCapture(direction: 'left' | 'right'): Promise<{ success: boolean; rotation: number; message?: string }> {
  const currentRotation = state.rotation;
  
  let newRotation: number;
  if (direction === 'left') {
    newRotation = (currentRotation - 90 + 360) % 360;
  } else {
    newRotation = (currentRotation + 90) % 360;
  }
  
  state.rotation = newRotation;
  logInfo(`旋转角度: ${currentRotation} -> ${newRotation}`);
  
  if (state.ffmpegProcess && state.activeCameraId) {
    logInfo('正在重启 ffmpeg 以应用旋转...');
    
    const cameraId = state.activeCameraId;
    const audioId = state.activeAudioId;
    
    await stopCapture();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await startCapture(cameraId, audioId, newRotation);
  }
  
  return { success: true, rotation: newRotation };
}

function cleanupFileWatcher(): void {
  if (state.fileWatcher) {
    try {
      state.fileWatcher.close();
      logInfo('文件监视器已关闭');
    } catch (err) {
      logError(`关闭文件监视器失败: ${err}`);
    }
    state.fileWatcher = null;
  }
}

function cleanup(): void {
  state.ffmpegProcess = null;
  state.activeCameraId = null;
  state.activeAudioId = null;
  state.recordDir = null;
  cleanupFileWatcher();
  logInfo('摄像头状态已清理');
}
