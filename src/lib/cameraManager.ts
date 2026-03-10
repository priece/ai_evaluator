import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logInfo, logError, logWarn } from './logger';
import { createRecordDir, startFileWatcher, getHlsDir, cleanHlsDir } from './recorder';
import { ensureAudioDir, generateAudioFileName, cleanupOldAudioFiles, startAudioCleanupTimer, stopAudioCleanupTimer } from './audioManager';
import { getUseRecordConfig } from './snapshotManager';

const transposeMap: Record<number, number> = {
  0: 0,
  90: 1,
  180: 2,
  270: 3
};

export interface CaptureState {
  ffmpegProcess: ReturnType<typeof spawn> | null;
  audioFfmpegProcess: ReturnType<typeof spawn> | null;
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
  audioFfmpegProcess: null,
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
  logInfo(`Starting capture: cameraId=${cameraId}, audioId=${audioId}, rotation=${rotation}`);
  
  if (state.ffmpegProcess) {
    logWarn(`ffmpeg process already running, pid: ${state.ffmpegProcess.pid}`);
    return { success: true, message: 'ffmpeg process already running', rotation: state.rotation };
  }
  
  const hlsDir = getHlsDir();
  cleanHlsDir(hlsDir);
  
  // 根据 useRecord 配置决定是否创建录制目录
  const useRecord = getUseRecordConfig();
  let recordDir: string | null = null;
  if (useRecord) {
    recordDir = createRecordDir();
    state.recordDir = recordDir;
    logInfo(`Recording enabled, record directory: ${recordDir}`);
  } else {
    logInfo('Recording disabled');
  }
  
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
  
  logInfo(`ffmpeg args: ${ffmpegArgs.join(' ')}`);
  
  const ffmpegCommand = spawn('ffmpeg', ffmpegArgs);
  
  state.ffmpegProcess = ffmpegCommand;
  state.activeCameraId = cameraId;
  state.activeAudioId = audioId;
  
  // 只有启用录制时才启动文件监视器
  if (useRecord && recordDir) {
    const fileWatcher = startFileWatcher(hlsDir, recordDir);
    state.fileWatcher = fileWatcher;
  }
  
  logInfo(`ffmpeg process started: ${ffmpegCommand.pid}`);
  
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
    logError(`ffmpeg process error: ${err}`);
    cleanup();
  });
  
  if (audioId) {
    startAudioCapture(cameraId, audioId);
  }
  
  return { success: true, message: 'Capture started successfully', rotation: actualRotation, recordDir: recordDir || undefined };
}

function startAudioCapture(cameraId: string, audioId: string): void {
  const audioDir = ensureAudioDir();
  startAudioCleanupTimer();
  
  const audioFileName = generateAudioFileName();
  const audioFilePath = path.join(audioDir, audioFileName);
  
  const audioArgs = [
    '-f', 'dshow',
    '-i', `audio=${audioId}`,
    '-ar', '8000',
    '-ac', '1',
    '-acodec', 'pcm_s16le',
    '-f', 'segment',
    '-segment_time', '2',
    '-strftime', '1',
    path.join(audioDir, 'audio_%Y%m%d_%H%M%S.wav')
  ];
  
  logInfo(`Audio capture ffmpeg args: ${audioArgs.join(' ')}`);
  
  const audioFfmpeg = spawn('ffmpeg', audioArgs);
  state.audioFfmpegProcess = audioFfmpeg;
  
  logInfo(`Audio capture process started: ${audioFfmpeg.pid}`);
  
  audioFfmpeg.stdout.on('data', (data: any) => {
    logInfo(`[audio-ffmpeg] ${data}`);
  });
  
  audioFfmpeg.stderr.on('data', (data: any) => {
    logInfo(`[audio-ffmpeg] ${data}`);
  });
  
  audioFfmpeg.on('close', (code: any) => {
    logInfo(`Audio capture process exited, code: ${code}`);
    state.audioFfmpegProcess = null;
  });
  
  audioFfmpeg.on('error', (err: any) => {
    logError(`Audio capture process error: ${err}`);
    state.audioFfmpegProcess = null;
  });
}

export async function stopCapture(): Promise<{ success: boolean; message: string }> {
  logInfo('Stopping capture');
  
  if (!state.ffmpegProcess) {
    logInfo('No running ffmpeg process');
    return { success: true, message: 'No running ffmpeg process' };
  }
  
  logInfo(`Stopping ffmpeg process: ${state.ffmpegProcess.pid}`);
  
  cleanupFileWatcher();
  
  return new Promise((resolve) => {
    const pid = state.ffmpegProcess?.pid;
    const audioPid = state.audioFfmpegProcess?.pid;
    
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${pid} /T /F`, { timeout: 5000 });
        logInfo('ffmpeg process stopped via taskkill');
        
        if (audioPid) {
          execSync(`taskkill /pid ${audioPid} /T /F`, { timeout: 5000 });
          logInfo('Audio capture process stopped');
        }
      } catch (killError: any) {
        logError(`taskkill failed: ${killError.message}`);
      }
    } else {
      state.ffmpegProcess?.kill('SIGTERM');
      logInfo('ffmpeg process sent SIGTERM');
      
      if (state.audioFfmpegProcess) {
        state.audioFfmpegProcess.kill('SIGTERM');
        logInfo('Audio capture process sent SIGTERM');
      }
    }
    
    cleanup();
    resolve({ success: true, message: 'Capture stopped successfully' });
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
  logInfo(`Rotation: ${currentRotation} -> ${newRotation}`);
  
  if (state.ffmpegProcess && state.activeCameraId) {
    logInfo('Restarting ffmpeg to apply rotation...');
    
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
      logInfo('File watcher closed');
    } catch (err) {
      logError(`Failed to close file watcher: ${err}`);
    }
    state.fileWatcher = null;
  }
}

function cleanup(): void {
  state.ffmpegProcess = null;
  state.audioFfmpegProcess = null;
  state.activeCameraId = null;
  state.activeAudioId = null;
  state.recordDir = null;
  cleanupFileWatcher();
  stopAudioCleanupTimer();
  logInfo('Camera state cleaned up');
}
