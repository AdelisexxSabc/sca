/* eslint-disable no-console */
/**
 * 视频代理 API
 * 用于代理豆瓣视频请求，绕过防盗链限制
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: '缺少 url 参数' },
      { status: 400 }
    );
  }

  try {
    // 验证 URL 是否是豆瓣的视频地址
    const parsedUrl = new URL(url);
    const allowedHosts = [
      'douban.com',
      'doubanio.com',
      'movie.douban.com',
      'img1.doubanio.com',
      'img2.doubanio.com',
      'img3.doubanio.com',
      'img9.doubanio.com',
      'vt1.doubanio.com',
      'vt2.doubanio.com',
      'vt3.doubanio.com',
      'vt9.doubanio.com',
    ];

    const isAllowed = allowedHosts.some(host => 
      parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: '不允许代理此域名的资源' },
        { status: 403 }
      );
    }

    // 请求豆瓣视频
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Range': request.headers.get('range') || '',
      },
    });

    if (!response.ok) {
      console.error('[video-proxy] 获取视频失败:', response.status, response.statusText);
      return NextResponse.json(
        { error: `获取视频失败: ${response.status}` },
        { status: response.status }
      );
    }

    // 获取响应头
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    // 构建响应头
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }
    if (contentRange) {
      headers['Content-Range'] = contentRange;
    }
    if (acceptRanges) {
      headers['Accept-Ranges'] = acceptRanges;
    }

    // 获取视频数据并返回
    const videoBuffer = await response.arrayBuffer();
    
    return new NextResponse(videoBuffer, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('[video-proxy] 代理视频失败:', error);
    return NextResponse.json(
      { error: '代理视频失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// 支持 OPTIONS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}
