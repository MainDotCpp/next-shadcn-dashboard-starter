# 访问者记录 API 文档

## 接口地址

```
/api/detect
```

## 功能说明

该接口用于记录访问者的信息到数据库，不进行任何检测或判断，只负责收集和保存访问者数据。

## 记录的访问者信息

- **IP 地址**：客户端真实 IP（支持代理和负载均衡器）
- **User-Agent**：浏览器/客户端信息
- **Referer**：来源页面
- **Accept-Language**：语言偏好
- **国家代码**：地理位置（如果可用，如 Cloudflare/Vercel）
- **是否机器人**：自动识别爬虫和机器人
- **是否移动设备**：检测是否为移动设备访问
- **访问时间**：自动记录访问时间戳

## 接口方法

### GET /api/detect

记录访问者信息到数据库。

#### 请求示例

```bash
GET /api/detect
```

#### 响应示例

```json
{
  "success": true,
  "message": "Visitor information recorded"
}
```

---

### POST /api/detect

记录访问者信息到数据库（支持传递额外数据，但当前版本仅记录基础信息）。

#### 请求示例

```bash
curl -X POST /api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "custom": "data"
    }
  }'
```

#### 响应示例

```json
{
  "success": true,
  "message": "Visitor information recorded"
}
```

---

## 数据库表结构

访问记录保存在 `visitor_logs` 表中，包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键，自增 |
| ip | String | IP 地址 |
| user_agent | String? | User-Agent |
| referer | String? | Referer |
| accept_language | String? | Accept-Language |
| country | String? | 国家代码 |
| is_bot | Boolean | 是否是机器人（默认 false） |
| is_mobile | Boolean | 是否是移动设备（默认 false） |
| created_at | DateTime | 访问时间 |

## IP 地址获取优先级

接口会按以下顺序尝试获取真实 IP：

1. `x-forwarded-for` 头（取第一个 IP）
2. `x-real-ip` 头
3. `cf-connecting-ip` 头（Cloudflare）
4. 如果都未找到，返回 `unknown`

## 使用示例

### JavaScript/TypeScript

```typescript
// 记录访问者信息
const response = await fetch('/api/detect');
const data = await response.json();
console.log(data.success); // true
```

### cURL

```bash
# GET 请求
curl http://localhost:3000/api/detect

# POST 请求
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json"
```

## 查询访问记录

你可以通过 Prisma 查询访问记录：

```typescript
import { prisma } from '@/lib/db';

// 获取所有访问记录
const logs = await prisma.visitorLog.findMany({
  orderBy: {
    created_at: 'desc'
  },
  take: 100
});

// 按 IP 查询
const ipLogs = await prisma.visitorLog.findMany({
  where: {
    ip: '192.168.1.1'
  }
});

// 查询特定时间段的记录
const recentLogs = await prisma.visitorLog.findMany({
  where: {
    created_at: {
      gte: new Date('2024-01-01')
    }
  }
});
```

## 注意事项

1. **数据库迁移**：首次使用前需要运行数据库迁移：
   ```bash
   npm run db:push
   ```

2. **性能考虑**：每次访问都会写入数据库，如果访问量很大，建议：
   - 添加数据库索引（已自动添加 IP 和 created_at 索引）
   - 考虑使用批量插入
   - 定期清理旧数据

3. **隐私保护**：确保遵守相关隐私法规，合理使用访问者数据

4. **地理位置**：国家代码需要代理服务支持（如 Cloudflare 或 Vercel）

## 错误响应

如果发生错误，接口会返回：

```json
{
  "success": false,
  "error": "Failed to record visitor information",
  "message": "详细错误信息"
}
```
