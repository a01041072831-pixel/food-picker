import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ManagerDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: store } = user
    ? await supabase.from('stores').select('*').eq('manager_id', user.id).eq('is_active', true).single()
    : { data: null }

  if (!store) {
    return (
      <div className="flex flex-col h-screen max-w-[480px] mx-auto bg-white items-center justify-center gap-2">
        <p className="text-sm text-gray-600 font-semibold">등록된 매장이 없습니다</p>
        <p className="text-xs text-gray-400">관리자에게 매장 등록을 문의하세요</p>
      </div>
    )
  }

  const weekAgo  = new Date(Date.now() - 7  * 86_400_000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    { data: weekSales },
    { data: monthSales },
    { count: activeItems },
    { data: recentReservations },
  ] = await Promise.all([
    supabase.from('reservations')
      .select('reserved_price, created_at')
      .eq('store_id', store.id)
      .eq('status', 'picked_up')
      .gte('created_at', weekAgo),
    supabase.from('reservations')
      .select('reserved_price')
      .eq('store_id', store.id)
      .eq('status', 'picked_up')
      .gte('created_at', monthAgo),
    supabase.from('items')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('status', 'active'),
    supabase.from('reservations')
      .select('reserved_price, created_at, status, items(name)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const weekRevenue  = (weekSales  ?? []).reduce((s, r) => s + r.reserved_price, 0)
  const monthRevenue = (monthSales ?? []).reduce((s, r) => s + r.reserved_price, 0)

  // 최근 7일 요일별 매출
  const dayRevenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
    const dayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
    const revenue  = (weekSales ?? [])
      .filter(s => s.created_at >= dayStart && s.created_at < dayEnd)
      .reduce((sum, s) => sum + s.reserved_price, 0)
    return { day: d.toLocaleDateString('ko-KR', { weekday: 'short' }), revenue }
  })
  const maxRevenue = Math.max(...dayRevenue.map(d => d.revenue), 1)

  return (
    <div className="flex flex-col min-h-screen max-w-[480px] mx-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">대시보드</h1>
        <p className="text-xs text-gray-500 mt-0.5">{store.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: '이번주 판매',   val: (weekSales ?? []).length,                                                          unit: '건',  color: 'text-gray-900' },
            { label: '이번주 매출',   val: weekRevenue.toLocaleString('ko-KR'),                                                unit: '원',  color: 'text-green-600' },
            { label: '이번달 매출',   val: monthRevenue >= 10000 ? (monthRevenue / 10000).toFixed(1) + '만' : monthRevenue.toLocaleString('ko-KR'), unit: '원', color: 'text-gray-900' },
            { label: '판매 중인 물품', val: activeItems ?? 0,                                                                  unit: '개',  color: 'text-gray-900' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-xl font-extrabold leading-none ${k.color}`}>
                {k.val}<span className="text-sm font-semibold text-gray-600 ml-0.5">{k.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* 주간 차트 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">최근 7일 매출</p>
          <div className="flex items-end gap-1.5 h-20 mb-2">
            {dayRevenue.map((d, i) => (
              <div key={i} className="flex-1">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max(4, (d.revenue / maxRevenue) * 80)}px`,
                    background: i === 6 ? '#16a34a' : '#dcfce7',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {dayRevenue.map((d, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-gray-400">{d.day}</div>
            ))}
          </div>
        </div>

        {/* 최근 예약 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">최근 예약</p>
          {(recentReservations ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">예약 내역이 없습니다</p>
          ) : (
            (recentReservations ?? []).map((r, i) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                reserved:  { label: '대기중',   color: 'text-green-600 bg-green-50' },
                picked_up: { label: '픽업완료', color: 'text-gray-600 bg-gray-100' },
                cancelled: { label: '취소',     color: 'text-gray-400 bg-gray-100' },
                no_show:   { label: '노쇼',     color: 'text-red-500 bg-red-50' },
              }
              const s = statusMap[r.status] ?? statusMap.cancelled
              return (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{(r.items as any)?.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(r.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{r.reserved_price.toLocaleString('ko-KR')}원</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <ManagerBottomNav active="dashboard" />
    </div>
  )
}

function ManagerBottomNav({ active }: { active: string }) {
  const items = [
    { key: 'register',  href: '/manager/register',  label: '물품 등록' },
    { key: 'inventory', href: '/manager/inventory', label: '재고 관리' },
    { key: 'dashboard', href: '/manager/dashboard', label: '대시보드' },
  ]
  return (
    <div className="flex bg-white border-t border-gray-100 flex-shrink-0">
      {items.map(({ key, href, label }) => (
        <Link
          key={key}
          href={href}
          className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${active === key ? 'text-green-600 border-green-600' : 'text-gray-400 border-transparent'}`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
