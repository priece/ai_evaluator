import fs from 'fs';
import path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

const MAX_MEMORY_LOGS = 30;

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

function writeToFile(logLine: string): void {
  try {
    const logPath = path.join(process.cwd(), 'server.log');
    fs.appendFileSync(logPath, logLine + '\n', 'utf-8');
  } catch (error) {
    console.error('写入日志文件失败:', error);
  }
}

function addToMemory(level: string, message: string): void {
  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message
  };
  
  logState.memoryLogs.push(entry);
  
  if (logState.memoryLogs.length > MAX_MEMORY_LOGS) {
    logState.memoryLogs.shift();
  }
}

export function logInfo(message: string): void {
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [INFO] ${message}`;
  
  console.log(logLine);
  writeToFile(logLine);
  addToMemory('INFO', message);
}

export function logError(message: string): void {
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [ERROR] ${message}`;
  
  console.error(logLine);
  writeToFile(logLine);
  addToMemory('ERROR', message);
}

export function logWarn(message: string): void {
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
  const timestamp = formatTimestamp();
  const logLine = `[${timestamp}] [DEBUG] ${message}`;
  
  console.log(logLine);
  writeToFile(logLine);
  addToMemory('DEBUG', message);
}
