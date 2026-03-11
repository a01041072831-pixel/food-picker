import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  console.log('[callback] origin:', origin, 'code exists:', !!code)
  console.log('[callback] SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)

  if (!code) {
    console.error('[callback] no code param')
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToSet.push({ name, value, options })
        },
        remove(name: string, options: CookieOptions) {
          cookiesToSet.push({ name, value: '', options })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[callback] exchangeCodeForSession error:', error.message, error.status)
    return NextResponse.redirect(`${origin}/login?error=auth_failed&msg=${encodeURIComponent(error.message)}`)
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('[callback] getUser result:', user?.id, userError?.message)
  if (!user) {
    console.error('[callback] no user after exchange, userError:', userError?.message)
    return NextResponse.redirect(`${origin}/login?error=auth_failed&msg=${encodeURIComponent('no_user:' + (userError?.message ?? 'unknown'))}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const roleRedirect =
    profile?.role === 'admin'   ? '/admin/dashboard' :
    profile?.role === 'manager' ? '/manager/register' : next

  const response = NextResponse.redirect(`${origin}${roleRedirect}`)

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as any)
  })

  return response
}
