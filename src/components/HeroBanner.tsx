'use client';

import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DoubanItem } from '@/lib/types';

interface HeroBannerProps {
  hotMovies: DoubanItem[];
  hotTvShows: DoubanItem[];
  hotVarietyShows: DoubanItem[];
  loading?: boolean;
}

type BannerItem = DoubanItem & {
  category: 'movie' | 'tv' | 'variety';
  categoryName: string;
};

export default function HeroBanner({
  hotMovies,
  hotTvShows,
  hotVarietyShows,
  loading = false,
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 合并热门内容，每个类别取前2个
  const bannerItems: BannerItem[] = [
    ...hotMovies.slice(0, 2).map((item) => ({
      ...item,
      category: 'movie' as const,
      categoryName: '热门电影',
    })),
    ...hotTvShows.slice(0, 2).map((item) => ({
      ...item,
      category: 'tv' as const,
      categoryName: '热门剧集',
    })),
    ...hotVarietyShows.slice(0, 2).map((item) => ({
      ...item,
      category: 'variety' as const,
      categoryName: '热门综艺',
    })),
  ];

  // 切换到下一个
  const goToNext = useCallback(() => {
    if (bannerItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
  }, [bannerItems.length]);

  // 切换到上一个
  const goToPrev = useCallback(() => {
    if (bannerItems.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + bannerItems.length) % bannerItems.length);
  }, [bannerItems.length]);

  // 自动轮播
  useEffect(() => {
    if (isPaused || loading || bannerItems.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goToNext, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, loading, bannerItems.length, goToNext]);

  // 触摸滑动支持
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse mb-6">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
          <div className="h-8 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // 无数据
  if (bannerItems.length === 0) {
    return null;
  }

  const currentItem = bannerItems[currentIndex];

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden mb-6 group bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex flex-col md:flex-row items-stretch">
        {/* 左侧：海报图片 */}
        <div className="w-full md:w-1/3 lg:w-1/4 relative h-48 md:h-96 flex-shrink-0">
          {bannerItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={item.poster}
                alt={item.title}
                fill
                className="object-cover"
                priority={index === 0}
                unoptimized
              />
            </div>
          ))}
          {/* 左侧渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-900/80 md:to-gray-800" />
        </div>

        {/* 右侧：内容信息 */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center relative">
          <div className="max-w-3xl">
            {/* 分类标签 */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/80 text-white mb-3">
              {currentItem.categoryName}
            </span>

            {/* 标题 */}
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 line-clamp-2">
              {currentItem.title}
            </h2>

            {/* 评分和年份 */}
            <div className="flex items-center gap-4 text-sm text-white/80 mb-4">
              {currentItem.rate && (
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400 text-lg">★</span>
                  <span className="font-semibold">{currentItem.rate}</span>
                </span>
              )}
              {currentItem.year && (
                <span className="px-2 py-0.5 bg-white/10 rounded">{currentItem.year}</span>
              )}
            </div>

            {/* 影片介绍 */}
            {currentItem.plot_summary && (
              <p className="text-sm md:text-base text-white/90 mb-6 line-clamp-3 leading-relaxed">
                {currentItem.plot_summary}
              </p>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              <Link
                href={`/play?title=${encodeURIComponent(currentItem.title)}${currentItem.year ? `&year=${currentItem.year}` : ''}&prefer=true`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>立即播放</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 左右箭头 */}
      <button
        onClick={goToPrev}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all z-10"
        aria-label="上一个"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50 transition-all z-10"
        aria-label="下一个"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* 指示器 */}
      <div className="absolute bottom-4 right-4 md:right-6 flex items-center gap-1.5 z-10">
        {bannerItems.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/70 w-6'
            }`}
            aria-label={`切换到第 ${index + 1} 个`}
          />
        ))}
      </div>
    </div>
  );
}
