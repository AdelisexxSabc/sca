/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/advertisements
 * 获取有效的广告列表
 * 查询参数:
 *   - position: 广告位标识（可选）
 */
export async function GET(req: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  
  // localstorage模式不支持
  if (storageType === 'localstorage') {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const position = searchParams.get('position') || undefined;

    // 获取有效期内且已开启的广告
    const advertisements = await db.getActiveAdvertisements(position);
    
    console.log(`获取有效广告 position=${position || 'all'}:`, advertisements);

    return NextResponse.json(
      { advertisements },
      {
        headers: {
          'Cache-Control': 'public, max-age=300', // 缓存5分钟
        },
      }
    );
  } catch (error) {
    console.error('获取广告失败:', error);
    return NextResponse.json(
      { error: '获取广告失败' },
      { status: 500 }
    );
  }
}
