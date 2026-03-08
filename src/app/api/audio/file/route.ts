import { NextResponse } from 'next/server';
import { getAudioFilePath } from '@/lib/audioManager';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('name');
    
    if (!filename) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少文件名参数' 
      }, { status: 400 });
    }
    
    const audioPath = getAudioFilePath(filename);
    
    if (!audioPath) {
      return NextResponse.json({ 
        success: false, 
        message: '音频文件不存在' 
      }, { status: 404 });
    }
    
    const audioBuffer = fs.readFileSync(audioPath);
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': audioBuffer.length.toString()
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: '获取音频文件失败' 
    }, { status: 500 });
  }
}
