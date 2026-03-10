import { NextResponse } from 'next/server';
import { 
  createRound, 
  getRoundsBySession, 
  getRound, 
  updateRoundStatus,
  startPerformance,
  endPerformance,
  startEvaluation,
  endEvaluation,
  endRound,
  publishRound,
  updateRound,
  clearLastPublishedRound,
  getSession
} from '@/lib/db';
import { logError, logInfo } from '@/lib/logger';
import { startSnapshot, stopSnapshot, getUseSnapshotConfig } from '@/lib/snapshotManager';

export const dynamic = 'force-dynamic';

function generateNormalScore(): number {
  // 要求：
  // 1. 必须大于 1，不超过 9.9
  // 2. 均值为 7
  // 3. 二西格玛值在 9.5（即 P(X <= 9.5) ≈ 0.95）
  // 4. 正态分布
  
  const minScore = 1;
  const maxScore = 9.9;
  const mean = 7.0;
  const twoSigmaValue = 9.5;
  
  // 根据二西格玛值计算标准差
  // P(X <= 9.5) = 0.95，对应 Z = 1.645
  // 9.5 = mean + 1.645 * sigma
  // sigma = (9.5 - 7.0) / 1.645 ≈ 1.52
  const sigma = (twoSigmaValue - mean) / 1.645; // ≈ 1.52
  
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let score = mean + z * sigma;
  
  // 限制在 1 到 9.9 之间
  score = Math.max(minScore, Math.min(maxScore, score));
  
  return Math.round(score * 10) / 10;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sessionId, roundId, roundNumber, status, score } = body;
    
    switch (action) {
      case 'create':
        if (!sessionId || roundNumber === undefined) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数' },
            { status: 400 }
          );
        }
        const createResult = await createRound(sessionId, roundNumber);
        return NextResponse.json({ success: true, round: createResult.round, session: createResult.session });
        
      case 'getBySession':
        if (!sessionId) {
          return NextResponse.json(
            { success: false, message: '缺少场次ID' },
            { status: 400 }
          );
        }
        const rounds = await getRoundsBySession(sessionId);
        return NextResponse.json({ success: true, rounds });
        
      case 'get':
        if (!roundId) {
          return NextResponse.json(
            { success: false, message: '缺少轮次ID' },
            { status: 400 }
          );
        }
        const round = await getRound(roundId);
        return NextResponse.json({ success: true, round });
        
      case 'updateStatus':
        if (!roundId || status === undefined) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数' },
            { status: 400 }
          );
        }
        await updateRoundStatus(roundId, status);
        const updatedRound = await getRound(roundId);
        return NextResponse.json({ success: true, round: updatedRound });
        
      case 'startPerformance':
        if (!roundId) {
          return NextResponse.json(
            { success: false, message: '缺少轮次ID' },
            { status: 400 }
          );
        }
        await startPerformance(roundId);
        const startedRound = await getRound(roundId);
        
        // 启动 snapshot 采集
        if (startedRound && getUseSnapshotConfig()) {
          const session = await getSession(startedRound.session_id);
          if (session) {
            const snapshotResult = startSnapshot(session.name, startedRound.round_number);
            logInfo(`snapshot 启动结果: ${snapshotResult.message}`);
          }
        }
        
        return NextResponse.json({ success: true, round: startedRound });
        
      case 'endPerformance':
        if (!roundId) {
          return NextResponse.json(
            { success: false, message: '缺少轮次ID' },
            { status: 400 }
          );
        }
        await endPerformance(roundId);
        const endedPerfRound = await getRound(roundId);
        
        // 停止 snapshot 采集
        if (getUseSnapshotConfig()) {
          const snapshotResult = stopSnapshot();
          logInfo(`snapshot 停止结果: ${snapshotResult.message}`);
        }
        
        return NextResponse.json({ success: true, round: endedPerfRound });
        
      case 'startEvaluation':
        if (!roundId) {
          return NextResponse.json(
            { success: false, message: '缺少轮次ID' },
            { status: 400 }
          );
        }
        await startEvaluation(roundId);
        const evalStartedRound = await getRound(roundId);
        return NextResponse.json({ success: true, round: evalStartedRound });
        
      case 'submitScore':
        if (!roundId || score === undefined) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数' },
            { status: 400 }
          );
        }
        await endEvaluation(roundId, score);
        const evalResult = await getRound(roundId);
        return NextResponse.json({ success: true, round: evalResult });
        
      case 'endEvaluation':
        if (!roundId || score === undefined) {
          return NextResponse.json(
            { success: false, message: '缺少必要参数' },
            { status: 400 }
          );
        }
        await endEvaluation(roundId, score);
        const endedEvalRound = await getRound(roundId);
        return NextResponse.json({ success: true, round: endedEvalRound });
        
      case 'endRound':
        if (!roundId) {
          return NextResponse.json(
            { success: false, message: '缺少轮次ID' },
            { status: 400 }
          );
        }
        const endResult = await endRound(roundId);
        return NextResponse.json({ success: true, round: endResult.round, session: endResult.session });
        
      case 'publish':
        if (!roundId) {
          return NextResponse.json(
            { success: false, message: '缺少轮次ID' },
            { status: 400 }
          );
        }
        const publishedRound = await publishRound(roundId);
        return NextResponse.json({ success: true, round: publishedRound });
        
      case 'clearPublish':
        await clearLastPublishedRound();
        return NextResponse.json({ success: true, message: '已清除发布轮次' });
        
      default:
        return NextResponse.json(
          { success: false, message: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    logError(`轮次操作失败: ${error}`);
    return NextResponse.json(
      { success: false, message: '操作失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: '缺少场次ID' },
      { status: 400 }
    );
  }
  
  try {
    const rounds = await getRoundsBySession(sessionId);
    return NextResponse.json({ success: true, rounds });
  } catch (error) {
    logError(`获取轮次失败: ${error}`);
    return NextResponse.json(
      { success: false, message: '获取轮次失败' },
      { status: 500 }
    );
  }
}
