# PM2 部署指南

本文档介绍如何使用 PM2 在生产环境中部署和管理 Next.js Dashboard 应用。

## 前置要求

1. **Node.js**: 确保已安装 Node.js（推荐 v18+）
2. **PM2**: 全局安装 PM2
   ```bash
   npm install -g pm2
   ```
3. **PostgreSQL**: 确保数据库已配置并可访问
4. **环境变量**: 配置 `.env.local` 文件

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件并配置：

```bash
cp env.example.txt .env.local
```

编辑 `.env.local` 文件，配置必要的环境变量（数据库连接、Clerk 密钥等）。

### 3. 数据库迁移

```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库 schema（开发环境）
npm run db:push

# 或运行迁移（生产环境推荐）
npm run db:migrate
```

### 4. 部署应用

#### 方式一：使用部署脚本（推荐）

```bash
# 生产环境部署
./scripts/deploy.sh production

# 或使用 npm 脚本
npm run deploy

# 开发环境部署
./scripts/deploy.sh development
# 或
npm run deploy:dev
```

#### 方式二：手动部署

```bash
# 1. 构建项目
npm run build

# 2. 启动 PM2
pm2 start ecosystem.config.js --env production

# 3. 保存 PM2 进程列表
pm2 save

# 4. 设置开机自启（可选）
pm2 startup
```

## PM2 常用命令

### 使用 npm 脚本

```bash
# 启动应用
npm run pm2:start          # 开发环境
npm run pm2:start:prod     # 生产环境

# 停止应用
npm run pm2:stop

# 重启应用
npm run pm2:restart

# 删除应用
npm run pm2:delete

# 查看日志
npm run pm2:logs

# 查看状态
npm run pm2:status

# 监控面板
npm run pm2:monit
```

### 直接使用 PM2 命令

```bash
# 启动
pm2 start ecosystem.config.js
pm2 start ecosystem.config.js --env production

# 停止
pm2 stop next-shadcn-dashboard

# 重启
pm2 restart next-shadcn-dashboard

# 删除
pm2 delete next-shadcn-dashboard

# 查看日志
pm2 logs next-shadcn-dashboard
pm2 logs next-shadcn-dashboard --lines 100  # 查看最近 100 行

# 查看状态
pm2 status
pm2 list

# 监控
pm2 monit

# 查看详细信息
pm2 show next-shadcn-dashboard

# 重新加载（零停机时间）
pm2 reload next-shadcn-dashboard
```

## 配置文件说明

### ecosystem.config.js

PM2 配置文件包含以下主要配置：

- **name**: 应用名称
- **script**: 启动脚本
- **instances**: 实例数量（1 或 'max'）
- **exec_mode**: 执行模式（'fork' 或 'cluster'）
- **env**: 环境变量配置
- **日志配置**: 错误日志、输出日志位置
- **自动重启**: 配置自动重启策略

你可以根据需求修改 `ecosystem.config.js` 文件。

## 日志管理

### 日志位置

日志文件保存在 `./logs/` 目录：

- `pm2-error.log`: 错误日志
- `pm2-out.log`: 标准输出日志
- `pm2-combined.log`: 合并日志

### 查看日志

```bash
# 实时查看日志
pm2 logs next-shadcn-dashboard

# 查看最近 100 行
pm2 logs next-shadcn-dashboard --lines 100

# 清空日志
pm2 flush

# 查看错误日志
tail -f logs/pm2-error.log

# 查看输出日志
tail -f logs/pm2-out.log
```

## 性能监控

### PM2 监控面板

```bash
pm2 monit
```

监控面板显示：
- CPU 使用率
- 内存使用情况
- 日志输出
- 进程状态

### 查看详细信息

```bash
pm2 show next-shadcn-dashboard
```

## 开机自启

设置 PM2 开机自启，确保服务器重启后应用自动启动：

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

**注意**: `pm2 startup` 会输出一个命令，需要以 root 权限运行该命令。

## 更新部署

### 方式一：使用部署脚本（推荐）

```bash
./scripts/deploy.sh production
```

脚本会自动：
1. 安装依赖
2. 生成 Prisma Client
3. 构建项目
4. 停止旧进程
5. 启动新进程

### 方式二：手动更新

```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖
npm install

# 3. 生成 Prisma Client
npm run db:generate

# 4. 运行数据库迁移（如果需要）
npm run db:migrate

# 5. 构建项目
npm run build

# 6. 重新加载应用（零停机时间）
pm2 reload next-shadcn-dashboard

# 或重启应用
pm2 restart next-shadcn-dashboard
```

## 故障排查

### 应用无法启动

1. **检查日志**:
   ```bash
   pm2 logs next-shadcn-dashboard --err
   ```

2. **检查环境变量**:
   ```bash
   pm2 show next-shadcn-dashboard
   ```

3. **检查端口占用**:
   ```bash
   lsof -i :3000
   ```

4. **检查数据库连接**:
   确保 `.env.local` 中的 `DATABASE_URL` 正确

### 应用频繁重启

1. **查看重启原因**:
   ```bash
   pm2 show next-shadcn-dashboard
   ```

2. **检查内存使用**:
   ```bash
   pm2 monit
   ```

3. **调整内存限制**:
   修改 `ecosystem.config.js` 中的 `max_memory_restart`

### 日志文件过大

定期清理日志：

```bash
# 清空所有日志
pm2 flush

# 或手动删除日志文件
rm logs/*.log
```

## 多环境部署

### 开发环境

```bash
pm2 start ecosystem.config.js --env development
```

### 生产环境

```bash
pm2 start ecosystem.config.js --env production
```

## 集群模式（可选）

如果需要使用集群模式提高性能，可以修改 `ecosystem.config.js`:

```javascript
{
  instances: 'max',  // 使用所有 CPU 核心
  exec_mode: 'cluster'  // 集群模式
}
```

**注意**: Next.js 默认不支持集群模式，需要额外配置。

## 安全建议

1. **环境变量**: 确保 `.env.local` 文件不被提交到版本控制
2. **防火墙**: 配置防火墙规则，只开放必要端口
3. **HTTPS**: 使用 Nginx 等反向代理配置 HTTPS
4. **日志轮转**: 配置日志轮转，避免日志文件过大
5. **监控告警**: 配置监控告警，及时发现问题

## 使用 Nginx 反向代理（可选）

如果使用 Nginx 作为反向代理，配置示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 相关资源

- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)

