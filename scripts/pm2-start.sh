#!/bin/bash

# PM2 快速启动脚本
# 使用方法: ./scripts/pm2-start.sh [production|development]

set -e

ENV=${1:-production}
APP_NAME="next-shadcn-dashboard"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "错误: 未找到 PM2，请先安装: npm install -g pm2"
    exit 1
fi

# 创建日志目录
mkdir -p ./logs

# 启动应用
if [ "$ENV" = "production" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env development
fi

echo "应用已启动！"
pm2 status

