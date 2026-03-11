# Food Picker — 개발 가이드 & Agent Teams 분석

## 프로젝트 구조

```
food-picker/
├── src/
│   ├── app/
│   │   ├── page.tsx                  ← 랜딩 페이지
│   │   ├── login/page.tsx            ← 소셜 로그인
│   │   ├── (user)/
│   │   │   ├── home/page.tsx         ← 카카오맵 메인
│   │   │   ├── reservation/page.tsx  ← 예약 현황
│   │   │   └── mypage/page.tsx       ← 주문 이력
│   │   ├── (manager)/
│   │   │   ├── register/page.tsx     ← 물품 등록
│   │   │   ├── inventory/page.tsx    ← 재고 관리
│   │   │   └── dashboard/page.tsx    ← 판매 대시보드
│   │   ├── (admin)/
│   │   │   ├── dashboard/page.tsx    ← 전체 현황
│   │   │   ├── stores/page.tsx       ← 매장/권한 관리
│   │   │   └── users/page.tsx        ← 사용자 관리
│   │   └── api/
│   │       ├── auth/callback/        ← OAuth 콜백
│   │       ├── items/                ← 물품 CRUD
│   │       ├── reservations/         ← 예약/취소
│   │       └── price/                ← 자동 가격 인하 크론
│   ├── lib/
│   │   ├── supabase/client.ts        ← 브라우저 클라이언트
│   │   ├── supabase/server.ts        ← 서버 클라이언트
│   │   ├── database.types.ts         ← DB 타입 정의
│   │   └── pricing.ts                ← 다이내믹 프라이싱 엔진
│   └── middleware.ts                 ← 인증 + 권한 체크
└── supabase/
    ├── schema.sql                    ← DB 스키마 + RLS 정책
    └── seed.sql                      ← 샘플 데이터
```

---

## 빠른 시작 (5분 셋업)

### 1. 저장소 복제 및 패키지 설치
```bash
git clone https://github.com/your-org/food-picker.git
cd food-picker
npm install
cp .env.example .env.local
```

### 2. Supabase 프로젝트 생성
1. https://supabase.com 접속 → 새 프로젝트 생성
2. Settings → API → URL, anon key, service_role key 복사
3. `.env.local`에 붙여넣기
4. SQL Editor에서 `supabase/schema.sql` 실행
5. (선택) `supabase/seed.sql` 실행

### 3. Supabase Auth 소셜 로그인 설정
```
Authentication → Providers
- Kakao: REST API 키, Admin 키 입력
  (카카오 디벨로퍼스 → 내 앱 → 앱 키)
- Google: 클라이언트 ID, 시크릿 입력
  (Google Cloud Console → OAuth 2.0)

Redirect URL 추가:
  http://localhost:3000/auth/callback
  https://your-app.vercel.app/auth/callback
```

### 4. Supabase Storage 버킷 생성
```
Storage → New bucket → "images" (Public)
```

### 5. 카카오 맵 API 키 발급
```
developers.kakao.com → 내 애플리케이션 → 앱 키 → JavaScript 키
플랫폼 → Web → 사이트 도메인:
  http://localhost:3000
  https://your-app.vercel.app
```

