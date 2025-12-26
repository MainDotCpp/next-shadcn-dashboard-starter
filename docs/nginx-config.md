# Nginx 配置优化指南

## 优化的 Nginx 配置

以下是针对 Next.js Dashboard 应用的优化 Nginx 配置：

```nginx
# 上游服务器配置
upstream nextjs_backend {
    # 使用 IP hash 进行负载均衡（可选）
    # ip_hash;
    
    # 后端服务器地址
    server 127.0.0.1:3000;
    # 如果有多个实例，可以添加更多服务器
    # server 127.0.0.1:3001;
    
    # 保持连接
    keepalive 32;
}

# WebSocket 升级配置
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# 认证检查缓存（可选，提高性能）
proxy_cache_path /var/cache/nginx/auth_cache 
    levels=1:2 
    keys_zone=auth_cache:10m 
    max_size=100m 
    inactive=60m 
    use_temp_path=off;

server {
    listen 80;
    server_name tasoo.top;
    
    # 日志配置
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # 客户端最大请求体大小
    client_max_body_size 10M;
    
    # 超时配置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # 认证检查接口（内部 location）
    location = /auth_check {
        internal;
        
        # 代理到 detect 接口（用于认证检查和记录访问信息）
        proxy_pass http://nextjs_backend/api/detect;
        
        # 不发送请求体
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        
        # 传递原始客户端的所有请求头（关键：复刻客户端参数）
        proxy_set_header X-Original-User-Agent $http_user_agent;
        proxy_set_header X-Original-Referer $http_referer;
        proxy_set_header X-Original-Accept-Language $http_accept_language;
        proxy_set_header X-Original-Accept $http_accept;
        proxy_set_header X-Original-Accept-Encoding $http_accept_encoding;
        proxy_set_header X-Original-Connection $http_connection;
        proxy_set_header X-Original-Host $host;
        proxy_set_header X-Original-Method $request_method;
        proxy_set_header X-Original-Request-Uri $request_uri;
        proxy_set_header X-Original-Uri $request_uri;
        proxy_set_header X-Original-Proto $scheme;
        
        # 传递 IP 和地理位置信息
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 传递地理位置（如果可用）
        proxy_set_header X-Original-Country $geoip_country_code;
        
        # 超时配置（认证检查应该快速响应）
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
        
        # 缓存认证结果（可选，根据需求启用）
        # proxy_cache auth_cache;
        # proxy_cache_valid 200 1m;
        # proxy_cache_key "$scheme$request_method$host$request_uri$remote_addr";
        # proxy_cache_use_stderr error timeout invalid_header http_500;
    }

    # 认证错误处理
    location @autherror {
        # 返回 403 Forbidden（更符合语义）
        return 403 "Access Denied";
        
        # 或者返回 JSON 格式的错误
        # add_header Content-Type application/json;
        # return 403 '{"error":"Access Denied"}';
    }

    # 静态文件直接服务（不需要认证）
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://nextjs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 静态文件缓存
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Next.js 内部文件（不需要认证）
    location /_next/ {
        proxy_pass http://nextjs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 缓存配置
        expires 7d;
        add_header Cache-Control "public";
    }

    # API 路由（部分需要认证，部分不需要）
    location /api/ {
        # 排除不需要认证的接口
        location ~ ^/api/detect {
            proxy_pass http://nextjs_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header REMOTE-HOST $remote_addr;
            
            # WebSocket 支持
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }
        
        # 其他 API 接口需要认证
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

    # 主应用路由（需要认证）
    location / {
        # 认证检查
        auth_request /auth_check;
        
        # 处理认证响应中的 Cookie
        auth_request_set $auth_cookie $upstream_http_set_cookie;
        add_header Set-Cookie $auth_cookie;
        
        # 认证失败时跳转到错误处理
        error_page 401 = @autherror;
        
        # 代理到后端
        proxy_pass http://nextjs_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header REMOTE-HOST $remote_addr;
        
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # 缓存控制（根据需求调整）
        proxy_cache_bypass $http_upgrade;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

## 主要优化点

### 1. **使用 detect 接口进行认证检查**
- `/api/detect` 接口既用于认证检查，也用于记录访问信息
- 认证通过后自动记录访问信息到数据库
- 返回 200 表示允许访问，返回 401 表示拒绝访问

### 2. **性能优化**
- **上游服务器配置**：使用 `keepalive` 保持连接
- **认证缓存**：可选启用认证结果缓存（注释部分）
- **静态文件缓存**：直接缓存静态资源
- **超时配置**：为认证检查设置较短的超时时间

### 3. **安全性**
- **错误处理**：使用 403 而不是 500 表示拒绝访问
- **请求头传递**：正确传递真实 IP 和协议信息
- **WebSocket 支持**：正确处理 WebSocket 升级

### 4. **路由分离**
- **静态文件**：不需要认证，直接服务
- **Next.js 内部文件**：不需要认证
- **公开 API**：`/api/detect` 不需要认证（用于 Nginx auth_request）
- **其他路由**：需要认证检查

## 简化版本（如果不需要复杂的路由分离）

如果你想要更简单的配置：

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

    # 认证检查
    location = /auth_check {
        internal;
        proxy_pass http://nextjs_backend/api/detect;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 快速超时
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }

    # 错误处理
    location @autherror {
        return 403 "Access Denied";
    }

    # 主路由
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

## 使用建议

1. **认证逻辑**：在 `/api/detect` 接口的 `checkAuth()` 函数中实现你的认证逻辑
2. **性能监控**：监控认证检查的响应时间
3. **缓存策略**：如果认证结果可以缓存，启用认证缓存
4. **日志记录**：记录认证失败的情况，便于排查问题

## 测试配置

```bash
# 测试 Nginx 配置语法
nginx -t

# 重载配置
nginx -s reload

# 测试 detect 接口
curl http://localhost/api/detect
```

