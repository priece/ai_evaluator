import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/db';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }
    
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      );
    }
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
    response.cookies.set('auth_user', JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    });
    
    return response;
  } catch (error) {
    logError(`登录失败: ${error}`);
    return NextResponse.json(
      { success: false, message: '登录失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Auth API' });
}
