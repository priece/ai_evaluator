import { NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import { getState, isRunning } from '@/lib/cameraManager';
import { logInfo, logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logInfo('[API] Fetching device list');
    
    const result = spawnSync('ffmpeg', ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy']);
    const output = result.stderr.toString();
    
    const cameras: { id: string; name: string }[] = [];
    const audioDevices: { id: string; name: string }[] = [];
    
    logInfo('=== ffmpeg output ===');
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('(video)') || line.includes('(audio)')) {
        logInfo(`Device: ${line}`);
      }
    }
    logInfo('=== end ===');
    
    for (const line of lines) {
      if (line.includes('(video)')) {
        const match = line.match(/"(.+?)"\s+\(video\)/);
        if (match && match[1]) {
          const deviceName = match[1].trim();
          logInfo(`Found camera: ${deviceName}`);
          cameras.push({ 
            id: deviceName, 
            name: `Camera: ${deviceName}` 
          });
        }
      } else if (line.includes('(audio)')) {
        const match = line.match(/"(.+?)"\s+\(audio\)/);
        if (match && match[1]) {
          const deviceName = match[1].trim();
          logInfo(`Found audio: ${deviceName}`);
          audioDevices.push({ 
            id: deviceName, 
            name: `Audio: ${deviceName}` 
          });
        }
      }
    }
    
    logInfo(`Cameras found: ${cameras.length}`);
    logInfo(`Audio devices found: ${audioDevices.length}`);
    
    if (cameras.length === 0) {
      cameras.push({ id: '', name: 'No camera device detected' });
      logInfo('No cameras detected');
    }
    
    if (audioDevices.length === 0) {
      audioDevices.push({ id: '', name: 'No audio device detected' });
      logInfo('No audio devices detected');
    }
    
    const state = getState();
    
    return NextResponse.json({ 
      success: true, 
      cameras,
      audioDevices,
      activeCameraId: state.activeCameraId,
      activeAudioId: state.activeAudioId,
      isCapturing: isRunning(),
      rotation: state.rotation
    });
  } catch (error) {
    logError(`Failed to get device list: ${error}`);
    return NextResponse.json({ 
      success: true, 
      cameras: [{ id: '', name: 'Failed to get camera list' }],
      audioDevices: [{ id: '', name: 'Failed to get audio list' }],
      activeCameraId: null,
      activeAudioId: null,
      isCapturing: false,
      rotation: 0
    });
  }
}
