import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRuleByDomain } from '@/features/rules/actions/rule-actions';
import {
  checkRule,
  type VisitorInfo as RuleVisitorInfo
} from '@/features/rules/utils/rule-matcher';

/**
 * 获取客户端真实 IP 地址
 */
function getClientIP(request: NextRequest): string {
  // 检查各种可能的 IP 头（考虑代理和负载均衡器）
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    // x-forwarded-for 可能包含多个 IP，取第一个
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // 如果没有找到，返回 unknown
  return 'unknown';
}

/**
 * 解析 User-Agent 获取浏览器和操作系统信息
 */
function parseUserAgent(userAgent: string | null): {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
} {
  if (!userAgent) {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      deviceType: null
    };
  }

  let browser: string | null = null;
  let browserVersion: string | null = null;
  let os: string | null = null;
  let osVersion: string | null = null;
  let deviceType: string | null = null;

  // 检测浏览器
  const browserPatterns = [
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/i },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/i },
    { name: 'Safari', pattern: /Safari\/([\d.]+)/i },
    { name: 'Edge', pattern: /Edge\/([\d.]+)/i },
    { name: 'Opera', pattern: /Opera\/([\d.]+)/i },
    { name: 'IE', pattern: /MSIE ([\d.]+)/i }
  ];

  for (const { name, pattern } of browserPatterns) {
    const match = userAgent.match(pattern);
    if (match) {
      browser = name;
      browserVersion = match[1];
      break;
    }
  }

  // 检测操作系统
  const osPatterns = [
    { name: 'Windows', pattern: /Windows NT ([\d.]+)/i },
    { name: 'macOS', pattern: /Mac OS X ([\d_]+)/i },
    { name: 'Linux', pattern: /Linux/i },
    { name: 'Android', pattern: /Android ([\d.]+)/i },
    { name: 'iOS', pattern: /OS ([\d_]+)/i }
  ];

  for (const { name, pattern } of osPatterns) {
    const match = userAgent.match(pattern);
    if (match) {
      os = name;
      osVersion = match[1]?.replace(/_/g, '.') || null;
      break;
    }
  }

  // 检测设备类型
  if (
    /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)
  ) {
    if (/tablet|ipad/i.test(userAgent)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  } else {
    deviceType = 'desktop';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType
  };
}

/**
 * 收集访问者信息
 * 优先从 Nginx 传递的原始请求头获取信息（X-Original-*），如果没有则使用当前请求头
 */
function collectVisitorInfo(request: NextRequest): {
  ip: string;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  country: string | null;
  isBot: boolean;
  isMobile: boolean;
  requestMethod: string | null;
  requestPath: string | null;
  requestProtocol: string | null;
  host: string | null;
  accept: string | null;
  acceptEncoding: string | null;
  connection: string | null;
  forwardedFor: string | null;
  deviceType: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
} {
  // 优先从 Nginx 传递的原始请求头获取（X-Original-*），如果没有则使用当前请求头
  const getOriginalHeader = (headerName: string): string | null => {
    return (
      request.headers.get(`x-original-${headerName.toLowerCase()}`) ||
      request.headers.get(headerName)
    );
  };

  const ip = getClientIP(request);
  const userAgent = getOriginalHeader('user-agent');
  const referer = getOriginalHeader('referer');
  const acceptLanguage = getOriginalHeader('accept-language');
  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-original-country') ||
    null;

  // 检测是否是机器人
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /postman/i,
    /insomnia/i,
    /httpie/i
  ];
  const isBot = userAgent
    ? botPatterns.some((pattern) => pattern.test(userAgent))
    : false;

  // 检测是否是移动设备
  const mobilePatterns = [
    /mobile/i,
    /android/i,
    /iphone/i,
    /ipad/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i
  ];
  const isMobile = userAgent
    ? mobilePatterns.some((pattern) => pattern.test(userAgent))
    : false;

  // 解析 User-Agent
  const uaInfo = parseUserAgent(userAgent);

  // 获取请求信息（优先从原始请求头获取）
  const url = new URL(request.url);
  const forwardedFor = request.headers.get('x-forwarded-for');

  // 获取原始请求路径（如果 Nginx 传递了）
  const originalRequestUri =
    request.headers.get('x-original-request-uri') ||
    request.headers.get('x-original-uri') ||
    null;
  const requestPath = originalRequestUri || url.pathname + url.search;

  // 获取原始请求方法
  const originalMethod =
    request.headers.get('x-original-method') || request.method;

  // 获取原始协议
  const originalProtocol =
    request.headers.get('x-original-proto') ||
    request.headers.get('x-forwarded-proto') ||
    url.protocol.replace(':', '');

  // 获取原始主机
  const originalHost =
    request.headers.get('x-original-host') || request.headers.get('host');

  return {
    ip,
    userAgent,
    referer,
    acceptLanguage,
    country,
    isBot,
    isMobile,
    requestMethod: originalMethod,
    requestPath,
    requestProtocol: originalProtocol,
    host: originalHost,
    accept: getOriginalHeader('accept'),
    acceptEncoding: getOriginalHeader('accept-encoding'),
    connection: getOriginalHeader('connection'),
    forwardedFor,
    deviceType: uaInfo.deviceType,
    browser: uaInfo.browser,
    browserVersion: uaInfo.browserVersion,
    os: uaInfo.os,
    osVersion: uaInfo.osVersion
  };
}

