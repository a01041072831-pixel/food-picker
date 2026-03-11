'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/lib/database.types'
import { formatPrice } from '@/lib/pricing'

export default function ManagerInventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchItems = useCallback(async (sid: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('store_id', sid)
      .order('deadline_at', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('manager_id', user.id)
        .eq('is_active', true)
        .single()
      if (!store) { setLoading(false); return }
      setStoreId(store.id)
      fetchItems(store.id)
    }
    init()
  }, [fetchItems])

  // Realtime 재고 구독
  useEffect(() => {
    if (!storeId) return
    const channel = supabase
      .channel('manager-inventory')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `store_id=eq.${storeId}`,
      }, () => fetchItems(storeId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [storeId, fetchItems])

  async function closeItem(id: string) {
    await supabase.from('items').update({ status: 'closed' }).eq('id', id)
    fetchItems(storeId!)
  }

  const active   = items.filter(i => i.status === 'active')
  const inactive = items.filter(i => i.status !== 'active')

  return (
    <div className="flex flex-col h-screen max-w-[480px] mx-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">재고 관리</h1>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 blink" />
          <span className="text-xs text-gray-500">실시간</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm">등록된 물품이 없습니다</p>
            <a href="/manager/register" className="mt-4 inline-block text-sm font-semibold text-green-600">
              물품 등록하기
            </a>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  판매 중 ({active.length})
                </p>
                {active.map(item => (
                  <InventoryCard key={item.id} item={item} onClose={() => closeItem(item.id)} />
                ))}
              </div>
            )}
            {inactive.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  종료됨 ({inactive.length})
                </p>
                {inactive.map(item => (
                  <InventoryCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ManagerBottomNav active="inventory" />
    </div>
  )
}

// ── 재고 카드 ─────────────────────────────────────────────────────────────
function InventoryCard({ item, onClose }: { item: Item; onClose?: () => void }) {
  const discountRate = Math.round(((item.start_price - item.current_price) / item.start_price) * 100)
  const deadline = new Date(item.deadline_at)
  const isExpiringSoon = deadline.getTime() - Date.now() < 3_600_000

  const statusConfig: Record<string, { label: string; color: string }> = {
    active:   { label: '판매중',   color: 'bg-green-50 text-green-700' },
    sold_out: { label: '매진',     color: 'bg-gray-100 text-gray-500' },
    closed:   { label: '마감',     color: 'bg-gray-100 text-gray-500' },
    expired:  { label: '기간만료', color: 'bg-red-50 text-red-500' },
  }
  const s = statusConfig[item.status] ?? statusConfig.closed

  return (
    <div className={`rounded-2xl border p-4 mb-2.5 ${item.status === 'active' ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {item.image_url
            ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🍱</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.color}`}>
              {s.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">재고 {item.quantity}개</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-gray-400 line-through">{formatPrice(item.start_price)}</span>
            <span className="text-sm font-bold text-green-600">{formatPrice(item.current_price)}</span>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
              -{discountRate}%
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className={`text-xs ${isExpiringSoon ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
            {deadline.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 마감
          </span>
        </div>
        {onClose && item.status === 'active' && (
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors"
          >
            마감처리
          </button>
        )}
      </div>
    </div>
  )
}

// ── 매니저 하단 내비게이션 ────────────────────────────────────────────────
function ManagerBottomNav({ active }: { active: string }) {
  const items = [
    { key: 'register',  href: '/manager/register',  label: '물품 등록' },
    { key: 'inventory', href: '/manager/inventory', label: '재고 관리' },
    { key: 'dashboard', href: '/manager/dashboard', label: '대시보드' },
  ]
  return (
    <div className="flex bg-white border-t border-gray-100 flex-shrink-0">
      {items.map(({ key, href, label }) => (
        <a
          key={key}
          href={href}
          className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${active === key ? 'text-green-600 border-green-600' : 'text-gray-400 border-transparent'}`}
        >
          {label}
        </a>
      ))}
    </div>
  )
}
