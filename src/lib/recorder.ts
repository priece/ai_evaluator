import path from 'path';
import fs from 'fs';
import { logInfo, logError } from './logger';

export function createRecordDir(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const dirName = `rec_${year}${month}${day}_${hours}${minutes}${seconds}`;
  
  const recordsDir = path.join(process.cwd(), 'records');
  if (!fs.existsSync(recordsDir)) {
    fs.mkdirSync(recordsDir, { recursive: true });
  }
  
  const recordDir = path.join(recordsDir, dirName);
  if (!fs.existsSync(recordDir)) {
    fs.mkdirSync(recordDir, { recursive: true });
  }
  
  logInfo(`创建录制目录: ${recordDir}`);
  return recordDir;
}

function parseM3u8(content: string): { segments: string[] } {
  const lines = content.split('\n');
  const segments: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      segments.push(trimmed);
    }
  }
  
  return { segments };
}

function buildM3u8(segments: string[]): string {
  const lines: string[] = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:2',
    '#EXT-X-MEDIA-SEQUENCE:0'
  ];
  
  for (const segment of segments) {
    lines.push('#EXTINF:2.0,');
    lines.push(segment);
  }
  
  return lines.join('\n');
}

export function startFileWatcher(hlsDir: string, recordDir: string): fs.FSWatcher {
  const existingSegments = new Set<string>();
  
  const watcher = fs.watch(hlsDir, (eventType, filename) => {
    if (!filename) return;
    
    if (filename === 'stream.m3u8') {
      const srcM3u8Path = path.join(hlsDir, filename);
      const destM3u8Path = path.join(recordDir, 'stream.m3u8');
      
      try {
        if (!fs.existsSync(srcM3u8Path)) return;
        
        const srcContent = fs.readFileSync(srcM3u8Path, 'utf-8');
        const { segments: srcSegments } = parseM3u8(srcContent);
        
        let newSegmentsFound = false;
        for (const segment of srcSegments) {
          if (!existingSegments.has(segment)) {
            existingSegments.add(segment);
            newSegmentsFound = true;
            
            const srcTsPath = path.join(hlsDir, segment);
            const destTsPath = path.join(recordDir, segment);
            if (fs.existsSync(srcTsPath) && !fs.existsSync(destTsPath)) {
              fs.copyFileSync(srcTsPath, destTsPath);
              logInfo(`复制切片到录制目录: ${segment}`);
            }
          }
        }
        
        if (newSegmentsFound) {
          const m3u8Content = buildM3u8(Array.from(existingSegments));
          fs.writeFileSync(destM3u8Path, m3u8Content, 'utf-8');
          logInfo(`更新录制 m3u8，当前共 ${existingSegments.size} 个切片`);
        }
      } catch (err) {
        logError(`处理 m3u8 失败: ${err}`);
      }
    }
  });
  
  return watcher;
}

export function getHlsDir(): string {
  return process.env.HLS_DIR ? path.resolve(process.env.HLS_DIR) : path.join(process.cwd(), 'hls');
}

export function cleanHlsDir(hlsDir: string): void {
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
    return;
  }
  
  logInfo('清理 hls 目录...');
  const files = fs.readdirSync(hlsDir);
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.m3u8') || file.endsWith('.m3u8.tmp')) {
      const filePath = path.join(hlsDir, file);
      fs.unlinkSync(filePath);
      logInfo(`删除文件: ${file}`);
    }
  }
}
