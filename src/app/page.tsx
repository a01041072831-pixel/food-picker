import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-green-600 tracking-tight">Food Picker</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              로그인
            </Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-semibold mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 blink" />
          지금 부산에서 36개 할인 물품이 판매 중
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          마감이 가까워질수록<br />
          <span className="text-green-600">가격은 바닥을 향합니다</span>
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed max-w-lg mx-auto mb-10">
          편의점·마트·식당의 소비기한 임박 신선식품을<br />
          실시간 다이내믹 프라이싱으로 저렴하게 구매하세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/home" className="px-8 py-4 rounded-xl bg-green-600 text-white font-bold text-[15px] hover:bg-green-700 transition-all active:scale-[.98]">
            주변 할인 매장 보기
          </Link>
          <a href="#how" className="px-8 py-4 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[15px] hover:bg-gray-50 transition-all">
            서비스 소개
          </a>
        </div>

        {/* 가격 티커 미리보기 */}
        <div className="mt-16 max-w-sm mx-auto bg-gray-900 rounded-2xl p-5 text-left shadow-xl">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">가격 변동 타임라인</p>
          {[
            { time: '16:00', price: '20,000원', width: '100%', type: 'past' },
            { time: '지금', price: '17,500원', width: '87%', type: 'current' },
            { time: '20:00', price: '~15,000원', width: '62%', type: 'future' },
            { time: '24:00', price: '최종 10,000원', width: '18%', type: 'future' },
          ].map((row) => (
            <div key={row.time} className="flex items-center gap-3 mb-3">
              <span className={`text-xs w-14 flex-shrink-0 ${row.type === 'current' ? 'text-green-400 font-bold' : row.type === 'past' ? 'text-gray-600' : 'text-gray-500'}`}>
                {row.time}
              </span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.type === 'current' ? 'bg-green-500' : row.type === 'past' ? 'bg-gray-600' : 'bg-gray-700'}`}
                  style={{ width: row.width }}
                />
              </div>
              <span className={`text-xs font-semibold w-28 text-right flex-shrink-0 ${row.type === 'current' ? 'text-green-400' : 'text-gray-500'}`}>
                {row.price}
              </span>
            </div>
          ))}
          <div className="mt-4 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 blink" />
            <span className="text-green-400 text-xs font-semibold">2시간 후 15,000원으로 인하 예정</span>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <section className="bg-green-600 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { val: '80%', label: '폐기율 절감 목표' },
            { val: '3,500원', label: '이하 평균 구매가' },
            { val: '30분', label: '픽업 보장 시간' },
            { val: '실시간', label: '가격 자동 인하' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold mb-1">{s.val}</div>
              <div className="text-sm text-green-100">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">어떻게 사용하나요?</h2>
        <p className="text-gray-500 text-center mb-12">3단계로 끝나는 라스트오더</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: '주변 매장 탐색',
              desc: '위치 기반 지도에서 반경 1km 이내 할인 중인 매장과 실시간 재고를 확인합니다.',
            },
            {
              step: '02',
              title: '가격 내려가는 것 보고 예약',
              desc: '원하는 가격에 도달하면 즉시 예약. 예약과 동시에 재고가 차감됩니다.',
            },
            {
              step: '03',
              title: '30분 이내 픽업',
              desc: '매장 방문 후 예약 화면을 점주에게 보여주면 끝. 주식 같은 타이밍 게임!',
            },
          ].map((item) => (
            <div key={item.step} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
              <div className="text-3xl font-black text-green-100 mb-3">{item.step}</div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── For Sellers ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">판매자를 위한 서비스</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">폐기 비용, 이제 매출로 전환하세요</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                신선식품 폐기로 매달 손실이 발생하고 있다면 Food Picker가 해결해 드립니다.
                물품 등록부터 가격 자동 인하까지 5분이면 충분합니다.
              </p>
              <ul className="space-y-3">
                {[
                  '물품 등록 5분, 이후 가격 인하 자동',
                  '예약 발생 즉시 푸시 알림',
                  '일·주·월 판매 실적 대시보드',
                  '폐기 비율 80% 절감 목표',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* 대시보드 미리보기 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">오늘의 판매 현황</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: '예약 건수', val: '2건', color: 'text-green-600' },
                  { label: '예약 금액', val: '19,450원', color: 'text-green-600' },
                  { label: '이번주 판매', val: '21건', color: 'text-gray-900' },
                  { label: '이번주 매출', val: '423,450원', color: 'text-orange-500' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                    <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1.5 h-16 mb-1">
                {[40, 65, 90, 50, 70, 45, 80].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 2 ? '#16a34a' : '#dcfce7' }} />
                ))}
              </div>
              <div className="flex gap-1.5">
                {['화','수','목','금','토','일','월'].map(d => (
                  <div key={d} className="flex-1 text-center text-[10px] text-gray-400">{d}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">기술 스택</h2>
        <p className="text-gray-500 text-center mb-10">프로덕션 수준의 안정성과 확장성</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Next.js 14', desc: 'App Router · SSR', color: 'bg-gray-900 text-white' },
            { name: 'Supabase', desc: 'DB · Auth · Realtime', color: 'bg-green-600 text-white' },
            { name: '카카오맵 API', desc: '위치 기반 지도', color: 'bg-yellow-400 text-gray-900' },
            { name: 'Vercel', desc: '자동 배포 · CDN', color: 'bg-gray-800 text-white' },
          ].map((t) => (
            <div key={t.name} className={`${t.color} rounded-xl p-4`}>
              <div className="font-bold text-sm mb-1">{t.name}</div>
              <div className="text-xs opacity-70">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-green-600 py-16 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">지금 바로 시작하세요</h2>
        <p className="text-green-100 mb-8">무료로 시작, 판매자 입점 신청은 5분이면 충분합니다</p>
        <Link href="/login" className="inline-block px-8 py-4 rounded-xl bg-white text-green-700 font-bold text-[15px] hover:bg-green-50 transition-all">
          무료로 시작하기
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span className="font-bold text-green-600">Food Picker</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600 transition-colors">이용약관</a>
            <a href="#" className="hover:text-gray-600 transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-gray-600 transition-colors">사업자 정보</a>
          </div>
          <span>© 2026 Food Picker. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
