import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logInfo, logError, logWarn } from './logger';

export interface SnapshotState {
  isActive: boolean;
  snapshotDir: string | null;
  intervalId: NodeJS.Timeout | null;
  sessionName: string | null;
  roundNumber: number | null;
}

declare global {
  var snapshotManagerState: SnapshotState | undefined;
}

global.snapshotManagerState = global.snapshotManagerState || {
  isActive: false,
  snapshotDir: null,
  intervalId: null,
  sessionName: null,
  roundNumber: null
};

const state = global.snapshotManagerState;

export function getSnapshotState(): SnapshotState {
  return { ...state };
}

export function isSnapshotActive(): boolean {
  return state.isActive;
}

/**
 * 创建 snapshot 目录
 * 目录名称格式：s场名_r轮次号_yyyyMMdd
 */
export function createSnapshotDir(sessionName: string, roundNumber: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // 清理场名中的特殊字符
  const safeSessionName = sessionName.replace(/[\\/:*?"<>|]/g, '_');
  const dirName = `s${safeSessionName}_r${roundNumber}_${dateStr}`;
  
  const snapshotBaseDir = path.join(process.cwd(), 'snapshot');
  if (!fs.existsSync(snapshotBaseDir)) {
    fs.mkdirSync(snapshotBaseDir, { recursive: true });
  }
  
  const snapshotDir = path.join(snapshotBaseDir, dirName);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }
  
  logInfo(`Created snapshot directory: ${snapshotDir}`);
  return snapshotDir;
}

/**
 * 生成截图文件名
 * 文件名格式：yyyyMMdd_HHmmss_SSS.png
 */
function generateSnapshotFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${ms}.png`;
}

/**
 * 使用 ffmpeg 从 HLS 流截取一张图片
 */
function captureSnapshot(): void {
  if (!state.snapshotDir) {
    logError('Snapshot directory does not exist');
    return;
  }

  const hlsDir = getHlsDir();
  const m3u8Path = path.join(hlsDir, 'stream.m3u8');
  
  if (!fs.existsSync(m3u8Path)) {
    logWarn('HLS stream not ready, skipping snapshot');
    return;
  }

  const fileName = generateSnapshotFileName();
  const outputPath = path.join(state.snapshotDir, fileName);
  
  const ffmpegArgs = [
    '-y',
    '-i', m3u8Path,
    '-frames:v', '1',
    '-q:v', '2',
    outputPath
  ];
  
  logInfo(`Capturing snapshot: ${fileName}`);
  
  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  
  ffmpegProcess.on('error', (err) => {
    logError(`ffmpeg snapshot failed: ${err}`);
  });
  
  ffmpegProcess.stderr.on('data', (data) => {
    // ffmpeg 日志输出到 stderr，这里不做处理
  });
  
  ffmpegProcess.on('close', (code) => {
    if (code !== 0) {
      logError(`ffmpeg snapshot process exited, code: ${code}`);
    }
  });
}

/**
 * 获取 HLS 目录
 */
function getHlsDir(): string {
  return process.env.HLS_DIR ? path.resolve(process.env.HLS_DIR) : path.join(process.cwd(), 'hls');
}

/**
 * 开始 snapshot 采集
 * 每隔一秒生成一张截图
 */
export function startSnapshot(sessionName: string, roundNumber: number): { success: boolean; message: string; snapshotDir?: string } {
  logInfo(`Starting snapshot capture: sessionName=${sessionName}, roundNumber=${roundNumber}`);
  
  if (state.isActive) {
    logWarn('Snapshot capture already running');
    return { success: true, message: 'Snapshot capture already running', snapshotDir: state.snapshotDir || undefined };
  }
  
  // 创建 snapshot 目录
  const snapshotDir = createSnapshotDir(sessionName, roundNumber);
  
  state.isActive = true;
  state.snapshotDir = snapshotDir;
  state.sessionName = sessionName;
  state.roundNumber = roundNumber;
  
  // 立即截取一张
  setTimeout(() => {
    captureSnapshot();
  }, 500);
  
  // 设置定时器，每秒截取一张
  state.intervalId = setInterval(() => {
    captureSnapshot();
  }, 1000);
  
  logInfo(`Snapshot capture started, directory: ${snapshotDir}`);
  
  return { success: true, message: 'Snapshot capture started', snapshotDir };
}

/**
 * 停止 snapshot 采集
 */
export function stopSnapshot(): { success: boolean; message: string; snapshotDir?: string } {
  logInfo('Stopping snapshot capture');
  
  if (!state.isActive) {
    logInfo('Snapshot capture not running');
    return { success: true, message: 'Snapshot capture not running' };
  }
  
  // 清除定时器
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  
  const snapshotDir = state.snapshotDir;
  
  // 重置状态
  state.isActive = false;
  state.snapshotDir = null;
  state.sessionName = null;
  state.roundNumber = null;
  
  logInfo('Snapshot capture stopped');
  
  return { success: true, message: 'Snapshot capture stopped', snapshotDir: snapshotDir || undefined };
}

/**
 * 读取配置文件中的 useSnapshot 设置
 */
export function getUseSnapshotConfig(): boolean {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return config.useSnapshot === true;
    }
  } catch (error) {
    logError(`Failed to read snapshot config: ${error}`);
  }
  return false;
}

/**
 * 读取配置文件中的 useRecord 设置
 */
export function getUseRecordConfig(): boolean {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return config.useRecord !== false; // 默认为 true
    }
  } catch (error) {
    logError(`Failed to read record config: ${error}`);
  }
  return true;
}