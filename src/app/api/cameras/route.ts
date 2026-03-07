import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
const capture = require('@/lib/capture.js');

export async function GET() {
  try {
    console.log('[API] Fetching device list');
    
    const result = spawnSync('ffmpeg', ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy']);
    const output = result.stderr.toString();
    
    const cameras: { id: string; name: string }[] = [];
    const audioDevices: { id: string; name: string }[] = [];
    
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
      } else if (line.includes('(audio)')) {
        const match = line.match(/"(.+?)"\s+\(audio\)/);
        if (match && match[1]) {
          const deviceName = match[1].trim();
          console.log('Found audio:', deviceName);
          audioDevices.push({ 
            id: deviceName, 
            name: `音频: ${deviceName}` 
          });
        }
      }
    }
    
    console.log('Cameras found:', cameras);
    console.log('Audio devices found:', audioDevices);
    
    if (cameras.length === 0) {
      cameras.push({ id: '', name: '未检测到摄像头设备' });
      console.log('No cameras detected');
    }
    
    if (audioDevices.length === 0) {
      audioDevices.push({ id: '', name: '未检测到音频设备' });
      console.log('No audio devices detected');
    }
    
    const activeCameraId = capture.activeCameraId || null;
    const activeAudioId = capture.activeAudioId || null;
    const isCapturing = !!capture.ffmpegProcess;
    const rotation = capture.rotation || 0;
    
    return NextResponse.json({ 
      success: true, 
      cameras,
      audioDevices,
      activeCameraId,
      activeAudioId,
      isCapturing,
      rotation
    });
  } catch (error) {
    console.error('Failed to get device list:', error);
    return NextResponse.json({ 
      success: true, 
      cameras: [{ id: '', name: '获取摄像头列表失败' }],
      audioDevices: [{ id: '', name: '获取音频列表失败' }],
      activeCameraId: null,
      activeAudioId: null,
      isCapturing: false,
      rotation: 0
    });
  }
}
