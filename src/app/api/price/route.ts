import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateCurrentPrice } from '@/lib/pricing'

/**
 * POST /api/price/update — 자동 가격 인하 크론 잡
 *
 * Vercel Cron에서 매 5분마다 호출:
 * vercel.json:
 * {
 *   "crons": [{ "path": "/api/price/update", "schedule": "every 5 minutes" }]
 * }
 *
 * Authorization: Bearer CRON_SECRET 헤더로 보호
 */
export async function POST(req: NextRequest) {
  // 크론 시크릿 확인
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // 1. 마감 시간 지난 물품 expired 처리
  const { error: expireError } = await supabase
    .from('items')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('deadline_at', now.toISOString())

  // 2. auto_pricing이 ON인 활성 물품의 가격 업데이트
  const { data: items, error } = await supabase
    .from('items')
    .select('id, start_price, final_price, current_price, created_at, deadline_at')
    .eq('status', 'active')
    .eq('auto_pricing', true)
    .gt('deadline_at', now.toISOString())

  if (error || !items) {
    return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 500 })
  }

  let updated = 0
  const updates = []

  for (const item of items) {
    const result = calculateCurrentPrice({
      startPrice: item.start_price,
      finalPrice: item.final_price,
      createdAt: new Date(item.created_at),
      deadlineAt: new Date(item.deadline_at),
      now,
    })

    // 가격이 변동된 경우만 업데이트 (DB 부하 최소화)
    if (result.currentPrice !== item.current_price) {
      updates.push({ id: item.id, current_price: result.currentPrice })
      updated++
    }
  }

  // 배치 업데이트
  for (const update of updates) {
    await supabase.from('items').update({ current_price: update.current_price }).eq('id', update.id)
  }

  // 3. 30분 초과 미픽업 예약 → no_show 처리 + 재고 복구
  const { data: expiredReservations } = await supabase
    .from('reservations')
    .select('id, item_id')
    .eq('status', 'reserved')
    .lt('pickup_deadline_at', now.toISOString())

  if (expiredReservations) {
    for (const res of expiredReservations) {
      await supabase.from('reservations').update({ status: 'no_show' }).eq('id', res.id)
      // 재고 복구
      await supabase.rpc('restore_item_quantity', { p_item_id: res.item_id }).maybeSingle()
      // 노쇼 카운트 증가
      await supabase.rpc('increment_no_show', { p_reservation_id: res.id }).maybeSingle()
    }
  }

  return NextResponse.json({
    success: true,
    priceUpdated: updated,
    noShowProcessed: expiredReservations?.length ?? 0,
    expiredAt: now.toISOString(),
  })
}
