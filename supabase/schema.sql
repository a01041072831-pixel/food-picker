-- ============================================================
--  Food Picker — Supabase Schema
--  실행 순서: 이 파일 전체를 Supabase SQL Editor에 붙여넣고 실행
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- 위치 기반 검색용

-- ── ENUM Types ──────────────────────────────────────────────────
create type user_role as enum ('user', 'manager', 'admin');
create type reservation_status as enum ('reserved', 'picked_up', 'cancelled', 'no_show');
create type item_status as enum ('active', 'closed', 'sold_out', 'expired');

-- ══════════════════════════════════════════════════════════════════
--  1. USERS
--  Supabase Auth의 auth.users를 확장하는 프로필 테이블
-- ══════════════════════════════════════════════════════════════════
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  name            text,
  avatar_url      text,
  role            user_role not null default 'user',
  no_show_count   integer not null default 0,
  is_banned       boolean not null default false,
  banned_until    timestamptz,
  fcm_token       text,           -- Firebase 푸시 토큰
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 신규 Auth 유저 생성 시 자동으로 users 레코드 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신 함수
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════
--  2. STORES  (판매자 매장)
-- ══════════════════════════════════════════════════════════════════
create table public.stores (
  id               uuid primary key default uuid_generate_v4(),
  manager_id       uuid not null references public.users(id) on delete restrict,
  name             text not null,
  address          text not null,
  lat              double precision not null,
  lng              double precision not null,
  location         geography(point, 4326),  -- PostGIS 공간 인덱스용
  phone            text,
  category         text,                    -- 'convenience' | 'mart' | 'restaurant'
  commission_rate  numeric(4,2) not null default 3.00,  -- 1.00 ~ 5.00
  is_active        boolean not null default true,
  image_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- location 컬럼을 lat/lng에서 자동 계산
create or replace function public.sync_store_location()
returns trigger language plpgsql as $$
begin
  new.location = st_makepoint(new.lng, new.lat)::geography;
  return new;
end;
$$;

create trigger stores_sync_location
  before insert or update of lat, lng on public.stores
  for each row execute function public.sync_store_location();

create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

-- 공간 인덱스
create index stores_location_idx on public.stores using gist(location);
create index stores_manager_id_idx on public.stores(manager_id);

-- ══════════════════════════════════════════════════════════════════
--  3. ITEMS  (할인 판매 물품)
-- ══════════════════════════════════════════════════════════════════
create table public.items (
  id              uuid primary key default uuid_generate_v4(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  name            text not null check (char_length(name) <= 20),
  image_url       text,
  quantity        integer not null check (quantity >= 0),
  start_price     integer not null check (start_price > 0),
  final_price     integer not null check (final_price > 0),
  current_price   integer not null,
  deadline_at     timestamptz not null,
  auto_pricing    boolean not null default true,
  status          item_status not null default 'active',
  view_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint price_order check (start_price >= final_price),
  constraint price_in_range check (current_price between final_price and start_price)
);

create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

create index items_store_id_idx on public.items(store_id);
create index items_status_deadline_idx on public.items(status, deadline_at);

-- ══════════════════════════════════════════════════════════════════
--  4. PRICE_HISTORY  (가격 히스토리 — 티커 차트용)
-- ══════════════════════════════════════════════════════════════════
create table public.price_history (
  id           bigserial primary key,
  item_id      uuid not null references public.items(id) on delete cascade,
  price        integer not null,
  recorded_at  timestamptz not null default now()
);

create index price_history_item_id_idx on public.price_history(item_id, recorded_at desc);

-- 가격 변동 시 price_history 자동 기록
create or replace function public.record_price_change()
returns trigger language plpgsql as $$
begin
  if old.current_price <> new.current_price then
    insert into public.price_history (item_id, price)
    values (new.id, new.current_price);
  end if;
  return new;
end;
$$;

create trigger items_price_change
  after update of current_price on public.items
  for each row execute function public.record_price_change();

-- ══════════════════════════════════════════════════════════════════
--  5. RESERVATIONS  (예약)
-- ══════════════════════════════════════════════════════════════════
create table public.reservations (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.users(id) on delete restrict,
  item_id             uuid not null references public.items(id) on delete restrict,
  store_id            uuid not null references public.stores(id) on delete restrict,
  reserved_price      integer not null,
  status              reservation_status not null default 'reserved',
  pickup_deadline_at  timestamptz not null,  -- reserved_at + 30분
  picked_up_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

create index reservations_user_id_idx on public.reservations(user_id);
create index reservations_store_id_idx on public.reservations(store_id);
create index reservations_item_id_idx on public.reservations(item_id);
create index reservations_status_idx on public.reservations(status);

-- 예약 시 재고 차감 (동시성 처리 — SELECT FOR UPDATE 사용)
create or replace function public.create_reservation(
  p_user_id   uuid,
  p_item_id   uuid
)
returns public.reservations language plpgsql security definer as $$
declare
  v_item      public.items;
  v_res       public.reservations;
  v_user      public.users;
begin
  -- 사용자 밴 여부 확인
  select * into v_user from public.users where id = p_user_id for share;
  if v_user.is_banned and (v_user.banned_until is null or v_user.banned_until > now()) then
    raise exception 'USER_BANNED';
  end if;

  -- 재고 락 (동시 예약 경합 방지)
  select * into v_item from public.items
    where id = p_item_id and status = 'active' for update;

  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  if v_item.quantity <= 0 then
    raise exception 'OUT_OF_STOCK';
  end if;

  if v_item.deadline_at < now() then
    raise exception 'ITEM_EXPIRED';
  end if;

  -- 재고 차감
  update public.items
    set quantity = quantity - 1,
        status = case when quantity - 1 = 0 then 'sold_out' else status end
    where id = p_item_id;

  -- 예약 생성
  insert into public.reservations (
    user_id, item_id, store_id,
    reserved_price, pickup_deadline_at
  )
  values (
    p_user_id, p_item_id, v_item.store_id,
    v_item.current_price, now() + interval '30 minutes'
  )
  returning * into v_res;

  return v_res;
end;
$$;

-- ══════════════════════════════════════════════════════════════════
--  6. NOTICES  (공지사항)
-- ══════════════════════════════════════════════════════════════════
create table public.notices (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  content     text not null,
  author_id   uuid not null references public.users(id),
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger notices_updated_at before update on public.notices
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════
--  7. 주변 매장 검색 함수 (PostGIS)
-- ══════════════════════════════════════════════════════════════════
create or replace function public.get_nearby_stores(
  user_lat  double precision,
  user_lng  double precision,
  radius_m  integer default 1000   -- 기본 1km
)
returns table (
  id              uuid,
  name            text,
  address         text,
  lat             double precision,
  lng             double precision,
  distance_m      double precision,
  active_items    bigint
) language sql stable as $$
  select
    s.id, s.name, s.address, s.lat, s.lng,
    st_distance(s.location, st_makepoint(user_lng, user_lat)::geography) as distance_m,
    count(i.id) filter (where i.status = 'active' and i.deadline_at > now()) as active_items
  from public.stores s
  left join public.items i on i.store_id = s.id
  where
    s.is_active = true
    and st_dwithin(
      s.location,
      st_makepoint(user_lng, user_lat)::geography,
      radius_m
    )
  group by s.id
  order by distance_m;
$$;

-- ══════════════════════════════════════════════════════════════════
--  8. Row Level Security (RLS) 정책
-- ══════════════════════════════════════════════════════════════════
alter table public.users       enable row level security;
alter table public.stores      enable row level security;
alter table public.items       enable row level security;
alter table public.price_history enable row level security;
alter table public.reservations enable row level security;
alter table public.notices     enable row level security;

-- helper: 현재 사용자 role
create or replace function public.my_role()
returns user_role language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

-- ── users ──
create policy "본인 프로필 조회" on public.users for select using (id = auth.uid());
create policy "Admin 전체 조회" on public.users for select using (public.my_role() = 'admin');
create policy "본인 프로필 수정" on public.users for update using (id = auth.uid());
create policy "Admin 사용자 수정" on public.users for update using (public.my_role() = 'admin');

-- ── stores ──
create policy "공개 매장 조회" on public.stores for select using (is_active = true);
create policy "Admin 전체 매장 조회" on public.stores for select using (public.my_role() = 'admin');
create policy "Manager 본인 매장 수정" on public.stores for update using (manager_id = auth.uid());
create policy "Admin 매장 삽입" on public.stores for insert with check (public.my_role() = 'admin');
create policy "Admin 매장 수정" on public.stores for update using (public.my_role() = 'admin');

-- ── items ──
create policy "공개 물품 조회" on public.items for select using (status in ('active','sold_out'));
create policy "Manager 본인 매장 물품 관리" on public.items for all
  using (
    store_id in (select id from public.stores where manager_id = auth.uid())
  );
create policy "Admin 물품 전체 관리" on public.items for all using (public.my_role() = 'admin');

-- ── price_history ──
create policy "공개 가격 이력 조회" on public.price_history for select using (true);

-- ── reservations ──
create policy "본인 예약 조회" on public.reservations for select using (user_id = auth.uid());
create policy "Manager 매장 예약 조회" on public.reservations for select
  using (
    store_id in (select id from public.stores where manager_id = auth.uid())
  );
create policy "Admin 예약 전체 조회" on public.reservations for select using (public.my_role() = 'admin');
create policy "본인 예약 생성" on public.reservations for insert with check (user_id = auth.uid());
create policy "본인 예약 취소" on public.reservations for update
  using (user_id = auth.uid() and status = 'reserved');

-- ── notices ──
create policy "공개 공지 조회" on public.notices for select using (true);
create policy "Admin 공지 관리" on public.notices for all using (public.my_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════
--  9. Realtime 구독 활성화
-- ══════════════════════════════════════════════════════════════════
-- Supabase 대시보드 → Database → Replication 에서도 설정 가능
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table
    public.items,
    public.reservations,
    public.price_history;
commit;
