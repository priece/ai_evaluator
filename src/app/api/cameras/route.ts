import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';

export async function GET() {
  try {
    console.log('[API] Fetching camera list');
    
    const result = spawnSync('ffmpeg', ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy']);
    const output = result.stderr.toString();
    
    const cameras: { id: string; name: string }[] = [];
    
    console.log('=== ffmpeg output ===');
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('(video)') || line.includes('(audio)')) {
        console.log('Device:', line);
      }
    }
    console.log('=== end ===');
    
    for (const line of lines) {
      if (line.includes('(video)')) {
        const match = line.match(/"(.+?)"\s+\(video\)/);
        if (match && match[1]) {
          const deviceName = match[1].trim();
          console.log('Found camera:', deviceName);
          cameras.push({ 
            id: deviceName, 
            name: `摄像头: ${deviceName}` 
          });
        }
      }
    }
    
    console.log('Cameras found:', cameras);
    
    if (cameras.length === 0) {
      cameras.push({ id: '', name: '未检测到摄像头设备' });
      console.log('No cameras detected');
    }
    
    return NextResponse.json({ success: true, cameras });
  } catch (error) {
    console.error('Failed to get camera list:', error);
    return NextResponse.json({ 
      success: true, 
      cameras: [{ id: '', name: '获取摄像头列表失败' }] 
    });
  }
}
