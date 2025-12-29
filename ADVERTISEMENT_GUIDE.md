# 📢 广告管理系统使用文档

## 🎯 功能概述

LunaTV 广告管理系统已完整实现，支持图片、视频、JS 代码三种广告类型，具备完整的后台管理界面和前端展示功能。

## 📊 系统架构

### 1. 数据库层 (Redis)

- **文件**: `src/lib/redis-base.db.ts`, `src/lib/db.ts`
- **数据结构**:
  - `advertisement:{id}` - 广告数据（JSON 字符串）
  - `advertisements` - 广告索引集合

### 2. API 接口

- **管理端**: `/api/admin/advertisements`
  - GET: 获取所有广告（需要 admin/owner 权限）
  - POST: 创建/更新/删除广告
- **前端**: `/api/advertisements`
  - GET: 获取有效广告（支持 position 参数筛选）

### 3. 前端组件

- **AdvertisementManager** (`src/components/AdvertisementManager.tsx`)
  - 广告管理界面，集成在管理后台
  - 支持创建、编辑、删除、启用/禁用广告
- **AdDisplay** (`src/components/AdDisplay.tsx`)
  - 广告展示组件，用于前端页面
  - 支持自动轮播、关闭按钮

## 🚀 快速开始

### 1. 访问管理界面

```
访问: http://localhost:3001/admin
找到: "广告管理" 标签（喇叭图标）
```

### 2. 创建第一个广告

点击"创建广告"按钮，填写以下信息：

- **广告标题**: 新年促销
- **广告位置**: 首页顶部横幅 (home_banner)
- **广告类型**: 图片
- **素材链接**: https://picsum.photos/1920/400
- **点击跳转**: https://example.com/sale
- **宽度**: 1920
- **高度**: 400
- **生效日期**: 选择当前时间
- **失效日期**: 选择 30 天后
- **优先级**: 100
- **启用状态**: ✓ 启用

点击"保存"即可创建。

### 3. 查看广告展示

访问首页 `http://localhost:3001`，顶部会显示创建的横幅广告。

## 📋 支持的广告位置

| 位置代码         | 中文名称     | 推荐尺寸 | 说明           |
| ---------------- | ------------ | -------- | -------------- |
| `home_banner`    | 首页顶部横幅 | 1920×400 | 首页顶部大图   |
| `home_sidebar`   | 首页侧边栏   | 300×600  | 首页侧边广告位 |
| `player_top`     | 播放器上方   | 640×100  | 播放器上方横幅 |
| `player_bottom`  | 播放器下方   | 640×100  | 播放器下方横幅 |
| `search_results` | 搜索结果页   | 728×90   | 搜索结果页广告 |
| `detail_page`    | 详情页广告   | 300×250  | 详情页侧边栏   |

## 🎨 广告类型说明

### 1. 图片广告 (image)

```
素材链接: 填写图片URL
示例: https://example.com/banner.jpg
```

### 2. 视频广告 (video)

```
素材链接: 填写视频URL（支持MP4等格式）
示例: https://example.com/ad.mp4
自动播放、静音、循环
```

### 3. JS 代码 (js)

```
素材链接: 填写JavaScript代码或HTML片段
示例: <script>console.log('广告展示');</script>
注意: 谨慎使用，确保代码安全
```

## ⚙️ 高级功能

### 1. 优先级排序

- 数字越大，优先级越高
- 同一位置多个广告时，按优先级排序
- 默认值: 0

### 2. 有效期管理

- **生效日期**: 广告开始显示的时间
- **失效日期**: 广告停止显示的时间
- 只有在有效期内且启用的广告才会显示

### 3. 自动轮播

- 同一位置多个广告时自动轮播
- 轮播间隔: 5 秒
- 底部显示轮播指示器

### 4. 关闭按钮

- 前端展示组件支持关闭按钮
- 用户可手动关闭广告
- 通过 `showCloseButton` 属性控制

## 🔧 API 使用示例

### 1. 获取首页横幅广告（前端）

```javascript
fetch('/api/advertisements?position=home_banner')
  .then((res) => res.json())
  .then((data) => {
    console.log(data.advertisements); // 有效广告列表
  });
```

### 2. 创建广告（管理端）

```javascript
fetch('/api/admin/advertisements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    advertisement: {
      position: 'home_banner',
      type: 'image',
      title: '新年促销',
      materialUrl: 'https://example.com/banner.jpg',
      clickUrl: 'https://example.com/sale',
      width: 1920,
      height: 400,
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      enabled: true,
      priority: 100,
    },
  }),
});
```

### 3. 更新广告状态

