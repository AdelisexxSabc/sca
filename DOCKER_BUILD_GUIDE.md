# Docker镜像构建与部署指南

## 📋 方案概览

### 方案1: 使用GitHub Actions自动构建（推荐⭐）
**优点**: 自动化、快速、无需本地构建
**适用**: 有GitHub仓库访问权限

### 方案2: 本地Docker构建
**优点**: 完全控制、即时测试
**缺点**: 构建时间较长（5-10分钟）

### 方案3: 使用Zeabur/Vercel等平台自动构建
**优点**: 平台自动检测代码变更并重新构建
**适用**: 云端部署

---

## 🔨 方案1: GitHub Actions自动构建（推荐）

### Step 1: 创建GitHub Actions工作流

在你的仓库中创建 `.github/workflows/docker-build.yml`:

\`\`\`yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]
  workflow_dispatch:  # 允许手动触发

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      
    steps:
      - name: Checkout代码
        uses: actions/checkout@v4
        
      - name: 设置Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: 登录GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
          
      - name: 提取元数据
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/\${{ github.repository }}
          tags: |
            type=raw,value=latest
            type=sha,prefix={{branch}}-
            
      - name: 构建并推送
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
\`\`\`

### Step 2: 推送代码触发构建

\`\`\`bash
git add .github/workflows/docker-build.yml
git commit -m "ci: 添加Docker自动构建工作流"
git push origin main
\`\`\`

### Step 3: 查看构建进度

访问: `https://github.com/你的用户名/仓库名/actions`

### Step 4: 使用构建的镜像

\`\`\`yaml
# docker-compose.yml
services:
  moontv-core:
    image: ghcr.io/你的用户名/仓库名:latest
    # ... 其他配置
\`\`\`

---

## 🐳 方案2: 本地Docker构建

### 快速构建（适合开发测试）

\`\`\`bash
# 1. 构建镜像
docker build -t lunatv-custom:latest .

# 2. 直接运行测试
docker run -d \\
  -p 3000:3000 \\
  -e USERNAME=admin \\
  -e PASSWORD=admin123 \\
  -e NEXT_PUBLIC_STORAGE_TYPE=kvrocks \\
  -e KVROCKS_URL=redis://host.docker.internal:6666 \\
  lunatv-custom:latest

# 3. 查看日志
docker logs -f <container_id>
\`\`\`

### 使用Docker Compose部署

\`\`\`bash
# 使用提供的配置文件
docker-compose -f docker-compose.custom.yml up -d

# 查看状态
docker-compose -f docker-compose.custom.yml ps

# 查看日志
docker-compose -f docker-compose.custom.yml logs -f
\`\`\`

### 推送到容器仓库（可选）

#### 推送到GitHub Container Registry:
\`\`\`bash
# 1. 登录
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 2. 打标签
docker tag lunatv-custom:latest ghcr.io/YOUR_USERNAME/lunatv:latest

# 3. 推送
docker push ghcr.io/YOUR_USERNAME/lunatv:latest
\`\`\`

#### 推送到Docker Hub:
\`\`\`bash
# 1. 登录
docker login

# 2. 打标签
docker tag lunatv-custom:latest YOUR_DOCKERHUB_USERNAME/lunatv:latest

# 3. 推送
docker push YOUR_DOCKERHUB_USERNAME/lunatv:latest
\`\`\`

---

## ☁️ 方案3: 使用Zeabur自动构建

Zeabur支持直接从GitHub仓库构建:

### Step 1: 连接GitHub仓库
1. 登录Zeabur控制台
2. 点击 "Add Service" → "Git"
3. 选择你的GitHub仓库

### Step 2: 配置构建
Zeabur会自动检测Dockerfile并构建

### Step 3: 环境变量配置
在Zeabur服务设置中添加环境变量:
- USERNAME
- PASSWORD
- NEXT_PUBLIC_STORAGE_TYPE
- KVROCKS_URL
- OPEN_REGISTER
- DEFAULT_USER_GROUP

### Step 4: 自动重新部署
每次推送代码到GitHub，Zeabur会自动重新构建和部署

---

## 🔍 构建优化技巧

### 1. 使用 .dockerignore 排除不必要的文件
\`\`\`
node_modules
.next
.git
.github
*.log
.env.local
\`\`\`

### 2. 多阶段构建缓存
Dockerfile已经使用多阶段构建，充分利用Docker层缓存

### 3. 并行构建（本地）
\`\`\`bash
# 使用buildkit加速
DOCKER_BUILDKIT=1 docker build -t lunatv-custom:latest .
\`\`\`

---

## 📊 构建时间参考

| 环境 | 构建时间 | 说明 |
|------|---------|------|
| GitHub Actions | 3-5分钟 | 有缓存时更快 |
| 本地M1/M2 Mac | 5-8分钟 | 首次构建 |
| 本地Intel Mac | 8-12分钟 | 首次构建 |
| Codespace | 10-15分钟 | 网络和资源限制 |
| Zeabur | 4-6分钟 | 云端构建 |

---

## ⚠️ 常见问题

### Q1: 构建超时
**解决**: 使用GitHub Actions或云端平台构建

### Q2: 内存不足
**解决**: 增加Docker Desktop内存限制或使用云端构建

### Q3: node_modules太大
**解决**: 确保.dockerignore包含node_modules

### Q4: 构建缓存未生效
**解决**: 使用 \`docker build --no-cache\` 清除缓存重新构建

---

## 🎯 推荐流程

**开发阶段**:
1. 本地使用 \`pnpm dev\` 开发测试
2. 功能完成后提交到GitHub

**部署阶段**:
1. GitHub Actions自动构建镜像
2. 推送到ghcr.io或Docker Hub
3. 服务器拉取最新镜像部署

**或直接使用云平台**:
1. 连接GitHub仓库到Zeabur/Railway等
2. 平台自动构建部署
3. 代码推送自动更新