/**
 * 检测 IP 类型（简化版本）
 * 实际应用中可以使用 MaxMind GeoIP2、ipapi.co 等第三方服务
 */
function detectIPType(ip: string): string | null {
  if (!ip || ip === 'unknown') {
    return null;
  }

  // 检查是否为私有 IP
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip === '127.0.0.1' ||
    ip === '::1'
  ) {
    return 'RESIDENTIAL';
  }

  // 这里可以集成第三方 API 来检测 IP 类型
  // 例如：使用 ipapi.co、MaxMind GeoIP2 等
  // 目前返回 null，表示未知类型
  // 实际应用中应该调用 API 获取 ISP、IDC 等信息

  return null;
}

/**
 * 规范化域名（去除端口号）
 */
function normalizeDomain(host: string | null): string | null {
  if (!host) {
    return null;
  }
  // 去除端口号（例如：example.com:443 -> example.com）
  return host.split(':')[0].toLowerCase().trim();
}

/**
 * 认证检查结果
 */
interface AuthCheckResult {
  allowed: boolean;
  ruleId?: number;
  ruleName?: string;
}

/**
 * 认证检查逻辑
 * 根据请求的域名查找对应的网站和规则，然后应用规则检查
 * 返回检查结果（包含是否允许访问、应用的规则信息）
 */
async function checkAuth(
  visitorInfo: ReturnType<typeof collectVisitorInfo>,
  request: NextRequest
): Promise<AuthCheckResult> {
  try {
    // 根据 host 查找对应的规则
    const host = visitorInfo.host;
    if (!host) {
      // 如果没有 host，默认允许访问
      console.log('[Detect] No host found, allowing access');
      return { allowed: true };
    }

    // 规范化域名（去除端口号）
    const normalizedDomain = normalizeDomain(host);
    if (!normalizedDomain) {
      console.log('[Detect] Invalid host format, allowing access');
      return { allowed: true };
    }

    console.log(
      `[Detect] Checking rules for domain: ${normalizedDomain} (original: ${host})`
    );

    // 从数据库获取该域名对应的规则
    const rule = await getRuleByDomain(normalizedDomain);

    // 如果没有规则，默认允许访问
    if (!rule || !rule.steps || rule.steps.length === 0) {
      console.log(
        `[Detect] No rule found for domain: ${normalizedDomain}, allowing access`
      );
      return { allowed: true };
    }

    console.log(
      `[Detect] Found rule: ${rule.name} (${rule.steps.length} steps)`
    );

    // 解析查询参数
    const searchParams: Record<string, string> = {};
    try {
      const url = new URL(request.url);
      url.searchParams.forEach((value, key) => {
        searchParams[key] = value;
      });
    } catch (urlError) {
      console.warn('[Detect] Failed to parse URL for search params:', urlError);
    }

    // 检测 IP 类型（简化版本，实际应用中可以使用第三方 API）
    const ipType = detectIPType(visitorInfo.ip);

    // 转换为规则匹配器需要的格式
    const ruleVisitorInfo: RuleVisitorInfo = {
      ip: visitorInfo.ip,
      userAgent: visitorInfo.userAgent,
      referer: visitorInfo.referer,
      country: visitorInfo.country,
      acceptLanguage: visitorInfo.acceptLanguage,
      isBot: visitorInfo.isBot,
      requestPath: visitorInfo.requestPath,
      searchParams,
      ipType
    };

    console.log(
      `[Detect] Visitor info: IP=${visitorInfo.ip}, Country=${visitorInfo.country}, Bot=${visitorInfo.isBot}, Path=${visitorInfo.requestPath}`
    );

    // 应用规则检查（按步骤顺序执行）
    const allowed = checkRule(ruleVisitorInfo, {
      id: rule.id,
      name: rule.name,
      steps: rule.steps.map((s) => ({
        id: s.id,
        step_order: s.step_order,
        type: s.type as any,
        name: s.name,
        config: s.config as any,
        action: s.action as any,
        enabled: s.enabled
      }))
    });

    console.log(
      `[Detect] Rule check result: ${allowed ? 'ALLOWED' : 'DENIED'} for domain: ${normalizedDomain}`
    );
    return {
      allowed,
      ruleId: rule.id,
      ruleName: rule.name
    };
  } catch (error) {
    console.error('[Detect] Error checking rules:', error);
    // 发生错误时，默认允许访问（避免影响正常用户）
    return { allowed: true };
  }
}

