import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = createClient()

  // 서버 컴포넌트에서 데이터 직접 조회
  const { count: storeCount } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const { count: userCount }  = await supabase.from('users').select('*', { count: 'exact', head: true })
  const { data: recentSalesRaw } = await supabase
    .from('reservations')
    .select('reserved_price, created_at, stores(name), items(name)')
    .eq('status', 'picked_up')
    .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)
  const { data: noticesRaw } = await supabase
    .from('notices')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  type SaleRow   = { reserved_price: number; created_at: string; items: any; stores: any }
  type NoticeRow = { id: string; title: string; created_at: string }
  const recentSales = (recentSalesRaw ?? []) as SaleRow[]
  const notices     = (noticesRaw     ?? []) as NoticeRow[]
  const totalRevenue = recentSales.reduce((s, r) => s + r.reserved_price, 0)

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
          { href: '/admin/dashboard', label: '대시보드', active: true },
          { href: '/admin/stores', label: '매장 관리', active: false },
          { href: '/admin/users', label: '사용자 관리', active: false },
        ].map(t => (
          <Link key={t.href} href={t.href}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
              ${t.active ? 'text-white border-green-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: '등록 매장', val: storeCount ?? 0, unit: '개', trend: '+3 이번달', up: true },
            { label: '총 회원', val: userCount ?? 0, unit: '명', trend: '이번주 +12', up: true },
            { label: '이번주 판매', val: (recentSales ?? []).length, unit: '건', trend: '+8%', up: true },
            {
              label: '이번주 매출',
              val: totalRevenue >= 10000 ? (totalRevenue / 10000).toFixed(1) : totalRevenue,
              unit: totalRevenue >= 10000 ? '만원' : '원',
              trend: '+5%',
              up: true
            },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-3.5">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className="text-xl font-extrabold text-gray-900 leading-none">
                {k.val}<span className="text-sm font-semibold text-gray-700 ml-0.5">{k.unit}</span>
              </p>
              <span className={`inline-block mt-1.5 text-xs font-semibold px-1.5 py-0.5 rounded ${k.up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                {k.trend}
              </span>
            </div>
          ))}
        </div>

        {/* 최근 거래 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">최근 판매 내역</p>
          {(recentSales ?? []).slice(0, 5).map((sale, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-xs font-medium text-gray-800">{(sale.items as any)?.name}</p>
                <p className="text-[11px] text-gray-500">{(sale.stores as any)?.name}</p>
              </div>
              <span className="text-xs font-bold text-gray-900">
                {sale.reserved_price.toLocaleString('ko-KR')}원
              </span>
            </div>
          ))}
        </div>

        {/* 공지사항 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">공지사항</p>
            <Link href="/admin/notices/new" className="text-xs font-semibold text-green-600 hover:text-green-700">
              + 새 공지
            </Link>
          </div>
          {(notices ?? []).map(n => (
            <div key={n.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-800 truncate flex-1 mr-3">{n.title}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(n.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
