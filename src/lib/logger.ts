import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const MAX_MEMORY_LOGS = 30;

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info;

declare global {
  var logState: {
    memoryLogs: LogEntry[];
  } | undefined;
}

global.logState = global.logState || {
  memoryLogs: [] as LogEntry[]
};

const logState = global.logState;

function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// 内存日志专用的时间戳格式: yyyyMMddTHHmmss.SSS (例如: 20260311T142519.588)
function formatMemoryTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}.${milliseconds}`;
}

let currentLogFile: string = '';
let currentHour: string = '';

function getLogsDir(): string {
  const logDir = process.env.LOG_DIR || './logs';
  return path.resolve(logDir);
}

function writeToFile(logLine: string): void {
  try {
    const logsDir = getLogsDir();
    
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    if (currentHour !== hours) {
      currentHour = hours;
      currentLogFile = `server-${year}${month}${day}-${hours}${minutes}${seconds}.log`;
    }
    
    const logPath = path.join(logsDir, currentLogFile);
    
    fs.appendFileSync(logPath, logLine + '\n', 'utf-8');
  } catch (error) {
    console.error('Failed to write log file:', error);
  }
}

function addToMemory(level: string, message: string): void {
  const filteredMessage = message.replace(/[\u4e00-\u9fff]/g, '*');
  const memoryTimestamp = formatMemoryTimestamp();
  const entry: LogEntry = {
    timestamp: memoryTimestamp,
    level,
    message: filteredMessage
  };
  
  logState.memoryLogs.push(entry);
  
  if (logState.memoryLogs.length > MAX_MEMORY_LOGS) {
    logState.memoryLogs.shift();
  }
}

export function logInfo(message: string): void {
  if (currentLogLevel > LOG_LEVELS.info) return;
  
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [INFO] ${message}`;
  
  console.log(logLine);
  writeToFile(logLine);
  addToMemory('INFO', message);
}

export function logError(message: string): void {
  if (currentLogLevel > LOG_LEVELS.error) return;
  
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [ERROR] ${message}`;
  
  console.error(logLine);
  writeToFile(logLine);
  addToMemory('ERROR', message);
}

export function logWarn(message: string): void {
  if (currentLogLevel > LOG_LEVELS.warn) return;
  
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [WARN] ${message}`;
  
  console.warn(logLine);
  writeToFile(logLine);
  addToMemory('WARN', message);
}

export function getMemoryLogs(): LogEntry[] {
  return [...logState.memoryLogs];
}

export function logDebug(message: string): void {
  if (currentLogLevel > LOG_LEVELS.debug) return;
  
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [DEBUG] ${message}`;
  
  console.log(logLine);
  writeToFile(logLine);
  addToMemory('DEBUG', message);
}
