import path from 'path';
import fs from 'fs';
import { logInfo, logError } from './logger';

const MAX_AUDIO_FILES = 10;
const CLEANUP_INTERVAL = 30000;

let cleanupTimer: NodeJS.Timeout | null = null;

export function getAudioDir(): string {
  return path.join(process.cwd(), 'audio');
}

export function ensureAudioDir(): string {
  const audioDir = getAudioDir();
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    logInfo(`Created audio directory: ${audioDir}`);
  }
  return audioDir;
}

export function generateAudioFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `audio_${year}${month}${day}_${hours}${minutes}${seconds}.wav`;
}

export function cleanupOldAudioFiles(): void {
  const audioDir = getAudioDir();
  if (!fs.existsSync(audioDir)) return;
  
  const files = fs.readdirSync(audioDir)
    .filter(f => f.endsWith('.wav'))
    .map(f => ({
      name: f,
      path: path.join(audioDir, f),
      time: fs.statSync(path.join(audioDir, f)).mtime.getTime()
    }))
    .sort((a, b) => a.time - b.time);
  
  if (files.length > MAX_AUDIO_FILES) {
    const toDelete = files.slice(0, files.length - MAX_AUDIO_FILES);
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.path);
        logInfo(`Deleted old audio file: ${file.name}`);
      } catch (err) {
        logError(`Failed to delete audio file: ${file.name}, ${err}`);
      }
    }
  }
}

export function startAudioCleanupTimer(): void {
  if (cleanupTimer) return;
  
  cleanupOldAudioFiles();
  
  cleanupTimer = setInterval(() => {
    cleanupOldAudioFiles();
  }, CLEANUP_INTERVAL);
  
  logInfo('Audio cleanup timer started');
}

export function stopAudioCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logInfo('Audio cleanup timer stopped');
  }
}

export function getLatestCompleteAudioInfo(): { filename: string; path: string; size: number; mtime: number } | null {
  const audioDir = getAudioDir();
  if (!fs.existsSync(audioDir)) return null;
  
  const files = fs.readdirSync(audioDir)
    .filter(f => f.endsWith('.wav'))
    .map(f => {
      const filePath = path.join(audioDir, f);
      const stat = fs.statSync(filePath);
      return {
        filename: f,
        path: filePath,
        size: stat.size,
        mtime: stat.mtime.getTime()
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
  
  if (files.length < 2) return null;
  
  return files[1];
}

export function getAudioFilePath(filename: string): string | null {
  const audioDir = getAudioDir();
  const filePath = path.join(audioDir, filename);
  
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
