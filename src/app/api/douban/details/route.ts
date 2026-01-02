/* eslint-disable no-console */
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

// ============================================================================
// 错误类
// ============================================================================
class DoubanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DoubanError';
  }
}

// ============================================================================
// 移动端API - 获取预告片和高清图片
// ============================================================================

/**
 * 从移动端API获取预告片和高清图片（内部函数）
 * 支持电影和电视剧（自动检测并切换端点）
 */
async function _fetchMobileApiData(id: string): Promise<{
  trailerUrl?: string;
  backdrop?: string;
} | null> {
  try {
    // 先尝试 movie 端点
    let mobileApiUrl = `https://m.douban.com/rexxar/api/v2/movie/${id}`;

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

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
      redirect: 'manual', // 手动处理重定向
    });

    clearTimeout(timeoutId);

    // 如果是 3xx 重定向，说明可能是电视剧，尝试 tv 端点
    if (response.status >= 300 && response.status < 400) {
      console.log(`[details] 检测到重定向，尝试 TV 端点: ${id}`);
      mobileApiUrl = `https://m.douban.com/rexxar/api/v2/tv/${id}`;

      const tvController = new AbortController();
      const tvTimeoutId = setTimeout(() => tvController.abort(), 15000);

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
      console.warn(`移动端API请求失败: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // 提取预告片URL（取第一个预告片）
    const trailerUrl = data.trailers?.[0]?.video_url || undefined;

    // 提取高清图片：优先使用raw原图，转换URL到最高清晰度
    let backdrop = data.cover?.image?.raw?.url ||
                  data.cover?.image?.large?.url ||
                  data.cover?.url ||
                  data.pic?.large ||
                  undefined;

    // 确保使用最高清晰度的图片
    if (backdrop) {
      backdrop = backdrop
        .replace('/view/photo/s/', '/view/photo/l/')
        .replace('/view/photo/m/', '/view/photo/l/')
        .replace('/s_ratio_poster/', '/l_ratio_poster/')
        .replace('/m_ratio_poster/', '/l_ratio_poster/');
    }

    return { trailerUrl, backdrop };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`获取移动端API数据超时`);
    } else {
      console.warn(`获取移动端API数据失败: ${(error as Error).message}`);
    }
    return null;
  }
}

/**
 * 使用 unstable_cache 包裹移动端API请求
 * - 30分钟缓存（trailer URL 有时效性，需要较短缓存）
 */
const fetchMobileApiData = unstable_cache(
  async (id: string) => _fetchMobileApiData(id),
  ['douban-mobile-api'],
  {
    revalidate: 1800, // 30分钟缓存
    tags: ['douban-mobile'],
  }
);

// ============================================================================
// 网页解析 - 获取详细信息
// ============================================================================

function parseDoubanDetails(html: string, id: string) {
  try {
    // 提取基本信息
    const titleMatch = html.match(/<h1[^>]*>[\s\S]*?<span[^>]*property="v:itemreviewed"[^>]*>([^<]+)<\/span>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // 提取海报
    const posterMatch = html.match(/<a[^>]*class="nbgnbg"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
    const poster = posterMatch ? posterMatch[1] : '';

    // 提取评分
    const ratingMatch = html.match(/<strong[^>]*class="ll rating_num"[^>]*property="v:average">([^<]+)<\/strong>/);
    const rate = ratingMatch ? ratingMatch[1] : '';

    // 提取年份
    const yearMatch = html.match(/<span class="year">\((\d{4})\)<\/span>/);
    const year = yearMatch ? yearMatch[1] : '';

    // 提取导演
    let directors: string[] = [];
    const directorMatch = html.match(/<a[^>]*rel="v:directedBy"[^>]*>([^<]+)<\/a>/g);
    if (directorMatch) {
      directors = directorMatch.map(link => {
        const nameMatch = link.match(/>([^<]+)</);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(Boolean);
    }

    // 提取演员
    let cast: string[] = [];
    const castMatch = html.match(/<a[^>]*rel="v:starring"[^>]*>([^<]+)<\/a>/g);
    if (castMatch) {
      cast = castMatch.map(link => {
        const nameMatch = link.match(/>([^<]+)</);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(Boolean);
    }

    // 提取类型
    let genres: string[] = [];
    const genreMatch = html.match(/<span[^>]*property="v:genre"[^>]*>([^<]+)<\/span>/g);
    if (genreMatch) {
      genres = genreMatch.map(span => {
        const textMatch = span.match(/>([^<]+)</);
        return textMatch ? textMatch[1].trim() : '';
      }).filter(Boolean);
    }

    // 提取国家/地区
    let countries: string[] = [];
    const countryMatch = html.match(/<span class="pl">制片国家\/地区:<\/span>\s*([^<]+)/);
    if (countryMatch) {
      countries = countryMatch[1].split(/[/,、]/).map(s => s.trim()).filter(Boolean);
    }

    // 提取简介
    const summaryMatch = html.match(/<span[^>]*class="all hidden"[^>]*>([\s\S]*?)<\/span>/) ||
                         html.match(/<span[^>]*property="v:summary"[^>]*>([\s\S]*?)<\/span>/);
    let plot_summary = '';
    if (summaryMatch) {
      plot_summary = summaryMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
        .replace(/\n{3,}/g, '\n\n');
    }

    // 🎬 提取剧照作为backdrop（横版高清图，比竖版海报更适合做背景）
    let scenePhoto: string | undefined;
    const allPhotosMatch = html.match(/<div id="related-pic"[\s\S]*?<\/div>/);
    if (allPhotosMatch) {
      const photoMatch = allPhotosMatch[0].match(/<img[^>]*src="([^"]+)"/);
      if (photoMatch) {
        scenePhoto = photoMatch[1]
          .replace('/view/photo/s/', '/view/photo/l/')
          .replace('/view/photo/m/', '/view/photo/l/')
          .replace('/s_ratio_poster/', '/l_ratio_poster/')
          .replace('/m_ratio_poster/', '/l_ratio_poster/');
      }
    }

    return {
      code: 200,
      message: '获取成功',
      data: {
        id,
        title,
        poster: poster.replace(/^http:/, 'https:'),
        rate,
        year,
        directors,
        cast,
        genres,
        countries,
        plot_summary,
        backdrop: scenePhoto,
        trailerUrl: undefined as string | undefined,
      }
    };
  } catch (error) {
    throw new DoubanError(`解析豆瓣页面失败: ${(error as Error).message}`);
  }
}

// ============================================================================
// 内部 scrape 函数（仅供本模块使用）
// ============================================================================

async function scrapeDoubanDetails(id: string) {
  // 1. 获取豆瓣网页
  const url = `https://movie.douban.com/subject/${id}/`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://movie.douban.com/explore',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new DoubanError(`豆瓣请求失败: ${response.status}`);
    }

    const html = await response.text();
    const details = parseDoubanDetails(html, id);

    // 2. 获取移动端API数据（预告片和高清背景）
    const mobileData = await fetchMobileApiData(id);
    if (mobileData) {
      details.data.trailerUrl = mobileData.trailerUrl;
      // Backdrop优先使用移动端API的，否则用爬虫的剧照
      if (mobileData.backdrop) {
        details.data.backdrop = mobileData.backdrop;
      }
    }

    return details;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new DoubanError('请求豆瓣超时');
    }
    throw error;
  }
}

// ============================================================================
// API 路由处理
// ============================================================================

async function getCacheTime(): Promise<number> {
  try {
    const config = await getConfig();
    return config.SiteConfig.SiteInterfaceCacheTime || 7200;
  } catch {
    return 7200;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const noCache = searchParams.get('noCache') === '1';

  if (!id) {
    return NextResponse.json(
      { code: 400, message: '缺少必要参数: id' },
      { status: 400 }
    );
  }

  try {
    const details = await scrapeDoubanDetails(id);

    const cacheTime = await getCacheTime();
    const trailerSafeCacheTime = 1800; // 30分钟（trailer URL有效期约2-3小时）

    const cacheHeaders = noCache ? {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    } : {
      'Cache-Control': `public, s-maxage=${Math.min(cacheTime, trailerSafeCacheTime)}, stale-while-revalidate=${cacheTime}`,
    };

    return NextResponse.json(details, { headers: cacheHeaders });
  } catch (error) {
    console.error('获取豆瓣详情失败:', error);
    return NextResponse.json(
      { code: 500, message: (error as Error).message || '获取失败' },
      { status: 500 }
    );
  }
}
