import { NextResponse } from 'next/server';
import { getMemoryLogs } from '@/lib/logger';
import { logError } from '@/lib/logger';

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
      return `[${log.timestamp}] [${log.level}] ${log.message}`;
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
