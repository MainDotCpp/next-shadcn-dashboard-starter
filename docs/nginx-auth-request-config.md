# Nginx auth_request 完整配置指南

## 问题说明

当使用 Nginx `auth_request` 时，`/auth_check` 是内部请求，不会自动包含原始客户端的所有请求头。这导致：
- `referer` 显示的是代理服务器地址（如 `http://141.164.43.115:34711/`）
- 其他客户端信息也可能丢失

## 解决方案

通过自定义请求头（`X-Original-*`）将原始客户端的所有信息传递给 `/api/detect` 接口。

## 完整配置示例

```nginx
upstream nextjs_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name tasoo.top;

    # 认证检查接口（内部 location）
    location = /auth_check {
        internal;
        
        # 代理到 detect 接口
        proxy_pass http://nextjs_backend/api/detect;
        
        # 不发送请求体
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        
        # ============================================
        # 关键：传递原始客户端的所有请求头
        # ============================================
        
        # 原始请求头（客户端浏览器发送的）
        proxy_set_header X-Original-User-Agent $http_user_agent;
        proxy_set_header X-Original-Referer $http_referer;
        proxy_set_header X-Original-Accept-Language $http_accept_language;
        proxy_set_header X-Original-Accept $http_accept;
        proxy_set_header X-Original-Accept-Encoding $http_accept_encoding;
        proxy_set_header X-Original-Connection $http_connection;
        
        # 原始请求信息
        proxy_set_header X-Original-Host $host;
        proxy_set_header X-Original-Method $request_method;
        proxy_set_header X-Original-Request-Uri $request_uri;
        proxy_set_header X-Original-Uri $request_uri;
        proxy_set_header X-Original-Proto $scheme;
        
        # IP 和地理位置信息
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 地理位置（如果配置了 GeoIP 模块）
        # proxy_set_header X-Original-Country $geoip_country_code;
        # proxy_set_header X-Original-City $geoip_city;
        
        # 超时配置
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }

    # 认证错误处理
    location @autherror {
        return 403 "Access Denied";
    }

    # 主路由（需要认证）
    location / {
        auth_request /auth_check;
        auth_request_set $auth_cookie $upstream_http_set_cookie;
        add_header Set-Cookie $auth_cookie;
        error_page 401 = @autherror;

        proxy_pass http://nextjs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

## 工作原理

1. **原始请求到达 Nginx**：客户端发送请求，包含所有原始请求头
2. **Nginx 内部请求**：Nginx 调用 `/auth_check`，通过 `X-Original-*` 请求头传递原始客户端信息
3. **接口处理**：`/api/detect` 接口优先读取 `X-Original-*` 请求头，如果没有则使用当前请求头
4. **记录信息**：使用原始客户端信息记录到数据库

## 传递的原始信息

| Nginx 变量 | 传递的请求头 | 说明 |
|-----------|-------------|------|
| `$http_user_agent` | `X-Original-User-Agent` | 原始 User-Agent |
| `$http_referer` | `X-Original-Referer` | 原始 Referer（来源页面） |
| `$http_accept_language` | `X-Original-Accept-Language` | 原始语言偏好 |
| `$http_accept` | `X-Original-Accept` | 原始 Accept 头 |
| `$http_accept_encoding` | `X-Original-Accept-Encoding` | 原始编码方式 |
| `$http_connection` | `X-Original-Connection` | 原始连接类型 |
| `$host` | `X-Original-Host` | 原始主机名 |
| `$request_method` | `X-Original-Method` | 原始请求方法 |
| `$request_uri` | `X-Original-Request-Uri` | 原始请求 URI |
| `$scheme` | `X-Original-Proto` | 原始协议（http/https） |

## 验证配置

### 1. 测试 Nginx 配置

```bash
# 检查配置语法
nginx -t

# 重载配置
nginx -s reload
```

### 2. 测试接口

```bash
# 直接访问 detect 接口（应该能看到原始信息）
curl -H "Referer: https://example.com" \
     -H "User-Agent: Mozilla/5.0..." \
     http://localhost/api/detect
```

### 3. 检查数据库记录

查询 `visitor_logs` 表，确认 `referer` 字段显示的是原始客户端的 referer，而不是代理服务器地址。

## 注意事项

1. **请求头大小限制**：确保 Nginx 的 `client_header_buffer_size` 和 `large_client_header_buffers` 足够大
2. **性能影响**：传递大量请求头可能略微影响性能，但通常可以忽略
3. **安全性**：`X-Original-*` 请求头是内部传递的，不会暴露给客户端

## 故障排查

### 问题：referer 仍然是代理地址

**原因**：Nginx 配置中没有正确传递 `X-Original-Referer`

**解决**：确保配置中包含：
```nginx
proxy_set_header X-Original-Referer $http_referer;
```

### 问题：某些请求头丢失

**原因**：Nginx 变量名不正确或请求头不存在

**解决**：
- 检查 Nginx 变量名是否正确（`$http_*` 格式）
- 使用 `$http_*` 变量访问请求头（去掉 `-`，转为 `_`，全小写）

### 问题：接口返回 401

**原因**：可能是认证逻辑问题或请求头传递问题

**解决**：
- 检查 `/api/detect` 接口的日志
- 确认 `checkAuth()` 函数的逻辑
- 验证请求头是否正确传递

