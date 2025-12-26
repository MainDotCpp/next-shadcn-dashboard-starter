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

  return {
    ip,
    userAgent,
    referer,
    acceptLanguage,
    country,
    isBot,
    isMobile
  };
}

/**
 * GET /api/detect
 * 记录访问者信息到数据库
 */
export async function GET(request: NextRequest) {
  try {
    const visitorInfo = collectVisitorInfo(request);

    // 保存到数据库
    await prisma.visitorLog.create({
      data: {
        ip: visitorInfo.ip,
        user_agent: visitorInfo.userAgent,
        referer: visitorInfo.referer,
        accept_language: visitorInfo.acceptLanguage,
        country: visitorInfo.country,
        is_bot: visitorInfo.isBot,
        is_mobile: visitorInfo.isMobile
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

/**
 * POST /api/detect
 * 记录访问者信息到数据库（支持自定义数据）
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
        is_mobile: visitorInfo.isMobile
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