/**
 * GET /api/detect
 * 记录访问者信息到数据库，并作为 Nginx auth_request 认证检查接口
 *
 * 返回状态码：
 * - 200: 允许访问（记录成功）
 * - 401: 拒绝访问（认证失败）
 * - 500: 服务器错误
 */
export async function GET(request: NextRequest) {
  try {
    const visitorInfo = collectVisitorInfo(request);

    // 先进行认证检查
    const authResult = await checkAuth(visitorInfo, request);

    // 记录检测结果到数据库（无论是否允许访问都要记录）
    try {
      // 获取 Cloudflare Ray ID（如果存在）
      const cfRay = request.headers.get('cf-ray');

      // 去重检查：10秒内相同 IP + 路径的记录
      const deduplicationWindow = 10; // 10秒去重窗口
      const recentTime = new Date(Date.now() - deduplicationWindow * 1000);

      // 构建查询条件：检查相同 IP 和路径的记录
      const whereCondition: any = {
        ip: visitorInfo.ip,
        request_path: visitorInfo.requestPath,
        created_at: {
          gte: recentTime
        }
      };

      // 检查是否有重复记录
      const existingRecord = await prisma.visitorLog.findFirst({
        where: whereCondition,
        orderBy: {
          created_at: 'desc'
        }
      });

      // 如果有重复记录，进一步检查是否是 Cloudflare 的重复请求
      if (existingRecord) {
        // 如果有 Cloudflare Ray ID，检查是否是相同的 Ray ID
        if (cfRay) {
          const currentRayId = cfRay.split('-')[0]; // 提取 Ray ID 前缀
          const existingRayId = existingRecord.forwarded_for
            ?.split('|CF-Ray:')[1]
            ?.split('-')[0];

          // 如果 Ray ID 相同，说明是 Cloudflare 的重复请求，跳过记录
          if (existingRayId === currentRayId) {
            console.log(
              `Skipping duplicate Cloudflare request: CF-Ray=${cfRay}, IP=${visitorInfo.ip}, Path=${visitorInfo.requestPath}`
            );
            // 但仍然需要返回正确的状态码
            if (!authResult.allowed) {
              return new NextResponse(null, { status: 401 });
            }
            return new NextResponse(null, { status: 200 });
          }
        } else {
          // 没有 Ray ID，但 10 秒内有相同 IP + 路径的记录，可能是重复请求
          console.log(
            `Skipping duplicate request: IP=${visitorInfo.ip}, Path=${visitorInfo.requestPath}`
          );
          // 但仍然需要返回正确的状态码
          if (!authResult.allowed) {
            return new NextResponse(null, { status: 401 });
          }
          return new NextResponse(null, { status: 200 });
        }
      }

      // 没有重复，记录访问信息到数据库（包含检测结果）
      await prisma.visitorLog.create({
        data: {
          ip: visitorInfo.ip,
          user_agent: visitorInfo.userAgent,
          referer: visitorInfo.referer,
          accept_language: visitorInfo.acceptLanguage,
          country: visitorInfo.country,
          is_bot: visitorInfo.isBot,
          is_mobile: visitorInfo.isMobile,
          request_method: visitorInfo.requestMethod,
          request_path: visitorInfo.requestPath,
          request_protocol: visitorInfo.requestProtocol,
          host: visitorInfo.host,
          accept: visitorInfo.accept,
          accept_encoding: visitorInfo.acceptEncoding,
          connection: visitorInfo.connection,
          // 如果有 Cloudflare Ray ID，将其添加到 forwarded_for 字段用于去重检查
          forwarded_for: cfRay
            ? `${visitorInfo.forwardedFor || ''}|CF-Ray:${cfRay.split('-')[0]}`.trim()
            : visitorInfo.forwardedFor,
          device_type: visitorInfo.deviceType,
          browser: visitorInfo.browser,
          browser_version: visitorInfo.browserVersion,
          os: visitorInfo.os,
          os_version: visitorInfo.osVersion,
          // 记录检测结果
          access_allowed: authResult.allowed,
          rule_id: authResult.ruleId || null,
          rule_name: authResult.ruleName || null
        }
      });
    } catch (dbError) {
      // 数据库错误不影响认证结果，只记录日志
      console.error('Error recording visitor to database:', dbError);
    }

    if (!authResult.allowed) {
      // 认证失败，返回 401（Nginx auth_request 会拒绝访问）
      return new NextResponse(null, { status: 401 });
    }

    // 返回 200 表示允许访问（Nginx auth_request 会允许访问）
    // 返回空内容
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error in detect endpoint:', error);
    // 发生错误时，默认拒绝访问（安全起见）
    return new NextResponse(null, { status: 401 });
  }
}

