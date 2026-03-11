# CLAUDE.md — Food Picker

## 프로젝트 개요
마감 임박 식품 실시간 할인 마켓플레이스. 유통기한이 가까워질수록 가격이 자동 하락하는 "주식형" 가격 모델.
소비자는 주변 매장의 할인 상품을 예약하고 30분 내 픽업.

## 기술 스택
- **프레임워크:** Next.js 14 (App Router, SSR/CSR 혼합)
- **언어:** TypeScript 5.3 (strict mode)
- **스타일:** Tailwind CSS 3.4 + 커스텀 컴포넌트 (globals.css)
- **DB/인증:** Supabase (PostgreSQL + PostGIS + Auth + Realtime + Storage)
- **지도:** Kakao Map API
- **배포:** Vercel (5분 간격 Cron으로 자동 가격 업데이트)
- **아이콘:** lucide-react | **유틸:** date-fns, clsx

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx              # 랜딩 페이지
│   ├── login/page.tsx        # OAuth 로그인 (Kakao, Google)
│   ├── layout.tsx            # 루트 레이아웃 (Noto Sans KR)
│   ├── globals.css           # Tailwind + 커스텀 CSS
│   ├── (user)/home/          # 카카오맵 + 근처 매장/상품 탐색
│   ├── (manager)/register/   # 물품 등록 폼
│   ├── (admin)/dashboard/    # 관리자 KPI 대시보드 (SSR)
│   └── api/
│       ├── auth/callback/    # OAuth 콜백
│       ├── items/            # 상품 CRUD
│       ├── reservations/     # 예약 생성/취소
│       └── price/            # 자동 가격 갱신 Cron
├── lib/
│   ├── database.types.ts     # DB 스키마 TypeScript 타입
│   ├── pricing.ts            # 동적 가격 계산 엔진
│   └── supabase/
│       ├── client.ts         # 브라우저 클라이언트
│       └── server.ts         # 서버 클라이언트 + ServiceRole
├── middleware.ts             # 인증 + 역할 기반 라우팅 보호
supabase/
├── schema.sql                # PostgreSQL 스키마 + RLS 정책
└── seed.sql                  # 샘플 데이터
```

## 역할 (roles)
- **user:** 상품 탐색, 예약, 픽업
- **manager:** 매장 물품 등록/관리, 재고/매출 확인
- **admin:** 전체 관리, 매장/사용자 관리, 공지사항

## DB 테이블
| 테이블 | 설명 |
|--------|------|
| users | 사용자 (role, no_show_count, is_banned) |
| stores | 매장 (PostGIS 위치, commission_rate) |
| items | 할인 상품 (start/final/current_price, deadline, auto_pricing) |
| price_history | 가격 변동 로그 |
| reservations | 예약 (30분 픽업, 상태: reserved/picked_up/cancelled/no_show) |
| notices | 공지사항 |

## 핵심 비즈니스 로직
- **가격 계산:** `pricing.ts` — 경과 비율에 따라 start→final 선형 하락, 10원 단위 내림
- **예약:** `create_reservation()` DB 함수 — SELECT FOR UPDATE로 동시성 제어
- **Cron (5분):** 만료 처리 + 가격 갱신 + 노쇼 처리 + 재고 복원

## 미완성 페이지 (TODO)
- `src/app/(user)/reservation/page.tsx` — 예약 목록 + 30분 카운트다운
- `src/app/(user)/mypage/page.tsx` — 주문 이력 + 공지사항
- `src/app/(manager)/inventory/page.tsx` — 재고 관리 + Realtime
- `src/app/(manager)/dashboard/page.tsx` — 매장 매출 대시보드
- `src/app/(admin)/stores/page.tsx` — 매장 관리 + 권한/수수료 설정
- `src/app/(admin)/users/page.tsx` — 사용자 관리 + 노쇼/이용제한

## 개발 명령어
```bash
npm run dev        # 개발 서버 (localhost:3000)
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
```

## 환경 변수 (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 연결
- `SUPABASE_SERVICE_ROLE_KEY` — RLS 우회 (API 라우트 전용)
- `NEXT_PUBLIC_KAKAO_MAP_KEY` — 카카오맵
- `CRON_SECRET` — Vercel Cron 인증
- Firebase FCM 키들 (선택)

## 코딩 컨벤션
- 브랜드 컬러: green 계열 (brand-500: #22c55e)
- 모바일 퍼스트 (max-w-[480px] 앱 컨테이너)
- 한국어 UI, 원화(₩) 표기
- Supabase RLS로 데이터 접근 제어
- 서버 컴포넌트 기본, 인터랙션 필요시 'use client'
