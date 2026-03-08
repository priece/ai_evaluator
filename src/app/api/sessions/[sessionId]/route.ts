import { NextResponse } from 'next/server';
import { getSession, updateSessionName, getRegularEvaluationsBySession, getExpertEvaluationsBySession } from '@/lib/db';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, message: '场次不存在' }, { status: 404 });
    }
    const regularEvaluations = await getRegularEvaluationsBySession(sessionId);
    const expertEvaluations = await getExpertEvaluationsBySession(sessionId);
    return NextResponse.json({ success: true, session, regularEvaluations, expertEvaluations });
  } catch (error) {
    logError(`获取场次信息失败: ${error}`);
    return NextResponse.json({ success: false, message: '获取场次信息失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, message: '缺少场名' }, { status: 400 });
    }
    await updateSessionName(sessionId, name);
    return NextResponse.json({ success: true, message: '更新场名成功' });
  } catch (error) {
    logError(`更新场名失败: ${error}`);
    return NextResponse.json({ success: false, message: '更新场名失败' }, { status: 500 });
  }
}
