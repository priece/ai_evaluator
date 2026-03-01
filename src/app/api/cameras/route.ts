import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';

export async function GET() {
  try {
    console.log('获取摄像头列表请求');
    const result = spawnSync('ffmpeg', ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy']);
    const output = result.stderr.toString();
    
    const cameras: { id: string; name: string }[] = [];
    
    console.log('=== ffmpeg 原始输出 ===');
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('(video)') || line.includes('(audio)')) {
        console.log('设备行:', line);
      }
    }
    console.log('=== 解析结束 ===');
    
    for (const line of lines) {
      if (line.includes('(video)')) {
        const match = line.match(/"(.+?)"\s+\(video\)/);
        if (match && match[1]) {
          const deviceName = match[1].trim();
          console.log('匹配到摄像头:', deviceName);
          cameras.push({ 
            id: deviceName, 
            name: `摄像头: ${deviceName}` 
          });
        }
      }
    }
    
    console.log('检测到的摄像头:', cameras);
    
    if (cameras.length === 0) {
      cameras.push({ id: '', name: '未检测到摄像头设备' });
      console.log('没有检测到摄像头');
    }
    
    return NextResponse.json({ success: true, cameras });
  } catch (error) {
    console.error('获取摄像头列表失败:', error);
    const cameras = [
      { id: '', name: '获取摄像头列表失败' },
    ];
    return NextResponse.json({ success: true, cameras });
  }
}
