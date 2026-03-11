'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User, Notice } from '@/lib/database.types'

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ total: 0, pickedUp: 0, noShow: 0 })
  const [notices, setNotices] = useState<Notice[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const [{ data: profile }, { data: reservations }, { data: noticeList }] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('reservations').select('status').eq('user_id', authUser.id),
        supabase.from('notices')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setUser(profile)
      if (reservations) {
        setStats({
          total:    reservations.length,
          pickedUp: reservations.filter(r => r.status === 'picked_up').length,
          noShow:   reservations.filter(r => r.status === 'no_show').length,
        })
      }
      setNotices(noticeList ?? [])
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex flex-col h-screen max-w-[480px] mx-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">마이페이지</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* 프로필 */}
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 overflow-hidden flex-shrink-0">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-green-600">
                  {user?.name?.[0] ?? '?'}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{user?.name ?? '사용자'}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            {user?.is_banned && (
              <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                이용 제한
              </span>
            )}
          </div>
        </div>

        {/* 통계 */}
        <div className="mx-4 mb-5 bg-gray-50 rounded-2xl p-4 grid grid-cols-3 gap-3">
          {[
            { label: '총 예약',   val: stats.total },
            { label: '픽업 완료', val: stats.pickedUp },
            { label: '노쇼',      val: stats.noShow },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-extrabold text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 노쇼 경고 */}
        {(user?.no_show_count ?? 0) > 0 && (
          <div className="mx-4 mb-5 p-3 rounded-xl bg-orange-50 border border-orange-100">
            <p className="text-xs font-semibold text-orange-700">
              누적 노쇼 {user?.no_show_count}회 · 3회 이상 시 이용이 제한될 수 있습니다.
            </p>
          </div>
        )}

        {/* 공지사항 */}
        <div className="px-4 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">공지사항</p>
          {notices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">공지사항이 없습니다</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100">
              {notices.map((n, i) => (
                <div
                  key={n.id}
                  className={`px-4 py-3.5 flex items-start gap-2.5 ${i < notices.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  {n.is_pinned && <span className="mt-0.5 flex-shrink-0 text-xs font-bold text-green-600">📌</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 설정 메뉴 */}
        <div className="px-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">설정</p>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
            {[
              { label: '이용약관',         href: '/terms' },
              { label: '개인정보처리방침', href: '/privacy' },
            ].map(m => (
              <a
                key={m.label}
                href={m.href}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-800">{m.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </a>
            ))}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm text-red-500 font-medium">로그아웃</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="mypage" />
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { key: 'home',        href: '/home',        label: '홈',  icon: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
    { key: 'reservation', href: '/reservation', label: '예약', icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
    { key: 'mypage',      href: '/mypage',      label: '마이', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  ]
  return (
    <div className="flex bg-white border-t border-gray-100 pb-5 flex-shrink-0">
      {items.map(({ key, href, label, icon }) => (
        <a key={key} href={href} className={`flex-1 flex flex-col items-center gap-1 pt-2 ${active === key ? 'text-green-600' : 'text-gray-400'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={active === key ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
          <span className="text-[10px] font-medium">{label}</span>
        </a>
      ))}
    </div>
  )
}
