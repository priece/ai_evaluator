import { NextResponse } from 'next/server';
import { getLastPublishedRound, getSession } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const round = await getLastPublishedRound();
    
    if (!round) {
      return NextResponse.json({
        success: true,
        hasPublishedRound: false,
        message: '尚未发布'
      });
    }

    const session = await getSession(round.session_id);
    
    return NextResponse.json({
      success: true,
      hasPublishedRound: true,
      round: {
        id: round.id,
        round_number: round.round_number,
        score: round.score,
        status: round.status,
        submit: round.submit,
        performance_start_time: round.performance_start_time,
        performance_end_time: round.performance_end_time,
        evaluation_start_time: round.evaluation_start_time,
        evaluation_end_time: round.evaluation_end_time,
        round_end_time: round.round_end_time
      },
      session: session ? {
        session_id: session.session_id,
        name: session.name
      } : null
    });
  } catch (error) {
    console.error('获取大屏数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取数据失败' },
      { status: 500 }
    );
  }
}
