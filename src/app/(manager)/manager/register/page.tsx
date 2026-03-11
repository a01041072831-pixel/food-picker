'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ManagerRegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(5)
  const [startPrice, setStartPrice] = useState('')
  const [finalPrice, setFinalPrice] = useState('')
  const [deadlineAt, setDeadlineAt] = useState('')
  const [autoPricing, setAutoPricing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `items/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit() {
    if (!name || !startPrice || !finalPrice || !deadlineAt) {
      setError('모든 필드를 입력해 주세요.')
      return
    }
    if (parseInt(startPrice.replace(/,/g, '')) < parseInt(finalPrice.replace(/,/g, ''))) {
      setError('시작가는 최종가보다 높아야 합니다.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 이미지 업로드
      let imageUrl: string | null = null
      if (imageFile) imageUrl = await uploadImage(imageFile)

      // 현재 사용자 매장 조회
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')
      const { data: store } = await supabase.from('stores').select('id').eq('manager_id', user.id).eq('is_active', true).single()
      if (!store) throw new Error('등록된 매장이 없습니다.')

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          name,
          imageUrl,
          quantity,
          startPrice: parseInt(startPrice.replace(/,/g, '')),
          finalPrice: parseInt(finalPrice.replace(/,/g, '')),
          deadlineAt,
          autoPricing,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/manager/inventory')
    } catch (err: any) {
      setError(err.message || '등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function formatNumberInput(val: string) {
    const num = val.replace(/[^0-9]/g, '')
    return num ? parseInt(num).toLocaleString('ko-KR') : ''
  }

  return (
    <div className="flex flex-col h-screen max-w-[480px] mx-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 border-b border-gray-100 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">물품 등록</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8">
        {/* 신규 / 기존 선택 */}
        <div className="flex gap-2 mb-6">
          <button className="flex-1 py-3.5 rounded-xl border-2 border-green-500 bg-green-50 text-green-700 text-sm font-bold">
            신규 등록
          </button>
          <button
            className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            onClick={() => router.push('/manager/history')}
          >
            기존 불러오기
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 물품명 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">물품명</label>
          <input
            className="form-input"
            placeholder="예: OO 삼각김밥 (참치마요)"
            maxLength={20}
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{name.length}/20</p>
        </div>

        {/* 이미지 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">물품 이미지</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imagePreview ? (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-100">
              <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-900/60 text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-28 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-sm font-medium">이미지 등록</span>
            </button>
          )}
        </div>

        {/* 재고 수량 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">재고 수량</label>
          <div className="flex items-center gap-0">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-l-xl border border-gray-200 flex items-center justify-center text-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              -
            </button>
            <div className="flex-1 h-11 border-t border-b border-gray-200 flex items-center justify-center text-base font-bold text-gray-900">
              {quantity}
            </div>
            <button
              onClick={() => setQuantity(q => Math.min(20, q + 1))}
              className="w-11 h-11 rounded-r-xl border border-gray-200 flex items-center justify-center text-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* 할인 로직 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">할인 로직</label>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">시작가</label>
                <input
                  className="form-input text-right"
                  placeholder="20,000"
                  value={startPrice}
                  onChange={e => setStartPrice(formatNumberInput(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">최종가 (하한)</label>
                <input
                  className="form-input text-right"
                  placeholder="10,000"
                  value={finalPrice}
                  onChange={e => setFinalPrice(formatNumberInput(e.target.value))}
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">마감 시간</label>
              <input
                className="form-input"
                type="datetime-local"
                value={deadlineAt}
                onChange={e => setDeadlineAt(e.target.value)}
              />
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">자동 판매 모드</p>
                <p className="text-xs text-gray-500 mt-0.5">마감 시간에 따라 자동 가격 인하</p>
              </div>
              <button
                onClick={() => setAutoPricing(v => !v)}
                className={`w-12 h-6.5 rounded-full relative transition-colors ${autoPricing ? 'bg-green-500' : 'bg-gray-200'}`}
                style={{ height: '26px' }}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoPricing ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? '등록 중...' : '물품 등록 완료'}
        </button>
      </div>

      <ManagerBottomNav active="register" />
    </div>
  )
}

function ManagerBottomNav({ active }: { active: string }) {
  const items = [
    { key: 'register', href: '/manager/register', label: '물품 등록' },
    { key: 'inventory', href: '/manager/inventory', label: '재고 관리' },
    { key: 'dashboard', href: '/manager/dashboard', label: '대시보드' },
  ]
  return (
    <div className="flex bg-white border-t border-gray-100 flex-shrink-0">
      {items.map(({ key, href, label }) => (
        <a key={key} href={href} className={`flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors ${active === key ? 'text-green-600 border-green-600' : 'text-gray-400 border-transparent'}`}>
          {label}
        </a>
      ))}
    </div>
  )
}