```javascript
fetch('/api/admin/advertisements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'update',
    advertisement: {
      id: 'ad_1234567890_abc',
      enabled: false, // 禁用广告
    },
  }),
});
```

### 4. 删除广告

```javascript
fetch('/api/admin/advertisements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'delete',
    advertisement: {
      id: 'ad_1234567890_abc',
    },
  }),
});
```

## 🎯 前端集成

### 在页面中使用广告组件

```tsx
import AdDisplay from '@/components/AdDisplay';

// 基础使用
<AdDisplay position="home_banner" />

// 带关闭按钮
<AdDisplay
  position="home_banner"
  showCloseButton={true}
  onClose={() => console.log('广告已关闭')}
/>

// 自定义样式
<AdDisplay
  position="player_bottom"
  className="my-6 rounded-lg shadow-lg"
/>
```

## 📝 管理界面功能

### 广告列表

- ✅ 显示所有广告及状态（生效中/已禁用/未生效）
- ✅ 按类型显示图标（图片/视频/JS）
- ✅ 显示详细信息（位置、优先级、有效期等）
- ✅ 支持快速启用/禁用

### 创建/编辑广告

- ✅ 表单验证（必填字段检查）
- ✅ 日期时间选择器
- ✅ 实时预览（计划）
- ✅ 富文本编辑器（JS 代码）

### 操作按钮

- 👁️ 启用/禁用切换
- ✏️ 编辑广告信息
- 🗑️ 删除广告（需确认）

## 🔒 权限控制

- **管理端 API**: 需要 `owner` 或 `admin` 角色
- **前端 API**: 公开访问（仅返回有效广告）
- **缓存策略**: 前端 API 缓存 5 分钟

## 📈 状态说明

| 状态标识 | 颜色 | 含义                 |
| -------- | ---- | -------------------- |
| 生效中   | 绿色 | 已启用且在有效期内   |
| 已禁用   | 灰色 | 手动禁用             |
| 未生效   | 橙色 | 已启用但不在有效期内 |

## 🎨 前端展示特性

- ✅ 自适应尺寸（支持固定宽高或自适应）
- ✅ 点击跳转（新窗口打开）
- ✅ 轮播指示器（多个广告时）
- ✅ 广告标识（左上角"广告"文字）
- ✅ 关闭按钮（右上角 X 按钮）
- ✅ 平滑过渡动画

## 🔄 数据流程

```
创建广告:
用户填写表单 → 提交到管理端API → 验证数据 → 存储到Redis → 返回成功

展示广告:
前端组件加载 → 调用前端API → Redis查询 → 过滤有效广告 → 按优先级排序 → 返回数据 → 渲染展示
```

## ⚡ 性能优化

- ✅ 前端 API 缓存 5 分钟（减少 Redis 查询）
- ✅ 按需加载（组件按需引入）
- ✅ 轻量级实现（无额外依赖）
- ✅ 索引优化（使用 Redis Set 存储广告 ID 列表）

## 🐛 故障排查

### 1. 广告不显示

- 检查广告是否启用（enabled: true）
- 检查是否在有效期内
- 检查 position 是否匹配
- 查看浏览器控制台是否有错误

### 2. 管理界面无法访问

- 确认已登录且具有 admin/owner 权限
- 检查浏览器 Cookie 是否正常

### 3. 创建广告失败

- 确认所有必填字段已填写
- 检查日期设置是否合理
- 查看 API 返回的错误信息

## 📚 相关文件

```
src/
├── lib/
│   ├── types.ts              # Advertisement类型定义
│   ├── redis-base.db.ts      # 数据库方法实现
│   └── db.ts                 # 数据库管理器
├── app/
│   ├── api/
│   │   ├── advertisements/   # 前端API
│   │   └── admin/
│   │       └── advertisements/ # 管理端API
│   ├── admin/
│   │   └── page.tsx          # 管理界面集成
│   └── page.tsx              # 首页广告展示
└── components/
    ├── AdvertisementManager.tsx  # 管理组件
    └── AdDisplay.tsx             # 展示组件
```

## 🎉 总结

广告管理系统已全部实现，包括：

- ✅ 完整的数据库设计和实现
- ✅ 管理端和前端 API 接口
- ✅ 功能完善的管理界面
- ✅ 灵活的前端展示组件
- ✅ 支持图片、视频、JS 三种类型
- ✅ 优先级排序和有效期管理
- ✅ 自动轮播和关闭功能

现在您可以：

1. 访问 http://localhost:3001/admin 创建和管理广告
2. 访问 http://localhost:3001 查看首页广告展示
3. 根据需要在其他页面集成广告展示组件
