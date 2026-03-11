'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { User } from '@/lib/database.types'

type Filter = 'all' | 'no_show' | 'banned'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const supabase = createClient()

  async function fetchUsers() {
    setLoading(true)
    let query = supabase.from('users').select('*').order('created_at', { ascending: false })
    if (filter === 'banned')  query = query.eq('is_banned', true)
    if (filter === 'no_show') query = query.gte('no_show_count', 1)
    const { data } = await query
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [filter])

  async function toggleBan(user: User) {
    if (user.is_banned) {
      await supabase.from('users').update({ is_banned: false, banned_until: null }).eq('id', user.id)
    } else {
      const bannedUntil = new Date(Date.now() + 30 * 86_400_000).toISOString()
      await supabase.from('users').update({ is_banned: true, banned_until: bannedUntil }).eq('id', user.id)
    }
    fetchUsers()
  }

  async function resetNoShow(userId: string) {
    await supabase.from('users').update({ no_show_count: 0 }).eq('id', userId)
    fetchUsers()
  }

  return (
    <div className="flex flex-col min-h-screen max-w-[480px] mx-auto bg-white">
      {/* Admin Header */}
      <div className="bg-gray-900 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-base">Food Picker</span>
          <span className="px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold">Admin</span>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex bg-gray-800 overflow-x-auto flex-shrink-0">
        {[
          { href: '/admin/dashboard', label: '대시보드',    active: false },
          { href: '/admin/stores',    label: '매장 관리',   active: false },
          { href: '/admin/users',     label: '사용자 관리', active: true  },
        ].map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${t.active ? 'text-white border-green-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 필터 */}
      <div className="px-4 pt-3 pb-2 flex gap-2 flex-shrink-0">
        {([
          { key: 'all',     label: '전체' },
          { key: 'no_show', label: '노쇼 있음' },
          { key: 'banned',  label: '이용 제한' },
        ] as { key: Filter; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {users.length}명
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">해당 사용자가 없습니다</div>
        ) : (
          users.map(user => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-2.5">
              <div className="flex items-start gap-3">
                {/* 아바타 */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-base font-bold text-gray-500">
                        {user.name?.[0] ?? '?'}
                      </div>
                  }
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name ?? '이름 없음'}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      user.role === 'admin'   ? 'bg-purple-50 text-purple-600' :
                      user.role === 'manager' ? 'bg-blue-50 text-blue-500' :
                                               'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role}
                    </span>
                    {user.is_banned && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 flex-shrink-0">
                        이용제한
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {user.no_show_count > 0 && (
                      <button
                        onClick={() => resetNoShow(user.id)}
                        className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                      >
                        노쇼 {user.no_show_count}회 ↺
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })} 가입
                    </span>
                  </div>
                </div>

                {/* 이용제한 버튼 (admin 제외) */}
                {user.role !== 'admin' && (
                  <button
                    onClick={() => toggleBan(user)}
                    className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${user.is_banned ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                  >
                    {user.is_banned ? '제한해제' : '이용제한'}
                  </button>
                )}
              </div>

              {/* 제한 해제 날짜 */}
              {user.banned_until && user.is_banned && (
                <p className="text-xs text-red-400 mt-2 bg-red-50 rounded px-2 py-1">
                  제한 해제: {new Date(user.banned_until).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
