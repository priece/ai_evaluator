import { NextResponse } from 'next/server';
import { getMemoryLogs } from '@/lib/logger';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    
    let logs = getMemoryLogs();
    
    if (from) {
      const fromTime = new Date(from).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() > fromTime);
    }
    
    const logLines = logs.map(log => {
      let levelStr = log.level;
      if (log.level === 'WARN') {
        levelStr = `[${log.level}]`;
      } else if (log.level === 'CAPTURE') {
        levelStr = log.level;
      }
      return `${levelStr} ${log.timestamp} ${log.message}`;
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
