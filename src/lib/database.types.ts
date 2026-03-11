// ============================================================
//  Food Picker — Database Types
//  자동 생성: npm run supabase:types
//  수동으로 작성된 버전 (초기 개발용)
// ============================================================

export type UserRole          = 'user' | 'manager' | 'admin'
export type ReservationStatus = 'reserved' | 'picked_up' | 'cancelled' | 'no_show'
export type ItemStatus        = 'active' | 'closed' | 'sold_out' | 'expired'

// ── Row 타입을 먼저 독립적으로 정의 (순환 참조 방지) ─────────────────────
interface UserRow {
  id: string; email: string; name: string | null; avatar_url: string | null
  role: UserRole; no_show_count: number; is_banned: boolean
  banned_until: string | null; fcm_token: string | null
  created_at: string; updated_at: string
}
interface StoreRow {
  id: string; manager_id: string; name: string; address: string
  lat: number; lng: number; phone: string | null; category: string | null
  commission_rate: number; is_active: boolean; image_url: string | null
  created_at: string; updated_at: string
}
interface ItemRow {
  id: string; store_id: string; name: string; image_url: string | null
  quantity: number; start_price: number; final_price: number; current_price: number
  deadline_at: string; auto_pricing: boolean; status: ItemStatus
  view_count: number; created_at: string; updated_at: string
}
interface PriceHistoryRow {
  id: number; item_id: string; price: number; recorded_at: string
}
interface ReservationRow {
  id: string; user_id: string; item_id: string; store_id: string
  reserved_price: number; status: ReservationStatus; pickup_deadline_at: string
  picked_up_at: string | null; cancelled_at: string | null; cancel_reason: string | null
  created_at: string; updated_at: string
}
interface NoticeRow {
  id: string; title: string; content: string; author_id: string
  is_pinned: boolean; created_at: string; updated_at: string
}

// ── Database 타입 ─────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      users: {
        Row:           UserRow
        Insert:        Omit<UserRow, 'created_at' | 'updated_at'>
        Update:        Partial<Omit<UserRow, 'created_at' | 'updated_at'>>
        Relationships: []
      }
      stores: {
        Row:           StoreRow
        Insert:        Omit<StoreRow, 'id' | 'created_at' | 'updated_at'>
        Update:        Partial<Omit<StoreRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      items: {
        Row:           ItemRow
        Insert:        Omit<ItemRow, 'id' | 'view_count' | 'created_at' | 'updated_at'>
        Update:        Partial<Omit<ItemRow, 'id' | 'view_count' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      price_history: {
        Row:           PriceHistoryRow
        Insert:        Omit<PriceHistoryRow, 'id' | 'recorded_at'>
        Update:        Record<string, never>
        Relationships: []
      }
      reservations: {
        Row:           ReservationRow
        Insert:        Omit<ReservationRow, 'id' | 'status' | 'picked_up_at' | 'cancelled_at' | 'cancel_reason' | 'created_at' | 'updated_at'>
        Update:        Partial<Omit<ReservationRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      notices: {
        Row:           NoticeRow
        Insert:        Omit<NoticeRow, 'id' | 'created_at' | 'updated_at'>
        Update:        Partial<Omit<NoticeRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_nearby_stores: {
        Args:    { user_lat: number; user_lng: number; radius_m?: number }
        Returns: Array<{
          id: string; name: string; address: string
          lat: number; lng: number; distance_m: number; active_items: number
        }>
      }
      create_reservation: {
        Args:    { p_user_id: string; p_item_id: string }
        Returns: ReservationRow
      }
      my_role: {
        Args:    Record<never, never>
        Returns: UserRole
      }
    }
  }
}

// ── 편의 타입 ─────────────────────────────────────────────────────────────
export type User         = UserRow
export type Store        = StoreRow
export type Item         = ItemRow
export type PriceHistory = PriceHistoryRow
export type Reservation  = ReservationRow
export type Notice       = NoticeRow

export type NearbyStore  = Database['public']['Functions']['get_nearby_stores']['Returns'][number]

// 조인 타입
export type ReservationWithDetails = Reservation & {
  items:  Pick<Item,  'name' | 'image_url'>
  stores: Pick<Store, 'name' | 'address'>
}
