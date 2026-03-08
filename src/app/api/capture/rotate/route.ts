import { NextResponse } from 'next/server';
import { saveCameraConfig } from '@/lib/db';
import { rotateCapture, getState } from '@/lib/cameraManager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { direction } = await request.json();
    
    if (direction !== 'left' && direction !== 'right') {
      return NextResponse.json({ 
        success: false, 
        message: '无效的旋转方向' 
      }, { status: 400 });
    }
    
    const result = await rotateCapture(direction);
    
    const state = getState();
    if (state.activeCameraId) {
      await saveCameraConfig(state.activeCameraId, result.rotation);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: '旋转失败' 
    }, { status: 500 });
  }
}
