/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行管理员配置',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;

    const adminConfig = await getConfig();

    // 权限校验
    if (username !== process.env.USERNAME) {
      // 管理员
      const user = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!user || user.role !== 'admin' || user.banned) {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    // 支持部分更新模式
    if (body.action === 'updateConfig') {
      // 部分更新站点配置
      if (typeof body.openRegister === 'boolean') {
        adminConfig.SiteConfig.openRegister = body.openRegister;
      }
      if (typeof body.autoCleanInactiveUsers === 'boolean') {
        adminConfig.SiteConfig.autoCleanInactiveUsers = body.autoCleanInactiveUsers;
      }
      if (typeof body.inactiveUserDays === 'number') {
        adminConfig.SiteConfig.inactiveUserDays = Math.max(1, Math.min(365, body.inactiveUserDays));
      }
      if (typeof body.defaultUserGroup === 'string') {
        adminConfig.SiteConfig.defaultUserGroup = body.defaultUserGroup;
      }

      // 写入数据库
      await db.saveAdminConfig(adminConfig);

      return NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // 完整更新模式（保持向后兼容）
    const {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanProxyType,
      DoubanProxy,
      DoubanImageProxyType,
      DoubanImageProxy,
      DisableYellowFilter,
      FluidSearch,
      openRegister,
      defaultUserGroup,
      autoCleanInactiveUsers,
      inactiveUserDays,
      SiteIcon,
    } = body as {
      SiteName: string;
      Announcement: string;
      SearchDownstreamMaxPage: number;
      SiteInterfaceCacheTime: number;
      DoubanProxyType: string;
      DoubanProxy: string;
      DoubanImageProxyType: string;
      DoubanImageProxy: string;
      DisableYellowFilter: boolean;
      FluidSearch: boolean;
      openRegister?: boolean;
      defaultUserGroup?: string;
      autoCleanInactiveUsers?: boolean;
      inactiveUserDays?: number;
      SiteIcon?: string;
    };

    // 参数校验
    if (
      typeof SiteName !== 'string' ||
      typeof Announcement !== 'string' ||
      typeof SearchDownstreamMaxPage !== 'number' ||
      typeof SiteInterfaceCacheTime !== 'number' ||
      typeof DoubanProxyType !== 'string' ||
      typeof DoubanProxy !== 'string' ||
      typeof DoubanImageProxyType !== 'string' ||
      typeof DoubanImageProxy !== 'string' ||
      typeof DisableYellowFilter !== 'boolean' ||
      typeof FluidSearch !== 'boolean'
    ) {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    // 更新缓存中的站点设置
    adminConfig.SiteConfig = {
      SiteName,
      Announcement,
      SearchDownstreamMaxPage,
      SiteInterfaceCacheTime,
      DoubanProxyType,
      DoubanProxy,
      DoubanImageProxyType,
      DoubanImageProxy,
      DisableYellowFilter,
      FluidSearch,
      openRegister: openRegister || false,
      defaultUserGroup: defaultUserGroup || '',
      autoCleanInactiveUsers: autoCleanInactiveUsers || false,
      inactiveUserDays: inactiveUserDays || 7,
      SiteIcon: SiteIcon || '',
    };

    // 写入数据库
    await db.saveAdminConfig(adminConfig);

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store', // 不缓存结果
        },
      }
    );
  } catch (error) {
    console.error('更新站点配置失败:', error);
    return NextResponse.json(
      {
        error: '更新站点配置失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
