'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReservationWithDetails } from '@/lib/database.types'
import { formatPrice } from '@/lib/pricing'

export default function ReservationPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchReservations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('reservations')
      .select('*, items(name, image_url), stores(name, address)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setReservations((data as ReservationWithDetails[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  async function cancelReservation(id: string) {
    const res = await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId: id, action: 'cancel' }),
    })
    if (res.ok) fetchReservations()
  }

  const active = reservations.filter(r => r.status === 'reserved')
  const past = reservations.filter(r => r.status !== 'reserved')

  return (
    <div className="flex flex-col h-screen max-w-[480px] mx-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">예약 내역</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">불러오는 중...</div>
        ) : (
          <>
            {/* 활성 예약 */}
            {active.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">픽업 대기</p>
                {active.map(r => (
                  <ActiveReservationCard key={r.id} reservation={r} onCancel={() => cancelReservation(r.id)} />
                ))}
              </div>
            )}

            {/* 이용 내역 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">이용 내역</p>
              {past.length === 0 && active.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🧾</div>
                  <p className="text-sm">예약 내역이 없습니다</p>
                  <a href="/home" className="mt-4 inline-block text-sm font-semibold text-green-600">
                    주변 매장 탐색하기
                  </a>
                </div>
              ) : (
                past.map(r => <PastReservationCard key={r.id} reservation={r} />)
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav active="reservation" />
    </div>
  )
}

// ── 활성 예약 카드 (30분 카운트다운) ──────────────────────────────────────
function ActiveReservationCard({
  reservation: r,
  onCancel,
}: {
  reservation: ReservationWithDetails
  onCancel: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(r.pickup_deadline_at).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(r.pickup_deadline_at).getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [r.pickup_deadline_at])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const expired = secondsLeft === 0
  const urgent = secondsLeft < 300

  return (
    <div className={`rounded-2xl border-2 p-4 mb-3 ${expired ? 'border-red-200 bg-red-50' : urgent ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-white border border-gray-100 flex-shrink-0 overflow-hidden">
          {(r.items as any)?.image_url
            ? <img src={(r.items as any).image_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🍱</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{(r.items as any)?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{(r.stores as any)?.name}</p>
          <p className="text-base font-extrabold text-green-700 mt-1">{formatPrice(r.reserved_price)}</p>
        </div>
      </div>

      {/* 카운트다운 */}
      <div className={`mt-3 rounded-xl p-3 text-center ${expired ? 'bg-red-100' : urgent ? 'bg-orange-100' : 'bg-white'}`}>
        {expired ? (
          <p className="text-sm font-bold text-red-600">픽업 시간 초과</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-1">픽업까지 남은 시간</p>
            <p className={`text-2xl font-black tabular-nums ${urgent ? 'text-orange-600' : 'text-green-600'}`}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold text-center truncate px-2">
          {(r.stores as any)?.address ?? '매장 주소'}
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  )
}

// ── 과거 예약 카드 ────────────────────────────────────────────────────────
function PastReservationCard({ reservation: r }: { reservation: ReservationWithDetails }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    picked_up: { label: '픽업 완료', color: 'bg-green-50 text-green-700' },
    cancelled:  { label: '취소됨',    color: 'bg-gray-100 text-gray-500' },
    no_show:    { label: '노쇼',      color: 'bg-red-50 text-red-500' },
  }
  const s = statusMap[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-500' }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
        {(r.items as any)?.image_url
          ? <img src={(r.items as any).image_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-xl">🍱</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{(r.items as any)?.name}</p>
        <p className="text-xs text-gray-500 truncate">{(r.stores as any)?.name}</p>
        <p className="text-xs text-gray-400">
          {new Date(r.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{formatPrice(r.reserved_price)}</p>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
      </div>
    </div>
  )
}

// ── 하단 내비게이션 ───────────────────────────────────────────────────────
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