### 6. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000
```

### 7. Vercel 배포
```bash
npm install -g vercel
vercel --prod
# 환경 변수는 Vercel 대시보드에서 설정
```

---

## Agent Teams로 개발하는 방법 분석

### 가능 여부: 매우 높음 (권장)

Food Picker는 **역할이 명확히 분리된 모듈형 구조**여서
AI Agent를 팀으로 구성해 병렬 개발하기에 최적화된 프로젝트입니다.
마치 건설 현장에서 기초팀·골조팀·인테리어팀이 동시에 일하는 것처럼
각 Agent가 독립적인 영역을 담당할 수 있습니다.

---

### 추천 Agent Team 구성

#### Agent 1 — DB & Backend 담당
```
담당 파일:
- supabase/schema.sql (RLS 정책, 인덱스 최적화)
- src/app/api/** (모든 API Route)
- src/lib/pricing.ts (프라이싱 엔진)
- src/middleware.ts (인증 미들웨어)

주요 프롬프트:
"food-picker 프로젝트의 Supabase schema.sql을 기반으로
 src/app/api/reservations/route.ts의 동시성 처리 로직을
 SELECT FOR UPDATE 트랜잭션으로 구현해줘"
```

#### Agent 2 — User(구매자) 화면 담당
```
담당 파일:
- src/app/(user)/home/page.tsx
- src/app/(user)/reservation/page.tsx
- src/app/(user)/mypage/page.tsx
- src/components/map/KakaoMap.tsx
- src/components/items/PriceTicker.tsx

주요 프롬프트:
"src/lib/pricing.ts의 PricingResult 타입을 사용해서
 PriceTicker 컴포넌트를 Tailwind로 구현해줘.
 Supabase Realtime 구독도 포함해줘."
```

#### Agent 3 — Manager(판매자) 화면 담당
```
담당 파일:
- src/app/(manager)/register/page.tsx
- src/app/(manager)/inventory/page.tsx
- src/app/(manager)/dashboard/page.tsx

주요 프롬프트:
"src/lib/database.types.ts의 Item 타입을 기반으로
 /manager/inventory 페이지를 구현해줘.
 Supabase Realtime으로 예약 현황을 실시간 반영해줘."
```

#### Agent 4 — Admin 화면 담당
```
담당 파일:
- src/app/(admin)/dashboard/page.tsx
- src/app/(admin)/stores/page.tsx
- src/app/(admin)/users/page.tsx

주요 프롬프트:
"Supabase 서버 컴포넌트(createClient from server.ts)로
 Admin 대시보드를 SSR로 구현해줘.
 KPI 카드와 주간 판매 차트 포함."
```

#### Agent 5 — Landing & 공통 UI 담당
```
담당 파일:
- src/app/page.tsx (랜딩)
- src/app/login/page.tsx
- src/app/globals.css
- src/components/ui/**

주요 프롬프트:
"토스 스타일의 랜딩 페이지를 Next.js + Tailwind로 구현해줘.
 섹션: Hero, 통계, 서비스 소개, 판매자 섹션, CTA"
```

---

### Claude Code Agent 팀 실행 예시

```bash
# 터미널 1: DB Agent
claude --model claude-opus-4-5 \
  "food-picker/supabase/schema.sql을 읽고
   노쇼 카운트 자동 증가 함수 increment_no_show를 추가해줘"

# 터미널 2: User UI Agent
claude --model claude-sonnet-4-5 \
  "food-picker/src/app/(user)/reservation/page.tsx를 구현해줘.
   Supabase에서 내 예약 목록을 가져오고,
   30분 카운트다운 타이머를 실시간으로 표시해줘."

# 터미널 3: Manager Agent (병렬)
claude --model claude-sonnet-4-5 \
  "food-picker/src/app/(manager)/dashboard/page.tsx를 구현해줘.
   실시간 예약 현황과 주간 판매 막대 차트를 포함해줘."
```

---

### Agent 협업 시 주의사항

1. **공유 파일 먼저 확정**
   - `src/lib/database.types.ts` — 모든 Agent가 참조하는 타입
   - `supabase/schema.sql` — DB 구조 변경은 Backend Agent만
   - `src/app/globals.css` — 스타일 변수는 UI Agent가 담당

2. **API 계약 먼저 정의**
   - API Route의 Request/Response 형식을 먼저 문서화
   - Agent 2, 3, 4는 이 API 계약서를 기준으로 클라이언트 코드 작성

3. **브랜치 전략**
   ```
   main
   ├── feat/db-schema      ← Agent 1
   ├── feat/user-ui        ← Agent 2
   ├── feat/manager-ui     ← Agent 3
   ├── feat/admin-ui       ← Agent 4
   └── feat/landing        ← Agent 5
   ```

4. **Claude Code로 전체 프로젝트 이해시키기**
   ```bash
   # 프로젝트 루트에서
   claude
   > /init  # 전체 파일 구조를 Claude Code에 인덱싱
   > "이 프로젝트의 아키텍처를 이해하고 CLAUDE.md를 작성해줘"
   ```

---

## 환경 변수 체크리스트

| 변수 | 필수 | 설명 |
|------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | Supabase anon 키 |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | 서버 전용 (RLS 우회) |
| NEXT_PUBLIC_KAKAO_MAP_KEY | ✅ | 카카오맵 JS 키 |
| NEXT_PUBLIC_FIREBASE_API_KEY | 선택 | FCM 푸시 알림 |
| CRON_SECRET | ✅ | 가격 업데이트 크론 보호 |

---

## 주요 기술 결정 사항

### 왜 Supabase인가?
- **Realtime**: WebSocket으로 가격·재고 실시간 동기화 (별도 Redis 불필요)
- **RLS**: DB 수준 접근 제어 (User는 본인 예약만, Manager는 본인 매장만)
- **Auth**: 카카오·구글 OAuth 5분 설정
- **Storage**: 물품 이미지 저장소 기본 제공

### 왜 Next.js App Router인가?
- 서버 컴포넌트로 Admin 대시보드 초기 데이터 SSR (SEO + 성능)
- API Route로 백엔드 분리 없이 서버 로직 처리
- Vercel Cron으로 가격 자동 인하 스케줄러

### 동시성 처리 전략
```sql
-- create_reservation DB 함수에서 SELECT FOR UPDATE 사용
-- 마지막 1개 재고에 동시 예약이 들어와도 1개만 성공
SELECT * FROM items WHERE id = p_item_id FOR UPDATE;
```

### SaaS 확장 시 추가할 것
1. `tenants` 테이블 추가 (멀티 테넌시)
2. 매장별 서브도메인: `cu-bosudong.foodpicker.kr`
3. Stripe 연동 (구독 결제)
4. 매장별 브랜딩 커스터마이징
