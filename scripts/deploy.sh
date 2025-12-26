#!/bin/bash

# PM2 部署脚本
# 使用方法: ./scripts/deploy.sh [production|development]

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
ENV=${1:-production}
APP_NAME="next-shadcn-dashboard"
LOG_DIR="./logs"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}开始部署 Next.js Dashboard${NC}"
echo -e "${GREEN}环境: ${ENV}${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未找到 npm${NC}"
    exit 1
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}警告: 未找到 PM2，正在安装...${NC}"
    npm install -g pm2
fi

# 创建日志目录
echo -e "${GREEN}创建日志目录...${NC}"
mkdir -p $LOG_DIR

# 检查 .env 文件
if [ ! -f .env.local ] && [ ! -f .env ]; then
    echo -e "${YELLOW}警告: 未找到 .env.local 或 .env 文件${NC}"
    echo -e "${YELLOW}请确保环境变量已正确配置${NC}"
fi

# 安装依赖
echo -e "${GREEN}安装依赖...${NC}"
npm install

# 生成 Prisma Client
echo -e "${GREEN}生成 Prisma Client...${NC}"
npm run db:generate

# 运行数据库迁移（可选，根据需要取消注释）
# echo -e "${GREEN}运行数据库迁移...${NC}"
# npm run db:push

# 构建项目
echo -e "${GREEN}构建项目...${NC}"
npm run build

# 停止现有进程（如果存在）
echo -e "${GREEN}停止现有进程...${NC}"
pm2 delete $APP_NAME 2>/dev/null || true

# 启动应用
echo -e "${GREEN}启动应用...${NC}"
if [ "$ENV" = "production" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env development
fi

# 保存 PM2 进程列表
pm2 save

# 设置 PM2 开机自启（可选）
read -p "是否设置 PM2 开机自启? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 startup
    echo -e "${GREEN}已设置 PM2 开机自启${NC}"
fi

# 显示状态
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
pm2 status
pm2 logs $APP_NAME --lines 20

echo -e "${GREEN}常用命令:${NC}"
echo -e "  查看日志: ${YELLOW}pm2 logs $APP_NAME${NC}"
echo -e "  查看状态: ${YELLOW}pm2 status${NC}"
echo -e "  重启应用: ${YELLOW}pm2 restart $APP_NAME${NC}"
echo -e "  停止应用: ${YELLOW}pm2 stop $APP_NAME${NC}"
echo -e "  删除应用: ${YELLOW}pm2 delete $APP_NAME${NC}"

