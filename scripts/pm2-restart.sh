#!/bin/bash

# PM2 重启脚本
# 使用方法: ./scripts/pm2-restart.sh

APP_NAME="next-shadcn-dashboard"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "错误: 未找到 PM2"
    exit 1
fi

# 重启应用
pm2 restart $APP_NAME

echo "应用已重启！"
pm2 status

