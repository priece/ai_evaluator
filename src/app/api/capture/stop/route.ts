import { NextResponse } from 'next/server';
import { stopCapture } from '@/lib/cameraManager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await stopCapture();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: '停止采集失败' }, { status: 500 });
  }
}
