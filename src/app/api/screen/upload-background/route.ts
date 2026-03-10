import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: '请上传图片文件' },
        { status: 400 }
      );
    }

    // 读取 config.json 获取背景图路径
    const configPath = path.join(process.cwd(), 'config.json');
    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { success: false, message: '配置文件不存在' },
        { status: 404 }
      );
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // 获取背景图路径，例如 ./public/background/background.png
    const backgroundPath = config.screen?.background;
    if (!backgroundPath) {
      return NextResponse.json(
        { success: false, message: '配置文件中未找到背景图路径' },
        { status: 400 }
      );
    }

    // 将路径转换为实际文件系统路径
    const relativePath = backgroundPath.replace('./public/', '');
    const targetPath = path.join(process.cwd(), 'public', relativePath);

    // 确保目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 将文件转换为 Buffer 并写入
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(targetPath, buffer);

    return NextResponse.json({
      success: true,
      message: '背景图上传成功'
    });
  } catch (error) {
    console.error('Failed to upload background:', error);
    return NextResponse.json(
      { success: false, message: '上传失败' },
      { status: 500 }
    );
  }
}