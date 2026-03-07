import { NextResponse } from 'next/server';
import { createSession, getAllSessions } from '@/lib/db';
import { logError } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, message: '缺少场名' }, { status: 400 });
    }
    const session = await createSession(name);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    logError(`创建场次失败: ${error}`);
    return NextResponse.json({ success: false, message: '创建场次失败' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessions = await getAllSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    logError(`获取场次列表失败: ${error}`);
    return NextResponse.json({ success: false, message: '获取场次列表失败' }, { status: 500 });
  }
}
