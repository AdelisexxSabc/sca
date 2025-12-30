import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getOnlineUsersCount } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/online-users
 * 获取当前在线用户数
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取在线用户数（30分钟内活跃的用户）
    const count = await getOnlineUsersCount(30);

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('获取在线用户数失败:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
