import { NextResponse } from 'next/server';
import { createExpertEvaluation, getAllExpertEvaluations, getExpertEvaluationsBySession } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { sessionId, round, expertScore } = await request.json();
    if (!sessionId || round === undefined || expertScore === undefined) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }
    if (expertScore < 0 || expertScore > 100) {
      return NextResponse.json({ success: false, message: '专家评估值必须在0-100之间' }, { status: 400 });
    }
    const evaluation = await createExpertEvaluation(sessionId, round, expertScore);
    return NextResponse.json({ success: true, evaluation });
  } catch (error) {
    console.error('提交专家评估失败:', error);
    return NextResponse.json({ success: false, message: '提交专家评估失败' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    let evaluations;
    if (sessionId) {
      evaluations = await getExpertEvaluationsBySession(sessionId);
    } else {
      evaluations = await getAllExpertEvaluations();
    }
    return NextResponse.json({ success: true, evaluations });
  } catch (error) {
    console.error('获取专家评估结果失败:', error);
    return NextResponse.json({ success: false, message: '获取专家评估结果失败' }, { status: 500 });
  }
}
