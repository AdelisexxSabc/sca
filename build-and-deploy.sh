#!/bin/bash
# Docker镜像构建与部署脚本

set -e

echo "🔨 开始构建Docker镜像..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Step 1: 构建本地镜像${NC}"
docker build -t lunatv-custom:latest .

echo -e "${GREEN}✅ 镜像构建完成！${NC}"
echo ""

# 显示镜像信息
echo -e "${BLUE}📋 镜像信息:${NC}"
docker images | grep lunatv-custom || echo "未找到镜像"
echo ""

echo -e "${YELLOW}🚀 部署选项:${NC}"
echo ""
echo "选择部署方式:"
echo "  1) 本地Docker Compose部署"
echo "  2) 推送到GitHub Container Registry (ghcr.io)"
echo "  3) 推送到Docker Hub"
echo "  4) 仅构建，稍后手动部署"
echo ""

read -p "请选择 (1-4): " choice

case $choice in
  1)
    echo -e "${BLUE}🐳 使用Docker Compose启动...${NC}"
    if [ -f "docker-compose.custom.yml" ]; then
      docker-compose -f docker-compose.custom.yml down 2>/dev/null || true
      docker-compose -f docker-compose.custom.yml up -d
      echo -e "${GREEN}✅ 服务已启动！${NC}"
      echo -e "访问: ${BLUE}http://localhost:3000${NC}"
    else
      echo -e "${YELLOW}⚠️  未找到 docker-compose.custom.yml${NC}"
      echo "请使用以下命令手动创建配置文件"
    fi
    ;;
    
  2)
    echo -e "${BLUE}📤 推送到GitHub Container Registry...${NC}"
    read -p "请输入GitHub用户名: " github_user
    
    # 登录GHCR
    echo -e "${YELLOW}请输入GitHub Personal Access Token (需要 write:packages 权限)${NC}"
    docker login ghcr.io -u "$github_user"
    
    # 打标签并推送
    docker tag lunatv-custom:latest "ghcr.io/${github_user}/lunatv:latest"
    docker push "ghcr.io/${github_user}/lunatv:latest"
    
    echo -e "${GREEN}✅ 推送完成！${NC}"
    echo -e "镜像地址: ${BLUE}ghcr.io/${github_user}/lunatv:latest${NC}"
    ;;
    
  3)
    echo -e "${BLUE}📤 推送到Docker Hub...${NC}"
    read -p "请输入Docker Hub用户名: " docker_user
    
    # 登录Docker Hub
    docker login
    
    # 打标签并推送
    docker tag lunatv-custom:latest "${docker_user}/lunatv:latest"
    docker push "${docker_user}/lunatv:latest"
    
    echo -e "${GREEN}✅ 推送完成！${NC}"
    echo -e "镜像地址: ${BLUE}${docker_user}/lunatv:latest${NC}"
    ;;
    
  4)
    echo -e "${GREEN}✅ 镜像已构建，可手动部署${NC}"
    echo ""
    echo "使用方法:"
    echo "  docker run -d -p 3000:3000 lunatv-custom:latest"
    ;;
    
  *)
    echo -e "${YELLOW}无效选择${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}🎉 完成！${NC}"
