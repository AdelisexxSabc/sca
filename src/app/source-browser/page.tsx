/* eslint-disable @next/next/no-img-element */

'use client';

import { ExternalLink, Layers, Server, Tv } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ClientCache } from '@/lib/client-cache';
import type { DoubanItem, SearchResult as GlobalSearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';

type Source = { key: string; name: string; api: string };
type Category = { type_id: string | number; type_name: string };
type Item = {
  id: string;
  title: string;
  poster: string;
  year: string;
  type_name?: string;
  remarks?: string;
};

export default function SourceBrowserPage() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [activeSourceKey, setActiveSourceKey] = useState('');
  const activeSource = useMemo(
    () => sources.find((s) => s.key === activeSourceKey),
    [sources, activeSourceKey]
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | number>('');

  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const hasMore = page < pageCount;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastFetchAtRef = useRef(0);
  const _autoFillInProgressRef = useRef(false);

  // 搜索与排序
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'category' | 'search'>('category');
  const [sortBy, setSortBy] = useState<
    'default' | 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc'
  >('default');
  const [debounceId, setDebounceId] = useState<NodeJS.Timeout | null>(null);

  // 二级筛选
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // 详情预览
  type DetailData = GlobalSearchResult & {
    pic?: string;
    area?: string;
    director?: string;
    actor?: string;
    des?: string;
  };
  type DoubanInfo = DoubanItem & {
    rating?: { value?: number };
    intro?: string;
  };
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<DetailData | null>(null);
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [previewDouban, setPreviewDouban] = useState<DoubanInfo | null>(null);
  const [previewDoubanLoading, setPreviewDoubanLoading] = useState(false);
  const [previewDoubanId, setPreviewDoubanId] = useState<number | null>(null);
  type BangumiTag = { name: string };
  type BangumiInfoboxValue = string | { v: string } | Array<string | { v: string }>;
  type BangumiInfoboxEntry = { key: string; value: BangumiInfoboxValue };
  type BangumiSubject = {
    name?: string;
    name_cn?: string;
    date?: string;
    rating?: { score?: number };
    tags?: BangumiTag[];
    infobox?: BangumiInfoboxEntry[];
    summary?: string;
  };
  const [previewBangumi, setPreviewBangumi] = useState<BangumiSubject | null>(null);
  const [previewBangumiLoading, setPreviewBangumiLoading] = useState(false);
  const [_previewSearchPick, setPreviewSearchPick] = useState<GlobalSearchResult | null>(null);

  const fetchSources = useCallback(async () => {
    setLoadingSources(true);
    setSourceError(null);
    try {
      const res = await fetch('/api/source-browser/sites', {
        cache: 'no-store',
      });
      if (res.status === 401) {
        throw new Error('登录状态已失效，请重新登录');
      }
      if (res.status === 403) {
        throw new Error('当前账号暂无可用资源站点');
      }
      if (!res.ok) throw new Error('获取源失败');
      const data = await res.json();
      const list: Source[] = data.sources || [];
      setSources(list);
      if (list.length > 0) {
        setActiveSourceKey(list[0].key);
      }
    } catch (e: unknown) {
      setSourceError(e instanceof Error ? e.message : '获取源失败');
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const fetchCategories = useCallback(async (sourceKey: string) => {
    if (!sourceKey) return;
    setLoadingCategories(true);
    setCategoryError(null);
    try {
      const res = await fetch(
        `/api/source-browser/categories?source=${encodeURIComponent(sourceKey)}`
      );
      if (!res.ok) throw new Error('获取分类失败');
      const data = await res.json();
      const list: Category[] = data.categories || [];
      setCategories(list);
      if (list.length > 0) {
        setActiveCategory(list[0].type_id);
      } else {
        setActiveCategory('');
      }
    } catch (e: unknown) {
      setCategoryError(e instanceof Error ? e.message : '获取分类失败');
      setCategories([]);
      setActiveCategory('');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchItems = useCallback(
    async (
      sourceKey: string,
      typeId: string | number,
      p = 1,
      append = false
    ) => {
      if (!sourceKey || !typeId) return;
      if (append) setLoadingMore(true);
      else setLoadingItems(true);
      setItemsError(null);
      try {
        const res = await fetch(
          `/api/source-browser/list?source=${encodeURIComponent(
            sourceKey
          )}&type_id=${encodeURIComponent(String(typeId))}&page=${p}`
        );
        if (!res.ok) throw new Error('获取列表失败');
        const data = (await res.json()) as {
          items?: Item[];
          meta?: { page?: number; pagecount?: number };
        };
        const list: Item[] = data.items || [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(Number(data.meta?.page || p));
        setPageCount(Number(data.meta?.pagecount || 1));
        // 更新可选年份
        const years = Array.from(
          new Set(list.map((i) => (i.year || '').trim()).filter(Boolean))
        );
        years.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
        setAvailableYears(years);
      } catch (e: unknown) {
        setItemsError(e instanceof Error ? e.message : '获取列表失败');
        if (!append) setItems([]);
        setPage(1);
        setPageCount(1);
        setAvailableYears([]);
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingItems(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    if (activeSourceKey) fetchCategories(activeSourceKey);
  }, [activeSourceKey, fetchCategories]);

  useEffect(() => {
    if (activeSourceKey && activeCategory && mode === 'category') {
      setItems([]);
      setPage(1);
      setPageCount(1);
      fetchItems(activeSourceKey, activeCategory, 1, false);
    }
  }, [activeSourceKey, activeCategory, mode, fetchItems]);

  const fetchSearch = useCallback(
    async (sourceKey: string, q: string, p = 1, append = false) => {
      if (!sourceKey || !q) return;
      if (append) setLoadingMore(true);
      else setLoadingItems(true);
      setItemsError(null);
      try {
        const res = await fetch(
          `/api/source-browser/search?source=${encodeURIComponent(
            sourceKey
          )}&q=${encodeURIComponent(q)}&page=${p}`
        );
        if (!res.ok) throw new Error('搜索失败');
        const data = (await res.json()) as {
          items?: Item[];
          meta?: { page?: number; pagecount?: number };
        };
        const list: Item[] = data.items || [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(Number(data.meta?.page || p));
        setPageCount(Number(data.meta?.pagecount || 1));
        const years = Array.from(
          new Set(list.map((i) => (i.year || '').trim()).filter(Boolean))
        );
        years.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
        setAvailableYears(years);
      } catch (e: unknown) {
        setItemsError(e instanceof Error ? e.message : '搜索失败');
        if (!append) setItems([]);
        setPage(1);
        setPageCount(1);
        setAvailableYears([]);
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingItems(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeSourceKey && mode === 'search' && query.trim()) {
      setItems([]);
      setPage(1);
      setPageCount(1);
      fetchSearch(activeSourceKey, query.trim(), 1, false);
    }
  }, [activeSourceKey, mode, query, fetchSearch]);

  // IntersectionObserver 处理自动翻页
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          const now = Date.now();
          const intervalOk = now - lastFetchAtRef.current > 700;
          if (
            !loadingItems &&
            !loadingMore &&
            hasMore &&
            activeSourceKey &&
            intervalOk
          ) {
            lastFetchAtRef.current = now;
            const next = page + 1;
            if (mode === 'search' && query.trim()) {
              fetchSearch(activeSourceKey, query.trim(), next, true);
            } else if (mode === 'category' && activeCategory) {
              fetchItems(activeSourceKey, activeCategory, next, true);
            }
          }
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    loadingItems,
    loadingMore,
    hasMore,
    page,
    mode,
    activeSourceKey,
    activeCategory,
    query,
    fetchItems,
    fetchSearch,
  ]);

  const filteredAndSorted = useMemo(() => {
    let arr = [...items];
    if (filterKeyword.trim()) {
      const kw = filterKeyword.trim().toLowerCase();
      arr = arr.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(kw) ||
          (i.remarks || '').toLowerCase().includes(kw)
      );
    }
    if (filterYear) {
      arr = arr.filter((i) => (i.year || '').trim() === filterYear);
    }
    if (sortBy === 'title-asc') {
      arr.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    } else if (sortBy === 'title-desc') {
      arr.sort((a, b) => b.title.localeCompare(a.title, 'zh-Hans-CN'));
    } else if (sortBy === 'year-asc') {
      arr.sort(
        (a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0)
      );
    } else if (sortBy === 'year-desc') {
      arr.sort(
        (a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0)
      );
    }
    return arr;
  }, [items, filterKeyword, filterYear, sortBy]);

  // 豆瓣详情获取
  const fetchDoubanDetails = async (doubanId: number) => {
    try {
      setPreviewDoubanLoading(true);
      setPreviewDouban(null);
      const keyRaw = `douban-details-id=${doubanId}`;
      // 1) 先查缓存
      const cached = (await ClientCache.get(keyRaw)) as DoubanInfo | null;
      if (cached) {
        setPreviewDouban(cached);
        return;
      }

      // 2) 缓存未命中，回源请求 /api/douban/details
      const fallback = await fetch(
        `/api/douban/details?id=${encodeURIComponent(String(doubanId))}`
      );
      if (fallback.ok) {
        const dbData = (await fallback.json()) as
          | { code: number; message: string; data?: DoubanInfo }
          | DoubanInfo;
        const normalized = (dbData as { data?: DoubanInfo }).data || (dbData as DoubanInfo);
        setPreviewDouban(normalized);

        // 3) 回写缓存（4小时）
        try {
          await ClientCache.set(keyRaw, normalized, 14400);
        } catch (err) {
          void err; // ignore cache write failure
        }
      } else {
        setPreviewDouban(null);
      }
    } catch (e) {
      void e;
    } finally {
      setPreviewDoubanLoading(false);
    }
  };

  // bangumi工具
  const isBangumiId = (id: number): boolean =>
    id > 0 && id.toString().length === 6;

  const fetchBangumiDetails = async (bangumiId: number) => {
    try {
      setPreviewBangumiLoading(true);
      setPreviewBangumi(null);
      const res = await fetch(`https://api.bgm.tv/v0/subjects/${bangumiId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          name?: string;
          name_cn?: string;
          date?: string;
          rating?: { score?: number };
          tags?: { name: string }[];
          infobox?: { key: string; value: BangumiInfoboxValue }[];
          summary?: string;
        };
        setPreviewBangumi(data);
      }
    } catch (e) {
      // ignore
    } finally {
      setPreviewBangumiLoading(false);
    }
  };

  const openPreview = async (item: Item) => {
    setPreviewItem(item);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewDouban(null);
    setPreviewDoubanId(null);
    setPreviewBangumi(null);
    setPreviewSearchPick(null);
    try {
      const res = await fetch(
        `/api/detail?source=${encodeURIComponent(
          activeSourceKey
        )}&id=${encodeURIComponent(item.id)}`
      );
      if (!res.ok) throw new Error('获取详情失败');
      const data = (await res.json()) as DetailData;
      setPreviewData(data);
      // 处理 douban_id：优先 /api/detail，其次通过 /api/search/one 指定站点精确匹配推断
      let dId: number | null = data?.douban_id ? Number(data.douban_id) : null;
      if (!dId) {
        // 在当前源内精确搜索标题以获取带有 douban_id 的条目
        const normalize = (s: string) =>
          (s || '').replace(/\s+/g, '').toLowerCase();
        const variants = Array.from(
          new Set([item.title, (item.title || '').replace(/\s+/g, '')])
        ).filter(Boolean) as string[];

        for (const v of variants) {
          try {
            const searchRes = await fetch(
              `/api/search/one?resourceId=${encodeURIComponent(
                activeSourceKey
              )}&q=${encodeURIComponent(v)}`
            );
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const pick = searchData.result;
              if (
                pick &&
                normalize(pick.title) === normalize(item.title)
              ) {
                setPreviewSearchPick(pick);
                if (pick.douban_id && Number(pick.douban_id) > 0) {
                  dId = Number(pick.douban_id);
                  break;
                }
              }
            }
          } catch {
            // continue
          }
        }
      }
      if (dId && dId > 0) {
        setPreviewDoubanId(dId);
        if (isBangumiId(dId)) {
          await fetchBangumiDetails(dId);
        } else {
          await fetchDoubanDetails(dId);
        }
      }
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : '获取详情失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const goPlay = (item: Item) => {
    const params = new URLSearchParams();
    params.set('source', activeSourceKey);
    params.set('id', item.id);
    const mergedTitle = (previewData?.title || item.title || '').toString();
    const mergedYear = (previewData?.year || item.year || '').toString();
    if (mergedTitle) params.set('title', mergedTitle);
    if (mergedYear) params.set('year', mergedYear);
    if (previewDoubanId) params.set('douban_id', String(previewDoubanId));
    params.set('prefer', 'true');
    router.push(`/play?${params.toString()}`);
  };

  return (
    <PageLayout activePath='/source-browser'>
      <div className='max-w-7xl mx-auto space-y-6 -mt-6 md:mt-0'>
        {/* Header */}
        <div className='relative'>
          <div className='absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-green-400/10 to-teal-400/10 rounded-2xl blur-3xl'></div>
          <div className='relative flex items-center gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl'>
            <div className='relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 flex items-center justify-center shadow-lg group hover:scale-110 transition-transform duration-300'>
              <div className='absolute inset-0 bg-emerald-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity'></div>
              <Layers className='relative w-8 h-8 text-white drop-shadow-lg' />
            </div>
            <div className='flex-1'>
              <h1 className='text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 bg-clip-text text-transparent'>
                源浏览器
              </h1>
              <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                按来源站与分类浏览内容，探索海量影视资源
              </p>
            </div>
            {sources.length > 0 && (
              <div className='hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'>
                <Server className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
                <span className='text-sm font-medium text-emerald-700 dark:text-emerald-300'>
                  {sources.length} 个源可用
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className='bg-gradient-to-br from-white via-emerald-50/30 to-white dark:from-gray-800 dark:via-emerald-900/10 dark:to-gray-800 rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm'>
          <div className='px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
            <div className='flex items-center gap-2.5 font-semibold text-gray-900 dark:text-white'>
              <div className='w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center'>
                <Server className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
              </div>
              <span>选择来源站</span>
            </div>
            {!loadingSources && sources.length > 0 && (
              <span className='text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'>
                {sources.length} 个
              </span>
            )}
          </div>
          <div className='p-5'>
            {loadingSources ? (
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <div className='w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin'></div>
                加载中...
              </div>
            ) : sourceError ? (
              <div className='flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'>
                <span className='text-sm text-red-600 dark:text-red-400'>{sourceError}</span>
              </div>
            ) : sources.length === 0 ? (
              <div className='text-center py-8'>
                <div className='w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center'>
                  <Server className='w-8 h-8 text-gray-400' />
                </div>
                <p className='text-sm text-gray-500'>暂无可用来源</p>
              </div>
            ) : (
              <div className='flex flex-wrap gap-2.5'>
                {sources.map((s, index) => (
                  <button
                    key={s.key}
                    onClick={() => setActiveSourceKey(s.key)}
                    className={`group relative px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-300 transform hover:scale-105 ${
                      activeSourceKey === s.key
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-transparent shadow-lg shadow-emerald-500/30'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                    style={{
                      animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    {activeSourceKey === s.key && (
                      <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 to-green-400 blur-lg opacity-50 -z-10'></div>
                    )}
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Query & Sort */}
        {activeSource && (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700'>
            <div className='px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3'>
              <div className='flex items-center gap-2'>
                <input
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuery(val);
                    if (debounceId) clearTimeout(debounceId);
                    const id = setTimeout(() => {
                      setMode(val.trim() ? 'search' : 'category');
                      if (val.trim()) {
                        fetchSearch(activeSourceKey, val.trim(), 1);
                      } else if (activeCategory) {
                        fetchItems(activeSourceKey, activeCategory, 1);
                      }
                    }, 500);
                    setDebounceId(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setMode(query.trim() ? 'search' : 'category');
                    }
                  }}
                  placeholder='输入关键词并回车进行搜索；清空回车恢复分类'
                  className='flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm'
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setMode('category');
                      if (activeCategory)
                        fetchItems(activeSourceKey, activeCategory, 1);
                    }}
                    className='px-3 py-2 text-xs border rounded-md whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700'
                    title='清除'
                  >
                    清除
                  </button>
                )}
                <div className='hidden sm:block text-xs text-gray-500 whitespace-nowrap'>
                  {mode === 'search' ? '搜索' : '分类'}
                </div>
              </div>

              <div className='grid grid-cols-2 sm:flex sm:flex-wrap gap-2'>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as
                        | 'default'
                        | 'title-asc'
                        | 'title-desc'
                        | 'year-asc'
                        | 'year-desc'
                    )
                  }
                  className='sm:flex-1 sm:min-w-[120px] px-2 sm:px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm'
                  title='排序'
                >
                  <option value='default'>默认</option>
                  <option value='title-asc'>标题 A→Z</option>
                  <option value='title-desc'>标题 Z→A</option>
                  <option value='year-asc'>年份↑</option>
                  <option value='year-desc'>年份↓</option>
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className='sm:flex-1 sm:min-w-[100px] px-2 sm:px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm'
                  title='年份'
                >
                  <option value=''>全部年份</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <input
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder='地区/关键词'
                  className='col-span-2 sm:flex-1 sm:min-w-[140px] px-2 sm:px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm'
                />
              </div>
            </div>
          </div>
        )}

        {/* Categories and Items */}
        {activeSource && (
          <div className='bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-gray-800 dark:via-blue-900/5 dark:to-gray-800 rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm'>
            <div className='px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <div className='flex items-center gap-2.5 font-semibold text-gray-900 dark:text-white'>
                <div className='w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                  <Tv className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                </div>
                <span>{activeSource.name} 分类</span>
              </div>
              {categories.length > 0 && (
                <span className='text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'>
                  {categories.length} 个分类
                </span>
              )}
            </div>
            <div className='p-5 space-y-5'>
              {mode === 'category' && (
                <div className='flex flex-wrap gap-2.5'>
                  {loadingCategories ? (
                    <div className='flex items-center gap-2 text-sm text-gray-500'>
                      <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                      加载分类...
                    </div>
                  ) : categoryError ? (
                    <div className='flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400'>
                      {categoryError}
                    </div>
                  ) : categories.length === 0 ? (
                    <div className='text-center w-full py-6'>
                      <div className='w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center'>
                        <Tv className='w-8 h-8 text-gray-400' />
                      </div>
                      <p className='text-sm text-gray-500'>暂无分类</p>
                    </div>
                  ) : (
                    categories.map((c, index) => (
                      <button
                        key={String(c.type_id)}
                        onClick={() => setActiveCategory(c.type_id)}
                        className={`group relative px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all duration-300 transform hover:scale-105 ${
                          activeCategory === c.type_id
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-lg shadow-blue-500/30'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                        style={{
                          animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both`,
                        }}
                      >
                        {activeCategory === c.type_id && (
                          <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 blur-lg opacity-50 -z-10'></div>
                        )}
                        {c.type_name}
                      </button>
                    ))
                  )}
                </div>
              )}

              <div>
                {loadingItems ? (
                  <div className='flex items-center gap-2 text-sm text-gray-500'>
                    <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                    加载内容...
                  </div>
                ) : itemsError ? (
                  <div className='flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400'>
                    {itemsError}
                  </div>
                ) : items.length === 0 ? (
                  <div className='text-center py-12'>
                    <div className='w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center'>
                      <Tv className='w-10 h-10 text-gray-400' />
                    </div>
                    <p className='text-sm text-gray-500'>暂无内容</p>
                  </div>
                ) : (
                  <>
                    <div className='grid gap-3 grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
                      {filteredAndSorted.map((item, index) => (
                        <div
                          key={item.id}
                          className='group relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1'
                          style={{
                            animation: `fadeInUp 0.4s ease-out ${index * 0.02}s both`,
                          }}
                        >
                          <div className='absolute inset-0 bg-gradient-to-t from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none z-10'></div>

                          <div
                            className='aspect-[2/3] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 overflow-hidden relative'
                            onClick={() => goPlay(item)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') goPlay(item);
                            }}
                          >
                            {item.poster ? (
                              <img
                                src={item.poster}
                                alt={item.title}
                                className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                                loading='lazy'
                              />
                            ) : (
                              <div className='w-full h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm'>
                                <div className='text-center'>
                                  <Tv className='w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 opacity-50' />
                                  <div className='text-[10px] sm:text-sm'>无封面</div>
                                </div>
                              </div>
                            )}
                            <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>

                            {item.year && (
                              <div className='absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg bg-black/70 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium'>
                                {item.year}
                              </div>
                            )}

                            {item.type_name && (
                              <div className='absolute bottom-1 left-1 sm:bottom-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg bg-blue-500/90 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium'>
                                {item.type_name}
                              </div>
                            )}
                          </div>

                          <div className='p-1.5 sm:p-3 space-y-1 sm:space-y-1.5 relative z-20'>
                            <div
                              className='font-medium text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug min-h-[2rem] sm:min-h-[2.5rem] cursor-pointer'
                              onClick={() => goPlay(item)}
                            >
                              {item.title}
                            </div>
                            {item.remarks && (
                              <div className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1'>
                                {item.remarks}
                              </div>
                            )}
                            <button
                              className='flex items-center gap-1 px-2 py-1 mt-1 rounded bg-gray-100 dark:bg-gray-700 text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreview(item);
                              }}
                            >
                              <ExternalLink className='w-3 h-3' />
                              详情
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      ref={loadMoreRef}
                      className='mt-4 flex items-center justify-center py-4'
                    >
                      {loadingMore ? (
                        <div className='text-sm text-gray-500'>加载更多...</div>
                      ) : hasMore ? (
                        <div className='text-xs text-gray-400'>
                          下拉加载更多
                        </div>
                      ) : (
                        <div className='text-xs text-gray-400'>没有更多了</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white line-clamp-1'>
                {previewItem?.title || '详情'}
              </h2>
              <button
                className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                onClick={() => setPreviewOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className='p-5 space-y-5'>
              {previewLoading && (
                <div className='flex items-center justify-center py-12'>
                  <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                  <span className='ml-3 text-sm text-gray-500'>加载中...</span>
                </div>
              )}

              {previewError && (
                <div className='px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400'>
                  {previewError}
                </div>
              )}

              {!previewLoading && !previewError && (
                <>
                  {/* 基本信息 */}
                  <div className='flex gap-4'>
                    {(previewData?.pic || previewItem?.poster) && (
                      <img
                        src={previewData?.pic || previewItem?.poster}
                        alt={previewData?.title || previewItem?.title}
                        className='w-28 h-40 rounded-lg object-cover flex-shrink-0'
                      />
                    )}
                    <div className='flex-1 space-y-2'>
                      <h3 className='text-base font-semibold text-gray-900 dark:text-white'>
                        {previewData?.title || previewItem?.title}
                      </h3>
                      {(previewData?.year || previewItem?.year) && (
                        <div className='text-sm text-gray-500 dark:text-gray-400'>
                          年份: {previewData?.year || previewItem?.year}
                        </div>
                      )}
                      {previewData?.type_name && (
                        <div className='text-sm text-gray-500 dark:text-gray-400'>
                          类型: {previewData.type_name}
                        </div>
                      )}
                      {previewData?.area && (
                        <div className='text-sm text-gray-500 dark:text-gray-400'>
                          地区: {previewData.area}
                        </div>
                      )}
                      {previewData?.director && (
                        <div className='text-sm text-gray-500 dark:text-gray-400'>
                          导演: {previewData.director}
                        </div>
                      )}
                      {previewData?.actor && (
                        <div className='text-sm text-gray-500 dark:text-gray-400 line-clamp-2'>
                          演员: {previewData.actor}
                        </div>
                      )}
                      {previewDoubanId && (
                        <div className='text-xs text-blue-500'>
                          {isBangumiId(previewDoubanId)
                            ? `Bangumi ID: ${previewDoubanId}`
                            : `豆瓣 ID: ${previewDoubanId}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 简介 */}
                  {previewData?.des && (
                    <div>
                      <div className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        简介
                      </div>
                      <div
                        className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-32 overflow-y-auto'
                        dangerouslySetInnerHTML={{
                          __html: previewData.des.replace(/<[^>]+>/g, ' ').trim(),
                        }}
                      />
                    </div>
                  )}

                  {/* 豆瓣信息 */}
                  {previewDoubanLoading && (
                    <div className='flex items-center gap-2 text-sm text-gray-500'>
                      <div className='w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin'></div>
                      加载豆瓣信息...
                    </div>
                  )}
                  {previewDouban && (
                    <div className='p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30'>
                      <div className='flex items-center gap-2 mb-3'>
                        <span className='text-sm font-semibold text-yellow-700 dark:text-yellow-400'>
                          豆瓣信息
                        </span>
                        {previewDouban.rating?.value && (
                          <span className='px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 text-xs font-medium'>
                            ⭐ {previewDouban.rating.value}
                          </span>
                        )}
                      </div>
                      {previewDouban.intro && (
                        <div className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-24 overflow-y-auto'>
                          {previewDouban.intro}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bangumi 信息 */}
                  {previewBangumiLoading && (
                    <div className='flex items-center gap-2 text-sm text-gray-500'>
                      <div className='w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin'></div>
                      加载 Bangumi 信息...
                    </div>
                  )}
                  {previewBangumi && (
                    <div className='p-4 rounded-xl bg-pink-50 dark:bg-pink-900/10 border border-pink-200 dark:border-pink-800/30'>
                      <div className='flex items-center gap-2 mb-3'>
                        <span className='text-sm font-semibold text-pink-700 dark:text-pink-400'>
                          Bangumi
                        </span>
                        {previewBangumi.rating?.score && (
                          <span className='px-2 py-0.5 rounded bg-pink-400/20 text-pink-700 dark:text-pink-300 text-xs font-medium'>
                            ⭐ {previewBangumi.rating.score}
                          </span>
                        )}
                      </div>
                      <div className='space-y-1 text-sm'>
                        {previewBangumi.name_cn && (
                          <div className='text-gray-700 dark:text-gray-300'>
                            中文名: {previewBangumi.name_cn}
                          </div>
                        )}
                        {previewBangumi.name && (
                          <div className='text-gray-600 dark:text-gray-400'>
                            原名: {previewBangumi.name}
                          </div>
                        )}
                        {previewBangumi.date && (
                          <div className='text-gray-600 dark:text-gray-400'>
                            放送日期: {previewBangumi.date}
                          </div>
                        )}
                      </div>
                      {previewBangumi.summary && (
                        <div className='mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-24 overflow-y-auto'>
                          {previewBangumi.summary}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 播放按钮 */}
                  <div className='flex gap-3 pt-2'>
                    <button
                      className='flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/30'
                      onClick={() => {
                        if (previewItem) goPlay(previewItem);
                        setPreviewOpen(false);
                      }}
                    >
                      立即播放
                    </button>
                    <button
                      className='px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                      onClick={() => setPreviewOpen(false)}
                    >
                      关闭
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </PageLayout>
  );
}
