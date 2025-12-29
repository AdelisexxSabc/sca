/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 读取存储类型环境变量，默认 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

export async function POST(req: NextRequest) {
  try {
    // localstorage 模式不支持注册
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json(
        { error: '本地存储模式不支持用户注册' },
        { status: 400 }
      );
    }

    const { username, password } = await req.json();

    // 参数验证
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    // 用户名长度验证
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: '用户名长度必须在3-20个字符之间' },
        { status: 400 }
      );
    }

    // 密码长度验证
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度不能少于6个字符' },
        { status: 400 }
      );
    }

    // 用户名格式验证（只允许字母、数字、下划线）
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // 检查是否是站长用户名
    if (username === process.env.USERNAME) {
      return NextResponse.json(
        { error: '该用户名不可用' },
        { status: 400 }
      );
    }

    // 获取管理配置，检查是否开启注册
    const config = await getConfig();
    
    // 检查开放注册开关
    if (!config.SiteConfig?.openRegister) {
      return NextResponse.json(
        { error: '系统未开放注册，请联系管理员' },
        { status: 403 }
      );
    }

    // 检查用户是否已存在
    const userExists = await db.checkUserExist(username);
    if (userExists) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 注册用户
    try {
      await db.registerUser(username, password);
      
      // 初始化用户元数据
      const now = Date.now();
      await db.setUserMeta(username, {
        createdAt: now,
        lastActiveAt: now,
        loginCount: 0
      });

      // 更新配置，添加新用户到用户列表
      const newUser = {
        username: username,
        role: 'user' as const,
        banned: false,
      };

      // 如果配置了默认用户组，添加到tags
      if (config.SiteConfig?.defaultUserGroup) {
        (newUser as any).tags = [config.SiteConfig.defaultUserGroup];
      }

      config.UserConfig.Users.push(newUser);
      await db.saveAdminConfig(config);

      return NextResponse.json({ 
        ok: true,
        message: '注册成功，请登录'
      });
    } catch (error: any) {
      console.error('注册用户失败:', error);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('注册接口异常', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
