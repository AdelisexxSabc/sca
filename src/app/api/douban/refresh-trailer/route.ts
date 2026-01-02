/* eslint-disable no-console */
import { NextResponse } from 'next/server';

/**
 * 刷新过期的 Douban trailer URL
 * 不使用任何缓存，直接调用豆瓣移动端API获取最新URL
 */

// 带重试的获取函数
async function fetchTrailerWithRetry(id: string, retryCount = 0): Promise<string | null> {
  const MAX_RETRIES = 2;

  // 先尝试 movie 端点
  let mobileApiUrl = `https://m.douban.com/rexxar/api/v2/movie/${id}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    let response = await fetch(mobileApiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/explore',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://movie.douban.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
      },
      redirect: 'manual',
    });

    clearTimeout(timeoutId);

    // 如果是重定向，尝试 tv 端点
    if (response.status >= 300 && response.status < 400) {
      mobileApiUrl = `https://m.douban.com/rexxar/api/v2/tv/${id}`;

      const tvController = new AbortController();
      const tvTimeoutId = setTimeout(() => tvController.abort(), 10000);

      response = await fetch(mobileApiUrl, {
        signal: tvController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Referer': 'https://movie.douban.com/explore',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Origin': 'https://movie.douban.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
        },
      });

      clearTimeout(tvTimeoutId);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const trailerUrl = data.trailers?.[0]?.video_url || null;

    return trailerUrl;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retryCount < MAX_RETRIES) {
      console.log(`[refresh-trailer] 重试 ${retryCount + 1}/${MAX_RETRIES}: ${id}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchTrailerWithRetry(id, retryCount + 1);
    }

    console.error(`[refresh-trailer] 最终失败: ${id}`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      {
        code: 400,
        message: '缺少必要参数: id',
        error: 'MISSING_PARAMETER',
      },
      { status: 400 }
    );
  }

  try {
    const trailerUrl = await fetchTrailerWithRetry(id);

    return NextResponse.json(
      {
        code: 200,
        message: '获取成功',
        data: {
          trailerUrl,
        },
      },
      {
        headers: {
          // 不缓存这个 API 的响应
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          {
            code: 408,
            message: '请求超时',
            error: 'TIMEOUT',
          },
          { status: 408 }
        );
      }
    }

    console.error('[refresh-trailer] 错误:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '获取预告片URL失败',
        error: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
