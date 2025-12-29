#!/bin/bash

# 广告管理系统测试脚本

echo "========================================="
echo "📢 广告管理系统测试"
echo "========================================="
echo ""

# 服务器地址
SERVER="http://localhost:3001"

# 获取当前时间戳（毫秒）
START_DATE=$(date +%s000)
END_DATE=$(date -d "+30 days" +%s000)

echo "1️⃣ 测试创建图片广告（首页横幅）"
echo "----------------------------------------"
CREATE_RESULT=$(curl -s -X POST "$SERVER/api/admin/advertisements" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"create\",
    \"advertisement\": {
      \"position\": \"home_banner\",
      \"type\": \"image\",
      \"title\": \"新年促销广告\",
      \"materialUrl\": \"https://picsum.photos/1920/400\",
      \"clickUrl\": \"https://example.com/sale\",
      \"width\": 1920,
      \"height\": 400,
      \"startDate\": $START_DATE,
      \"endDate\": $END_DATE,
      \"enabled\": true,
      \"priority\": 100
    }
  }")

echo "$CREATE_RESULT" | jq '.' || echo "$CREATE_RESULT"
echo ""

echo "2️⃣ 测试创建视频广告（播放器底部）"
echo "----------------------------------------"
curl -s -X POST "$SERVER/api/admin/advertisements" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"create\",
    \"advertisement\": {
      \"position\": \"player_bottom\",
      \"type\": \"video\",
      \"title\": \"视频广告示例\",
      \"materialUrl\": \"https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4\",
      \"clickUrl\": \"https://example.com/video\",
      \"width\": 640,
      \"height\": 360,
      \"startDate\": $START_DATE,
      \"endDate\": $END_DATE,
      \"enabled\": true,
      \"priority\": 90
    }
  }" | jq '.' 2>/dev/null || echo "创建成功"
echo ""

echo "3️⃣ 获取所有广告（管理后台）"
echo "----------------------------------------"
curl -s "$SERVER/api/admin/advertisements" | jq '.' || echo "获取失败"
echo ""

echo "4️⃣ 获取首页横幅广告（前端接口）"
echo "----------------------------------------"
curl -s "$SERVER/api/advertisements?position=home_banner" | jq '.' || echo "获取失败"
echo ""

echo "5️⃣ 获取所有有效广告（前端接口）"
echo "----------------------------------------"
curl -s "$SERVER/api/advertisements" | jq '.' || echo "获取失败"
echo ""

echo "========================================="
echo "✅ 测试完成！"
echo "========================================="
echo ""
echo "📝 后续操作："
echo "1. 访问 http://localhost:3001/admin 查看广告管理界面"
echo "2. 访问 http://localhost:3001 查看首页广告展示"
echo "3. 可以在管理界面编辑、启用/禁用、删除广告"
echo ""
