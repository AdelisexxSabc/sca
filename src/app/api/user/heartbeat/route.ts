/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { generateSessionId,updateUserSession } from '@/lib/session';

export const runtime = 'nodejs';

// 中间件：更新用户活跃状态
export async function POST(req: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  
  // localstorage模式不支持
  if (storageType === 'localstorage') {
    return NextResponse.json({ ok: true });
  }

  try {
    const authInfo = getAuthInfoFromCookie(req);
    
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 从cookie获取或生成sessionId
    let sessionId = req.cookies.get('sessionId')?.value;
    if (!sessionId) {
      sessionId = generateSessionId();
    }

    // 更新用户会话
    await updateUserSession(authInfo.username, sessionId, req.headers);

    const response = NextResponse.json({ ok: true });
    
    // 设置sessionId cookie
    response.cookies.set('sessionId', sessionId, {
      path: '/',
      maxAge: 3600, // 1小时
      sameSite: 'lax',
      httpOnly: false,
      secure: false,
    });

    return response;
  } catch (error) {
    console.error('更新用户活跃状态失败:', error);
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    );
  }
}
