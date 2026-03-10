import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface MotionConfig {
  id: string;
  image: string;
  frames: string[];
}

interface ScreenConfig {
  background: string;
  motions: MotionConfig[];
}

interface ConfigData {
  screen: {
    background: string;
    motions: {
      id: string;
      image: string;
    }[];
  };
}

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { success: false, message: 'Config file not found' },
        { status: 404 }
      );
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: ConfigData = JSON.parse(configContent);

    const background = config.screen.background
      .replace('./public/', '/')
      .replace('\\', '/');
    
    const motions: MotionConfig[] = config.screen.motions.map((motion) => {
      const imagePath = motion.image.replace('./public/', '');
      const fullPath = path.join(process.cwd(), 'public', imagePath);
      
      let frames: string[] = [];
      
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath)
          .filter(file => file.endsWith('.png'))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10);
            const numB = parseInt(b.replace(/\D/g, ''), 10);
            return numA - numB;
          });
        
        frames = files.map(file => `/${imagePath}${file}`.replace(/\\/g, '/'));
      }
      
      return {
        id: motion.id,
        image: motion.image
          .replace('./public/', '/')
          .replace('\\', '/'),
        frames
      };
    });

    return NextResponse.json({
      success: true,
      background,
      motions
    });
  } catch (error) {
    console.error('Failed to read config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to read config' },
      { status: 500 }
    );
  }
}
