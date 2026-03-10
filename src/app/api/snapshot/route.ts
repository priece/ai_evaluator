import { NextResponse } from 'next/server';
import { startSnapshot, stopSnapshot, getSnapshotState, getUseSnapshotConfig } from '@/lib/snapshotManager';
import { getSession, getRound } from '@/lib/db';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, roundId } = body;
    
    // 检查是否启用 snapshot
    const useSnapshot = getUseSnapshotConfig();
    if (!useSnapshot) {
      return NextResponse.json({ 
        success: true, 
        message: 'snapshot 功能未启用',
        enabled: false 
      });
    }
    
    switch (action) {
      case 'start': {
        if (!sessionId || !roundId) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数' },
            { status: 400 }
          );
        }
        
        // 获取场次和轮次信息
        const session = await getSession(sessionId);
        const round = await getRound(roundId);
        
        if (!session || !round) {
          return NextResponse.json(
            { success: false, message: '场次或轮次不存在' },
            { status: 404 }
          );
        }
        
        const result = startSnapshot(session.name, round.round_number);
        return NextResponse.json({ 
          success: result.success, 
          message: result.message,
          snapshotDir: result.snapshotDir,
          enabled: true
        });
      }
      
      case 'stop': {
        const result = stopSnapshot();
        return NextResponse.json({ 
          success: result.success, 
          message: result.message,
          snapshotDir: result.snapshotDir,
          enabled: true
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, message: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(`snapshot 操作失败: ${error}`);
    return NextResponse.json(
      { success: false, message: '操作失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const state = getSnapshotState();
    const useSnapshot = getUseSnapshotConfig();
    
    return NextResponse.json({
      success: true,
      enabled: useSnapshot,
      isActive: state.isActive,
      snapshotDir: state.snapshotDir,
      sessionName: state.sessionName,
      roundNumber: state.roundNumber
    });
  } catch (error) {
    logError(`获取 snapshot 状态失败: ${error}`);
    return NextResponse.json(
      { success: false, message: '获取状态失败' },
      { status: 500 }
    );
  }
}