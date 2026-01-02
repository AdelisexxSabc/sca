/* eslint-disable no-console */
/**
 * 网站图标上传 API
 * 用于上传自定义网站图标
 */
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

// 允许的图片类型
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/ico'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// 验证管理员权限
async function verifyAdminAuth(request: NextRequest): Promise<{ success: boolean; error?: string }> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return { success: false, error: '未登录' };
  }
  
  const username = authInfo.username;
  
  // owner 直接放行
  if (username === process.env.USERNAME) {
    return { success: true };
  }
  
  // 检查是否是管理员
  try {
    const config = await getConfig();
    const user = config.UserConfig.Users.find((u) => u.username === username);
    if (user && user.role === 'admin' && !user.banned) {
      return { success: true };
    }
  } catch (e) {
    console.error('验证管理员权限失败:', e);
  }
  
  return { success: false, error: '无权限' };
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { code: 401, message: authResult.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { code: 400, message: '请上传文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { code: 400, message: '不支持的文件类型，请上传 PNG、JPG、WebP、SVG 或 ICO 格式' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { code: 400, message: '文件大小超过限制（最大 2MB）' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成文件名
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `site-icon.${ext}`;
    
    // 确保 uploads 目录存在
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // 删除旧的图标文件（如果存在）
    const iconFiles = ['site-icon.png', 'site-icon.jpg', 'site-icon.jpeg', 'site-icon.webp', 'site-icon.svg', 'site-icon.ico'];
    for (const oldFile of iconFiles) {
      const oldPath = path.join(uploadsDir, oldFile);
      if (existsSync(oldPath)) {
        try {
          await unlink(oldPath);
        } catch (e) {
          console.warn('删除旧图标失败:', e);
        }
      }
    }

    // 保存新文件
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // 返回文件 URL
    const fileUrl = `/uploads/${fileName}`;
    
    console.log('[upload-icon] 图标上传成功:', fileUrl);

    return NextResponse.json({
      code: 200,
      message: '上传成功',
      data: {
        url: fileUrl,
        fileName,
      },
    });
  } catch (error) {
    console.error('[upload-icon] 上传失败:', error);
    return NextResponse.json(
      { code: 500, message: '上传失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// 删除自定义图标
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { code: 401, message: authResult.error },
        { status: 401 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const iconFiles = ['site-icon.png', 'site-icon.jpg', 'site-icon.jpeg', 'site-icon.webp', 'site-icon.svg', 'site-icon.ico'];
    
    let deleted = false;
    for (const file of iconFiles) {
      const filePath = path.join(uploadsDir, file);
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
          deleted = true;
        } catch (e) {
          console.warn('删除图标失败:', e);
        }
      }
    }

    if (deleted) {
      return NextResponse.json({
        code: 200,
        message: '删除成功',
      });
    } else {
      return NextResponse.json({
        code: 404,
        message: '未找到自定义图标',
      });
    }
  } catch (error) {
    console.error('[upload-icon] 删除失败:', error);
    return NextResponse.json(
      { code: 500, message: '删除失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
