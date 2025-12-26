#!/bin/bash

# PM2 停止脚本
# 使用方法: ./scripts/pm2-stop.sh

APP_NAME="next-shadcn-dashboard"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "错误: 未找到 PM2"
    exit 1
fi

# 停止应用
pm2 stop $APP_NAME || true
pm2 delete $APP_NAME || true

echo "应用已停止！"
pm2 status

