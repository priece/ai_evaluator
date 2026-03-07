import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MotionConfig {
  id: string;
  image: string;
}

interface ScreenConfig {
  background: string;
  motions: MotionConfig[];
}

interface ConfigData {
  screen: ScreenConfig;
}

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { success: false, message: '配置文件不存在' },
        { status: 404 }
      );
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: ConfigData = JSON.parse(configContent);

    // 转换路径为可访问的 URL 路径
    const background = config.screen.background
      .replace('./public/', '/')
      .replace('\\', '/');
    
    const motions = config.screen.motions.map((motion: MotionConfig) => ({
      id: motion.id,
      image: motion.image
        .replace('./public/', '/')
        .replace('\\', '/')
    }));

    return NextResponse.json({
      success: true,
      background,
      motions
    });
  } catch (error) {
    console.error('读取配置失败:', error);
    return NextResponse.json(
      { success: false, message: '读取配置失败' },
      { status: 500 }
    );
  }
}
