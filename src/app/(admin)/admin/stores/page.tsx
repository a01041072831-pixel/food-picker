'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Store } from '@/lib/database.types'

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState('')
  const supabase = createClient()

  async function fetchStores() {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })
    setStores(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchStores() }, [])

  async function toggleActive(store: Store) {
    await supabase.from('stores').update({ is_active: !store.is_active }).eq('id', store.id)
    fetchStores()
  }

  async function saveCommission(id: string) {
    const rate = parseFloat(editRate)
    if (isNaN(rate) || rate < 1 || rate > 5) return
    await supabase.from('stores').update({ commission_rate: rate }).eq('id', id)
    setEditingId(null)
    fetchStores()
  }

  const activeCount   = stores.filter(s => s.is_active).length
  const inactiveCount = stores.length - activeCount

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
          { href: '/admin/dashboard', label: '대시보드',   active: false },
          { href: '/admin/stores',    label: '매장 관리',  active: true  },
          { href: '/admin/users',     label: '사용자 관리', active: false },
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

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '전체',   val: stores.length,  color: 'text-gray-900' },
            { label: '운영중', val: activeCount,    color: 'text-green-600' },
            { label: '비활성', val: inactiveCount,  color: 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={`text-xl font-extrabold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">불러오는 중...</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">등록된 매장이 없습니다</div>
        ) : (
          stores.map(store => (
            <div key={store.id} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
              {/* 매장 정보 */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{store.name}</p>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${store.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {store.is_active ? '운영중' : '비활성'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{store.address}</p>
                  {store.phone && <p className="text-xs text-gray-400">{store.phone}</p>}
                  {store.category && <p className="text-xs text-gray-400">카테고리: {store.category}</p>}
                </div>
                <button
                  onClick={() => toggleActive(store)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${store.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {store.is_active ? '비활성화' : '활성화'}
                </button>
              </div>

              {/* 수수료율 */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 flex-shrink-0">수수료율</span>
                {editingId === store.id ? (
                  <>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="5"
                      value={editRate}
                      onChange={e => setEditRate(e.target.value)}
                      className="flex-1 text-xs font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-green-500 w-16"
                    />
                    <span className="text-xs text-gray-500">%</span>
                    <button onClick={() => saveCommission(store.id)} className="text-xs font-bold text-green-600 hover:text-green-700">저장</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-xs font-bold text-gray-900">{store.commission_rate}%</span>
                    <button
                      onClick={() => { setEditingId(store.id); setEditRate(String(store.commission_rate)) }}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                    >
                      수정
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
