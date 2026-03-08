import { NextResponse } from 'next/server';
import { getCameraConfig, saveCameraConfig } from '@/lib/db';
import { startCapture, getState } from '@/lib/cameraManager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { cameraId, audioId } = await request.json();
    if (!cameraId) {
      return NextResponse.json({ success: false, message: '缺少摄像头ID' }, { status: 400 });
    }
    
    const savedConfig = await getCameraConfig(cameraId);
    const rotation = savedConfig?.rotation || 0;
    
    const result = await startCapture(cameraId, audioId, rotation);
    
    if (savedConfig?.rotation !== rotation) {
      await saveCameraConfig(cameraId, rotation);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, message: '开始采集失败' }, { status: 500 });
  }
}
