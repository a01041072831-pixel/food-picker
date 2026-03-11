import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/items?storeId=xxx — 매장 물품 목록
 * POST /api/items — 물품 등록 (Manager 전용)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'STORE_ID_REQUIRED' }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, price_history(price, recorded_at)')
    .eq('store_id', storeId)
    .in('status', ['active', 'sold_out'])
    .order('deadline_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // role 확인
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['manager', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json()
  const { storeId, name, imageUrl, quantity, startPrice, finalPrice, deadlineAt, autoPricing } = body

  // 유효성 검사
  if (!storeId || !name || !quantity || !startPrice || !finalPrice || !deadlineAt) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }
  if (startPrice < finalPrice) {
    return NextResponse.json({ error: 'INVALID_PRICE_RANGE' }, { status: 400 })
  }
  if (name.length > 20) {
    return NextResponse.json({ error: 'NAME_TOO_LONG' }, { status: 400 })
  }

  // 본인 매장인지 확인
  const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('manager_id', user.id).single()
  if (!store && profile.role !== 'admin') {
    return NextResponse.json({ error: 'NOT_YOUR_STORE' }, { status: 403 })
  }

  const { data: item, error } = await supabase
    .from('items')
    .insert({
      store_id: storeId,
      name,
      image_url: imageUrl ?? null,
      quantity,
      start_price: startPrice,
      final_price: finalPrice,
      current_price: startPrice,   // 초기 현재가 = 시작가
      deadline_at: deadlineAt,
      auto_pricing: autoPricing ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 최초 가격 히스토리 기록
  await supabase.from('price_history').insert({ item_id: item.id, price: startPrice })

  return NextResponse.json({ item }, { status: 201 })
}
