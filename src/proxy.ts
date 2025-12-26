import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
// 排除不需要验证的 API 路由
const isPublicApiRoute = createRouteMatcher(['/api/detect(.*)']);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // 如果是公开的 API 路由，跳过验证
  if (isPublicApiRoute(req)) {
    return;
  }

  // 保护需要验证的路由
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