/**
 * POST /api/detect
 * 记录访问者信息到数据库（支持自定义数据）
 * 注意：POST 请求主要用于记录，不用于 Nginx auth_request
 */
export async function POST(request: NextRequest) {
  try {
    const visitorInfo = collectVisitorInfo(request);

    // 尝试从请求体获取额外信息（可选）
    let additionalData: {
      metadata?: Record<string, any>;
    } = {};

    try {
      const body = await request.json();
      additionalData = body;
    } catch {
      // 如果没有请求体，忽略
    }

    // 保存到数据库（同样应用去重逻辑）
    const cfRay = request.headers.get('cf-ray');
    const deduplicationWindow = 10; // 10秒去重窗口
    const recentTime = new Date(Date.now() - deduplicationWindow * 1000);

    // 检查是否有重复记录
    const existingRecord = await prisma.visitorLog.findFirst({
      where: {
        ip: visitorInfo.ip,
        request_path: visitorInfo.requestPath,
        created_at: {
          gte: recentTime
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // 如果有重复记录，跳过
    if (existingRecord) {
      if (cfRay) {
        const currentRayId = cfRay.split('-')[0];
        const existingRayId = existingRecord.forwarded_for
          ?.split('|CF-Ray:')[1]
          ?.split('-')[0];
        if (existingRayId === currentRayId) {
          // 返回空内容
          return new NextResponse(null, { status: 200 });
        }
      } else {
        // 返回空内容
        return new NextResponse(null, { status: 200 });
      }
    }

    // 保存到数据库
    await prisma.visitorLog.create({
      data: {
        ip: visitorInfo.ip,
        user_agent: visitorInfo.userAgent,
        referer: visitorInfo.referer,
        accept_language: visitorInfo.acceptLanguage,
        country: visitorInfo.country,
        is_bot: visitorInfo.isBot,
        is_mobile: visitorInfo.isMobile,
        request_method: visitorInfo.requestMethod,
        request_path: visitorInfo.requestPath,
        request_protocol: visitorInfo.requestProtocol,
        host: visitorInfo.host,
        accept: visitorInfo.accept,
        accept_encoding: visitorInfo.acceptEncoding,
        connection: visitorInfo.connection,
        forwarded_for: cfRay
          ? `${visitorInfo.forwardedFor || ''}|CF-Ray:${cfRay.split('-')[0]}`.trim()
          : visitorInfo.forwardedFor,
        device_type: visitorInfo.deviceType,
        browser: visitorInfo.browser,
        browser_version: visitorInfo.browserVersion,
        os: visitorInfo.os,
        os_version: visitorInfo.osVersion
      }
    });

    // 返回空内容
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error recording visitor:', error);
    // 返回空内容
    return new NextResponse(null, { status: 500 });
  }
}
