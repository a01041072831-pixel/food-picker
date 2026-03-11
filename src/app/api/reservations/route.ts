import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/reservations — 예약 생성
 * DB 함수 create_reservation 호출 (트랜잭션 + 재고 차감 보장)
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { itemId } = await req.json()
  if (!itemId) {
    return NextResponse.json({ error: 'ITEM_ID_REQUIRED' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.rpc('create_reservation', {
      p_user_id: user.id,
      p_item_id: itemId,
    })

    if (error) {
      const msg = error.message
      if (msg.includes('OUT_OF_STOCK')) return NextResponse.json({ error: 'OUT_OF_STOCK' }, { status: 409 })
      if (msg.includes('ITEM_EXPIRED'))  return NextResponse.json({ error: 'ITEM_EXPIRED' }, { status: 410 })
      if (msg.includes('USER_BANNED'))   return NextResponse.json({ error: 'USER_BANNED' }, { status: 403 })
      throw error
    }

    // TODO: FCM 푸시 알림 — 매장 점주에게 발송
    // await sendPushToManager(data.store_id, data)

    return NextResponse.json({ reservation: data }, { status: 201 })
  } catch (err: any) {
    console.error('[reservation] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * PATCH /api/reservations — 예약 취소
 */
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { reservationId, reason } = await req.json()

  const { data, error } = await supabase
    .from('reservations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason ?? '사용자 취소',
    })
    .eq('id', reservationId)
    .eq('user_id', user.id)
    .eq('status', 'reserved')
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'CANCEL_FAILED' }, { status: 400 })
  }

  // 재고 복구
  await supabase.rpc('restore_item_quantity', { p_item_id: data.item_id })

  return NextResponse.json({ reservation: data })
}
