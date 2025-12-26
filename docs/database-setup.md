# 数据库设置指南

本项目使用 PostgreSQL 数据库和 Prisma ORM。

## 前置要求

1. 安装 PostgreSQL（本地或使用云服务）
2. 确保已安装项目依赖：`npm install`

## 设置步骤

### 1. 配置数据库连接

在项目根目录创建 `.env.local` 文件（如果还没有），并添加数据库连接字符串：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

**示例：**
- 本地 PostgreSQL：`postgresql://postgres:password@localhost:5432/myapp`
- Supabase：`postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`
- Railway：`postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/railway`

### 2. 运行数据库迁移

首次设置时，需要创建数据库表：

```bash
# 推送 schema 到数据库（开发环境推荐）
npm run db:push

# 或者使用迁移（生产环境推荐）
npm run db:migrate
```

### 3. 生成 Prisma Client

Prisma Client 会在构建时自动生成，但也可以手动生成：

```bash
npm run db:generate
```

## 常用命令

- `npm run db:generate` - 生成 Prisma Client
- `npm run db:push` - 推送 schema 变更到数据库（开发环境）
- `npm run db:migrate` - 创建并应用迁移（生产环境）
- `npm run db:studio` - 打开 Prisma Studio（数据库可视化工具）

## 数据库 Schema

### Website 表

```prisma
model Website {
  id         Int      @id @default(autoincrement())
  name       String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("websites")
}
```

## 开发建议

1. **开发环境**：使用 `db:push` 快速迭代 schema 变更
2. **生产环境**：使用 `db:migrate` 创建可追踪的迁移文件
3. **查看数据**：使用 `db:studio` 可视化查看和编辑数据

## 故障排除

### 连接错误

如果遇到连接错误，请检查：
1. PostgreSQL 服务是否运行
2. `DATABASE_URL` 是否正确
3. 数据库用户是否有足够权限

### 权限错误 (permission denied for schema public)

如果遇到 `ERROR: permission denied for schema public` 错误，说明数据库用户没有创建表的权限。解决方法：

**方法 1：授予用户权限（推荐）**
```sql
-- 连接到 PostgreSQL（使用超级用户）
psql -U postgres -d your_database_name

-- 授予用户权限
GRANT ALL PRIVILEGES ON SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_username;
```

**方法 2：使用超级用户**
如果是在开发环境，可以临时使用 postgres 超级用户：
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/database_name
```

**方法 3：创建新用户并授予权限**
```sql
-- 创建新用户
CREATE USER your_username WITH PASSWORD 'your_password';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
\c your_database_name
GRANT ALL ON SCHEMA public TO your_username;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_username;
```

### Prisma Client 错误

如果遇到 Prisma Client 相关错误：
```bash
npm run db:generate
```

### Schema 变更后

每次修改 `prisma/schema.prisma` 后：
```bash
npm run db:push  # 开发环境
# 或
npm run db:migrate  # 生产环境
```

