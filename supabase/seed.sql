-- ============================================================
--  Food Picker — Seed Data (개발/테스트용)
--  주의: schema.sql 실행 후에 실행하세요
-- ============================================================

-- 테스트 매장 (manager_id는 실제 Auth UID로 교체 필요)
-- 아래 uuid는 임시값입니다. Supabase Auth에서 생성한 실제 UID로 변경하세요.

-- 샘플 매장
insert into public.stores (id, manager_id, name, address, lat, lng, category, commission_rate)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001', -- TODO: 실제 manager UID
    'CU 보수동책방골목점',
    '부산 중구 보수동1가 1',
    35.1017, 129.0337,
    'convenience',
    3.00
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'GS25 중앙역점',
    '부산 중구 중앙대로 2',
    35.1050, 129.0326,
    'convenience',
    2.00
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '서면 홈플러스',
    '부산 부산진구 서면로 9',
    35.1579, 129.0592,
    'mart',
    2.50
  )
on conflict do nothing;

-- 샘플 물품
insert into public.items (store_id, name, quantity, start_price, final_price, current_price, deadline_at, auto_pricing)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    'OO 삼각김밥 참치마요',
    5, 20000, 10000, 17500,
    now() + interval '8 hours',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000001',
    'OO 흰우유 200ml',
    3, 1800, 900, 1500,
    now() + interval '6 hours',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    '참치 샌드위치',
    8, 4500, 2000, 3800,
    now() + interval '4 hours',
    true
  )
on conflict do nothing;
