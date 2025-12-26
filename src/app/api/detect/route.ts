import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer');
  const acceptLanguage = request.headers.get('accept-language');
  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
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

  // 获取请求信息
  const url = new URL(request.url);
  const forwardedFor = request.headers.get('x-forwarded-for');

  return {
    ip,
    userAgent,
    referer,
    acceptLanguage,
    country,
    isBot,
    isMobile,
    requestMethod: request.method,
    requestPath: url.pathname + url.search,
    requestProtocol: url.protocol.replace(':', ''),
    host: request.headers.get('host'),
    accept: request.headers.get('accept'),
    acceptEncoding: request.headers.get('accept-encoding'),
    connection: request.headers.get('connection'),
    forwardedFor,
    deviceType: uaInfo.deviceType,
    browser: uaInfo.browser,
    browserVersion: uaInfo.browserVersion,
    os: uaInfo.os,
    osVersion: uaInfo.osVersion
  };
}

/**
 * 认证检查逻辑
 * 返回 true 表示允许访问，返回 false 表示拒绝访问
 */
function checkAuth(
  visitorInfo: ReturnType<typeof collectVisitorInfo>
): boolean {
  // 示例：检查是否是机器人（可以根据需求修改）
  // if (visitorInfo.isBot) {
  //   return false;
  // }

  // 示例：IP 白名单检查（可以从数据库读取）
  // const allowedIPs = ['1.2.3.4', '5.6.7.8'];
  // if (!allowedIPs.includes(visitorInfo.ip)) {
  //   return false;
  // }

  // 默认允许访问
  return true;
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
    const allowed = checkAuth(visitorInfo);

    if (!allowed) {
      // 认证失败，返回 401（Nginx auth_request 会拒绝访问）
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // 认证通过，记录访问信息到数据库
    try {
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
          forwarded_for: visitorInfo.forwardedFor,
          device_type: visitorInfo.deviceType,
          browser: visitorInfo.browser,
          browser_version: visitorInfo.browserVersion,
          os: visitorInfo.os,
          os_version: visitorInfo.osVersion
        }
      });
    } catch (dbError) {
      // 数据库错误不影响认证结果，只记录日志
      console.error('Error recording visitor to database:', dbError);
    }

    // 返回 200 表示允许访问（Nginx auth_request 会允许访问）
    return NextResponse.json(
      {
        success: true,
        message: 'Visitor information recorded'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in detect endpoint:', error);
    // 发生错误时，默认拒绝访问（安全起见）
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 401 }
    );
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
        forwarded_for: visitorInfo.forwardedFor,
        device_type: visitorInfo.deviceType,
        browser: visitorInfo.browser,
        browser_version: visitorInfo.browserVersion,
        os: visitorInfo.os,
        os_version: visitorInfo.osVersion
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Visitor information recorded'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error recording visitor:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record visitor information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
