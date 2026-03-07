import { NextResponse } from 'next/server';
import { createRegularEvaluation, getAllRegularEvaluations, getRegularEvaluationsBySession } from '@/lib/db';
import { logError } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { sessionId, round } = await request.json();
    if (!sessionId || round === undefined) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }
    const score = Math.floor(Math.random() * 101);
    const evaluation = await createRegularEvaluation(sessionId, round, score);
    return NextResponse.json({ success: true, evaluation });
  } catch (error) {
    logError(`提交常规评估失败: ${error}`);
    return NextResponse.json({ success: false, message: '提交常规评估失败' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    let evaluations;
    if (sessionId) {
      evaluations = await getRegularEvaluationsBySession(sessionId);
    } else {
      evaluations = await getAllRegularEvaluations();
    }
    return NextResponse.json({ success: true, evaluations });
  } catch (error) {
    logError(`获取常规评估结果失败: ${error}`);
    return NextResponse.json({ success: false, message: '获取常规评估结果失败' }, { status: 500 });
  }
}
