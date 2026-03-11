'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NearbyStore, Item } from '@/lib/database.types'
import { formatPrice } from '@/lib/pricing'

// Kakao Map SDK 타입 (window.kakao)
declare global {
  interface Window { kakao: any; __selectStore: (storeId: string) => void }
}

export default function UserHomePage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [stores, setStores] = useState<NearbyStore[]>([])
  const [selectedStore, setSelectedStore] = useState<NearbyStore | null>(null)
  const [storeItems, setStoreItems] = useState<Item[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const supabase = createClient()

  // ── 위치 권한 요청 ──────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: 35.1017, lng: 129.0337 }) // 부산 기본
    )
  }, [])

  // ── 카카오 맵 초기화 ──────────────────────────────────────────────
  useEffect(() => {
    if (!location || !mapRef.current) return

    const script = document.querySelector('script[src*="dapi.kakao.com"]')
    if (!script) {
      const s = document.createElement('script')
      s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`
      s.async = true
      s.onload = initMap
      document.head.appendChild(s)
    } else {
      window.kakao?.maps?.load?.(initMap)
    }

    function initMap() {
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(location!.lat, location!.lng)
        const map = new window.kakao.maps.Map(mapRef.current, {
          center,
          level: 4,
        })
        mapInstance.current = map
        loadStores(location!)
      })
    }
  }, [location])

  // ── 주변 매장 로드 ───────────────────────────────────────────────
  const loadStores = useCallback(async (loc: { lat: number; lng: number }) => {
    const { data, error } = await supabase.rpc('get_nearby_stores', {
      user_lat: loc.lat,
      user_lng: loc.lng,
      radius_m: 1000,
    })
    if (error || !data) return
    setStores(data)
    addMapPins(data)
  }, [])

  function addMapPins(storeList: NearbyStore[]) {
    if (!mapInstance.current) return
    storeList.forEach((store) => {
      const pos = new window.kakao.maps.LatLng(store.lat, store.lng)
      const count = store.active_items
      const color = count >= 10 ? '#16a34a' : count >= 5 ? '#f59e0b' : '#ef4444'

      const content = `
        <div onclick="window.__selectStore('${store.id}')"
          style="cursor:pointer;width:36px;height:36px;border-radius:50%;
                 background:${color};color:white;font-size:13px;font-weight:700;
                 display:flex;align-items:center;justify-content:center;
                 border:2px solid rgba(255,255,255,.8);
                 box-shadow:0 2px 8px rgba(0,0,0,.18);">
          ${count}
        </div>`
      new window.kakao.maps.CustomOverlay({ map: mapInstance.current, position: pos, content, yAnchor: 1 })
    })

    // 전역 콜백 (카카오 오버레이 onclick 용)
    window.__selectStore = (storeId: string) => {
      const store = storeList.find(s => s.id === storeId)
      if (store) openStoreSheet(store)
    }
  }

  // ── 매장 상세 시트 ───────────────────────────────────────────────
  async function openStoreSheet(store: NearbyStore) {
    setSelectedStore(store)
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('store_id', store.id)
      .eq('status', 'active')
      .order('deadline_at', { ascending: true })
    setStoreItems(data ?? [])
    setSheetOpen(true)
  }

  // ── 실시간 재고 구독 ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedStore) return
    const channel = supabase
      .channel(`store-items-${selectedStore.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `store_id=eq.${selectedStore.id}`,
      }, (payload) => {
        setStoreItems(prev =>
          prev.map(item => item.id === (payload.new as Item).id ? payload.new as Item : item)
        )
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedStore])

  return (
    <div className="flex flex-col h-screen max-w-[480px] mx-auto bg-white overflow-hidden">
      {/* Top Nav */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
        <span className="text-lg font-bold text-green-600">Food Picker</span>
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-green-500 focus:bg-white transition-all"
            placeholder="매장명 또는 지역명 검색"
          />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* 현위치 버튼 */}
        <button
          onClick={() => location && mapInstance.current?.setCenter(new window.kakao.maps.LatLng(location.lat, location.lng))}
          className="absolute right-3 bottom-4 w-10 h-10 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
          </svg>
        </button>
      </div>

      {/* Bottom Sheet */}
      {sheetOpen && selectedStore && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white rounded-t-2xl shadow-2xl z-50 max-h-[75vh] flex flex-col">
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-900">{selectedStore.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{selectedStore.address} · {Math.round(selectedStore.distance_m)}m</p>
            </div>
            <div className="overflow-y-auto flex-1 p-4 pb-6">
              {storeItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">현재 판매 중인 물품이 없습니다</div>
              ) : (
                storeItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav */}
      <BottomNav active="home" />
    </div>
  )
}

// ── Item Card ──────────────────────────────────────────────────────────────
function ItemCard({ item }: { item: Item }) {
  const discountRate = Math.round(((item.start_price - item.current_price) / item.start_price) * 100)
  return (
    <div className="flex gap-3 p-3.5 rounded-2xl border border-gray-100 mb-2.5 hover:border-green-200 hover:shadow-sm transition-all cursor-pointer">
      <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
        {item.image_url
          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">🍱</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{item.quantity}개 남음</p>
        <div className="flex items-end gap-1.5 mt-2">
          <span className="text-xs text-gray-400 line-through">{formatPrice(item.start_price)}</span>
          <span className="text-base font-bold text-green-600">{formatPrice(item.current_price)}</span>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-700">-{discountRate}%</span>
        </div>
      </div>
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { key: 'home', href: '/home', label: '홈', icon: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
    { key: 'reservation', href: '/reservation', label: '예약', icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
    { key: 'mypage', href: '/mypage', label: '마이', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
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
