'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/home'
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function signInWith(provider: 'kakao' | 'google') {
    setLoading(provider)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${redirectTo}`,
          // 카카오는 추가 스코프 필요
          ...(provider === 'kakao' && { scopes: 'profile_nickname profile_image account_email' }),
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.')
      setLoading(null)
    }
  }

  return (
    <div className="w-full max-w-[340px]">
      {/* Logo */}
      <div className="text-center mb-12">
        <div className="text-[32px] font-extrabold text-green-600 tracking-tight mb-3">
          Food Picker
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          마감이 가까워질수록 가격은 내려갑니다.<br />
          지금 주변 할인을 확인하세요.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Social Buttons */}
      <div className="space-y-2.5">
        <button
          onClick={() => signInWith('kakao')}
          disabled={!!loading}
          className="w-full py-4 px-5 rounded-xl border border-gray-200 flex items-center gap-3
                     text-sm font-semibold text-gray-800 bg-[#FEE500] hover:bg-[#F5D800]
                     transition-all active:scale-[.98] disabled:opacity-60"
        >
          <span className="w-6 h-6 rounded flex items-center justify-center bg-[#3A1D1D] text-[#FEE500] text-xs font-black flex-shrink-0">
            K
          </span>
          {loading === 'kakao' ? '이동 중...' : '카카오로 시작하기'}
        </button>

        <button
          onClick={() => signInWith('google')}
          disabled={!!loading}
          className="w-full py-4 px-5 rounded-xl border border-gray-200 flex items-center gap-3
                     text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50
                     transition-all active:scale-[.98] disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 18 18" className="flex-shrink-0">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          {loading === 'google' ? '이동 중...' : 'Google로 시작하기'}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
        시작하면{' '}
        <a href="/terms" className="underline hover:text-gray-600">이용약관</a>
        {' '}및{' '}
        <a href="/privacy" className="underline hover:text-gray-600">개인정보처리방침</a>
        에<br />동의하는 것으로 간주합니다.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-7">
      <Suspense fallback={<div className="text-sm text-gray-400">불러오는 중...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
