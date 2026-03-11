import { NextResponse } from 'next/server';
import { getMemoryLogs } from '@/lib/logger';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// 解析内存日志时间戳格式: yyyyMMddTHHmmss.SSS (例如: 20260311T142519.588)
function parseMemoryTimestamp(timestamp: string): number {
  const match = timestamp.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})$/);
  if (!match) {
    return NaN;
  }
  const [, year, month, day, hours, minutes, seconds, ms] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds),
    parseInt(ms)
  ).getTime();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    
    let logs = getMemoryLogs();
    
    if (from) {
      const fromTime = parseMemoryTimestamp(from);
      if (!isNaN(fromTime)) {
        logs = logs.filter(log => parseMemoryTimestamp(log.timestamp) > fromTime);
      }
    }
    
    // 内存日志格式: [级别] __yyyyMMddTHHmmss.SSS__  消息详细
    // INFO级别替换为CAPTURE
    const logLines = logs.map(log => {
      const level = log.level === 'INFO' ? 'CAPTURE' : log.level;
      return `[${level}] __${log.timestamp}__  ${log.message}`;
    });
    
    return NextResponse.json({ 
      success: true, 
      logs: logLines 
    });
  } catch (error) {
    logError(`获取日志失败: ${error}`);
    return NextResponse.json({ 
      success: true, 
      logs: [] 
    });
  }
}
