import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * 인증 미들웨어
 * - 비로그인: /login으로 리다이렉트
 * - 권한 불일치: role별 홈으로 리다이렉트
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // 공개 경로
  const publicPaths = ['/login', '/api/auth/callback', '/terms', '/privacy', '/banned']
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return response
  }

  // 랜딩 페이지
  if (pathname === '/') {
    return response
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('[middleware] getUser error:', userError.message, 'path:', pathname)
  }

  // 비로그인 → 로그인 페이지
  if (!user) {
    console.log('[middleware] no user, redirecting to login from:', pathname)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // JWT 클레임에서 role/banned 읽기
  const userRole = (user.user_metadata?.user_role ?? (user as any).user_role ?? 'user') as string
  const isBanned = (user.user_metadata?.is_banned ?? (user as any).is_banned ?? false) as boolean

  // 밴된 사용자
  if (isBanned && pathname !== '/banned') {
    return NextResponse.redirect(new URL('/banned', request.url))
  }

  // 경로별 권한 체크
  if (pathname.startsWith('/manager') && userRole !== 'manager' && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
