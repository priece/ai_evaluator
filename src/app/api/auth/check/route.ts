import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const cookieStore = cookies();
    const authUser = cookieStore.get('auth_user');
    
    if (!authUser || !authUser.value) {
      return NextResponse.json({ success: false, user: null });
    }
    
    const user = JSON.parse(authUser.value);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    logError(`检查登录状态失败: ${error}`);
    return NextResponse.json({ success: false, user: null });
  }
}
