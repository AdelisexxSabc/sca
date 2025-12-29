/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Code, Edit2, Eye, EyeOff, Image, Plus, Trash2, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Advertisement {
  id: string;
  position: string;
  type: 'image' | 'video' | 'js';
  title: string;
  materialUrl: string;
  clickUrl?: string;
  width?: number;
  height?: number;
  startDate: number;
  endDate: number;
  enabled: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

interface AlertConfig {
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  timer?: number;
}

interface AdvertisementManagerProps {
  showAlert?: (config: AlertConfig) => void;
}

const AdvertisementManager: React.FC<AdvertisementManagerProps> = ({ showAlert }) => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 广告位置选项
  const positions = [
    { value: 'home_banner', label: '首页顶部横幅' },
    { value: 'home_sidebar', label: '首页侧边栏' },
    { value: 'player_top', label: '播放器上方' },
    { value: 'player_bottom', label: '播放器下方' },
    { value: 'search_results', label: '搜索结果页' },
    { value: 'detail_page', label: '详情页广告' },
  ];

  // 获取广告列表
  const fetchAdvertisements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/advertisements');
      if (!response.ok) {
        throw new Error('获取广告列表失败');
      }
      const data = await response.json();
      console.log('获取到的广告数据:', data);
      setAdvertisements(data.advertisements || []);
    } catch (error: any) {
      console.error('获取广告失败:', error);
      showAlert?.({
        type: 'error',
        title: '错误',
        message: error.message || '获取广告列表失败',
      });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchAdvertisements();
  }, [fetchAdvertisements]);

  // 创建/更新广告
  const handleSaveAdvertisement = async () => {
    if (!editingAd) return;

    // 确保有默认值
    const adToSave = {
      ...editingAd,
      type: editingAd.type || 'image',
      title: editingAd.title || '广告图片',
      enabled: editingAd.enabled ?? true,
      priority: editingAd.priority ?? 0,
    };
    
    console.log('准备保存广告 - editingAd:', editingAd);
    console.log('准备保存广告 - adToSave:', adToSave);

    // 验证必填字段
    if (!adToSave.position || !adToSave.materialUrl) {
      showAlert?.({
        type: 'error',
        title: '验证失败',
        message: '请填写图片链接',
      });
      return;
    }

    if (!adToSave.startDate || !adToSave.endDate) {
      showAlert?.({
        type: 'error',
        title: '验证失败',
        message: '请设置开始时间和结束时间',
      });
      return;
    }

    setLoading(true);
    try {
      const action = editingAd.id ? 'update' : 'create';
      const response = await fetch('/api/admin/advertisements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          advertisement: adToSave,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存广告失败');
      }

      const result = await response.json();
      console.log('保存广告成功:', result);

      showAlert?.({
        type: 'success',
        title: '成功',
        message: `广告${action === 'create' ? '创建' : '更新'}成功`,
        timer: 2000,
      });

      setShowForm(false);
      setEditingAd(null);
      
      // 等待一下再重新获取，确保数据已保存
      setTimeout(() => {
        fetchAdvertisements();
      }, 100);
    } catch (error: any) {
      showAlert?.({
        type: 'error',
        title: '错误',
        message: error.message || '保存广告失败',
      });
    } finally {
      setLoading(false);
    }
  };

  // 删除广告
  const handleDeleteAdvertisement = async (id: string) => {
    if (!confirm('确认删除此广告？')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/advertisements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          advertisement: { id },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除广告失败');
      }

      showAlert?.({
        type: 'success',
        title: '成功',
        message: '广告删除成功',
        timer: 2000,
      });

      fetchAdvertisements();
    } catch (error: any) {
      showAlert?.({
        type: 'error',
        title: '错误',
        message: error.message || '删除广告失败',
      });
    } finally {
      setLoading(false);
    }
  };

  // 切换广告启用状态
  const handleToggleEnabled = async (ad: Advertisement) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/advertisements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          advertisement: {
            id: ad.id,
            enabled: !ad.enabled,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新状态失败');
      }

      showAlert?.({
        type: 'success',
        title: '成功',
        message: `广告已${!ad.enabled ? '启用' : '禁用'}`,
        timer: 2000,
      });

      fetchAdvertisements();
    } catch (error: any) {
      showAlert?.({
        type: 'error',
        title: '错误',
        message: error.message || '更新状态失败',
      });
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 检查广告是否在有效期内
  const isInValidPeriod = (ad: Advertisement) => {
    const now = Date.now();
    return now >= ad.startDate && now <= ad.endDate;
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={16} className="text-blue-500" aria-label="图片广告" />;
      case 'video':
        return <Video size={16} className="text-purple-500" aria-label="视频广告" />;
      case 'js':
        return <Code size={16} className="text-green-500" aria-label="JS广告" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 头部操作栏 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          广告管理 ({advertisements.length})
        </h3>
        <button
          onClick={() => {
            setEditingAd({
              position: 'home_banner',
              type: 'image',
              enabled: true,
              priority: 0,
              startDate: Date.now(),
              endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后
            });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={16} />
          <span>创建广告</span>
        </button>
      </div>

      {/* 广告列表 */}
      {loading && !showForm ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : advertisements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无广告</div>
      ) : (
        <div className="space-y-3">
          {advertisements.map((ad) => {
            const inValidPeriod = isInValidPeriod(ad);
            const isActive = ad.enabled && inValidPeriod;

            return (
              <div
                key={ad.id}
                className={`p-4 rounded-lg border ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    {/* 标题和状态 */}
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(ad.type)}
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {ad.title}
                      </h4>
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">
                          生效中
                        </span>
                      )}
                      {!ad.enabled && (
                        <span className="px-2 py-0.5 text-xs bg-gray-500 text-white rounded">
                          已禁用
                        </span>
                      )}
                      {ad.enabled && !inValidPeriod && (
                        <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded">
                          未生效
                        </span>
                      )}
                    </div>

                    {/* 详细信息 */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">位置：</span>
                        {positions.find((p) => p.value === ad.position)?.label || ad.position}
                      </div>
                      <div>
                        <span className="font-medium">优先级：</span>
                        {ad.priority}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">素材：</span>
                        <a
                          href={ad.materialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          {ad.materialUrl.length > 50
                            ? ad.materialUrl.substring(0, 50) + '...'
                            : ad.materialUrl}
                        </a>
                      </div>
                      {ad.clickUrl && (
                        <div className="col-span-2">
                          <span className="font-medium">跳转：</span>
                          <a
                            href={ad.clickUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline ml-1"
                          >
                            {ad.clickUrl.length > 50
                              ? ad.clickUrl.substring(0, 50) + '...'
                              : ad.clickUrl}
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">生效：</span>
                        {formatDate(ad.startDate)}
                      </div>
                      <div>
                        <span className="font-medium">失效：</span>
                        {formatDate(ad.endDate)}
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleEnabled(ad)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title={ad.enabled ? '禁用' : '启用'}
                    >
                      {ad.enabled ? (
                        <Eye size={16} className="text-green-600" />
                      ) : (
                        <EyeOff size={16} className="text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        console.log('编辑广告:', ad);
                        setEditingAd({
                          ...ad,
                          // 确保所有字段都被加载
                          width: ad.width,
                          height: ad.height,
                        });
                        setShowForm(true);
                      }}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteAdvertisement(ad.id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 编辑/创建表单模态框 - 重新设计的简洁版本 */}
      {showForm && editingAd && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-start justify-center overflow-y-auto">
          <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
              {/* 头部 */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {editingAd.id ? '编辑广告' : '创建广告'}
                </h3>
              </div>

              {/* 表单内容 - 可滚动区域 */}
              <div className="px-4 sm:px-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* 广告位置 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      广告位置 *
                    </label>
                    <select
                      value={editingAd.position || ''}
                      onChange={(e) =>
                        setEditingAd({ ...editingAd, position: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {positions.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 图片URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      图片链接 *
                    </label>
                    <input
                      type="url"
                      value={editingAd.materialUrl || ''}
                      onChange={(e) =>
                        setEditingAd({ 
                          ...editingAd, 
                          materialUrl: e.target.value,
                          type: 'image',
                          title: editingAd.title || '广告图片'
                        })
                      }
                      className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      输入图片的完整URL地址
                    </p>
                    
                    {/* 图片预览 */}
                    {editingAd.materialUrl && (
                      <div className="mt-3 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">预览：</p>
                        <div className="flex justify-center">
                          <img
                            src={editingAd.materialUrl}
                            alt="广告预览"
                            className="max-w-full h-auto max-h-48 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '';
                              e.currentTarget.alt = '图片加载失败';
                              e.currentTarget.className = 'text-red-500 text-sm';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 广告尺寸 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      广告尺寸
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            value={editingAd.width || ''}
                            onChange={(e) =>
                              setEditingAd({
                                ...editingAd,
                                width: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            className="w-full px-3 py-2.5 pr-10 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="宽度"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                            px
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <input
                            type="number"
                            value={editingAd.height || ''}
                            onChange={(e) =>
                              setEditingAd({
                                ...editingAd,
                                height: e.target.value ? parseInt(e.target.value) : undefined,
                              })
                            }
                            className="w-full px-3 py-2.5 pr-10 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="高度"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                            px
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      可选，留空则自适应
                    </p>
                  </div>

                  {/* 点击跳转链接 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      点击跳转链接
                    </label>
                    <input
                      type="url"
                      value={editingAd.clickUrl || ''}
                      onChange={(e) =>
                        setEditingAd({ ...editingAd, clickUrl: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com (可选)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      用户点击广告后跳转的页面，留空则不跳转
                    </p>
                  </div>

                  {/* 开始时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      开始时间 *
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingAd.startDate
                          ? new Date(editingAd.startDate).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingAd({
                          ...editingAd,
                          startDate: new Date(e.target.value).getTime(),
                        })
                      }
                      className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 结束时间 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      结束时间 *
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingAd.endDate
                          ? new Date(editingAd.endDate).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingAd({
                          ...editingAd,
                          endDate: new Date(e.target.value).getTime(),
                        })
                      }
                      className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 启用开关 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      立即启用
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingAd.enabled ?? true}
                        onChange={(e) =>
                          setEditingAd({ ...editingAd, enabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 底部按钮 - 固定不滚动 */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAd(null);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAdvertisement}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertisementManager;
