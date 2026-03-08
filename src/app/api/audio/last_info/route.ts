import { NextResponse } from 'next/server';
import { getLatestCompleteAudioInfo } from '@/lib/audioManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const audioInfo = getLatestCompleteAudioInfo();
    
    if (!audioInfo) {
      return NextResponse.json({ 
        success: false, 
        message: '没有可用的音频文件' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      filename: audioInfo.filename,
      size: audioInfo.size,
      mtime: audioInfo.mtime
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: '获取音频信息失败' 
    }, { status: 500 });
  }
}
