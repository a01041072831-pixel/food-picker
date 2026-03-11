/**
 * Food Picker — 다이내믹 프라이싱 엔진
 *
 * 개념: 시작가에서 최종가까지 마감 시간 기준 선형 감소
 *       "모래시계처럼 시간이 줄어들수록 가격도 줄어든다"
 *
 * 공식:
 *   elapsed_ratio = (now - created_at) / (deadline_at - created_at)
 *   raw_price = start_price - (start_price - final_price) * elapsed_ratio
 *   current_price = round_down_to_10(clamp(raw_price, final_price, start_price))
 */

export interface PricingInput {
  startPrice: number
  finalPrice: number
  createdAt: Date
  deadlineAt: Date
  now?: Date
}

export interface PricingResult {
  currentPrice: number
  discountRate: number           // % 할인율
  nextPrice: number              // 다음 단계 가격 (1시간 후 기준)
  minutesUntilNextDrop: number   // 다음 가격 인하까지 남은 분
  isExpired: boolean
  priceTimeline: PricePoint[]   // 차트용
}

export interface PricePoint {
  time: Date
  price: number
  label: string
  isPast: boolean
  isCurrent: boolean
}

export function calculateCurrentPrice(input: PricingInput): PricingResult {
  const now = input.now ?? new Date()
  const totalMs = input.deadlineAt.getTime() - input.createdAt.getTime()
  const elapsedMs = now.getTime() - input.createdAt.getTime()

  const isExpired = now >= input.deadlineAt

  if (isExpired) {
    return {
      currentPrice: input.finalPrice,
      discountRate: calcDiscountRate(input.startPrice, input.finalPrice),
      nextPrice: input.finalPrice,
      minutesUntilNextDrop: 0,
      isExpired: true,
      priceTimeline: buildTimeline(input, now),
    }
  }

  const ratio = Math.min(1, Math.max(0, elapsedMs / totalMs))
  const rawPrice = input.startPrice - (input.startPrice - input.finalPrice) * ratio
  const currentPrice = roundDownTo10(Math.max(input.finalPrice, rawPrice))

  // 1시간 후 가격
  const futureMs = Math.min(elapsedMs + 60 * 60 * 1000, totalMs)
  const futureRatio = futureMs / totalMs
  const futureRaw = input.startPrice - (input.startPrice - input.finalPrice) * futureRatio
  const nextPrice = roundDownTo10(Math.max(input.finalPrice, futureRaw))

  // 다음 가격 인하까지 남은 시간 (10원 단위 기준)
  const minutesUntilNextDrop = calcMinutesUntilNextDrop(input, now, currentPrice)

  return {
    currentPrice,
    discountRate: calcDiscountRate(input.startPrice, currentPrice),
    nextPrice,
    minutesUntilNextDrop,
    isExpired: false,
    priceTimeline: buildTimeline(input, now),
  }
}

function roundDownTo10(price: number): number {
  return Math.floor(price / 10) * 10
}

function calcDiscountRate(startPrice: number, currentPrice: number): number {
  return Math.round(((startPrice - currentPrice) / startPrice) * 100)
}

function calcMinutesUntilNextDrop(
  input: PricingInput,
  now: Date,
  currentPrice: number
): number {
  // 현재 가격에서 10원 인하되는 시점까지 남은 분 계산
  const totalMs = input.deadlineAt.getTime() - input.createdAt.getTime()
  const priceRange = input.startPrice - input.finalPrice
  if (priceRange === 0) return 0
  const targetPrice = currentPrice - 10
  const targetRatio = (input.startPrice - targetPrice) / priceRange
  const targetMs = targetRatio * totalMs
  const targetTime = new Date(input.createdAt.getTime() + targetMs)
  return Math.max(0, Math.round((targetTime.getTime() - now.getTime()) / 60000))
}

function buildTimeline(input: PricingInput, now: Date): PricePoint[] {
  const totalMs = input.deadlineAt.getTime() - input.createdAt.getTime()
  const steps = 5 // 시작가 + 중간 3개 + 최종가

  return Array.from({ length: steps }, (_, i) => {
    const ratio = i / (steps - 1)
    const time = new Date(input.createdAt.getTime() + totalMs * ratio)
    const rawPrice = input.startPrice - (input.startPrice - input.finalPrice) * ratio
    const price = roundDownTo10(Math.max(input.finalPrice, rawPrice))
    const isPast = time <= now
    const isCurrent = !isPast && (i === 0 ? false : buildTimeline(input, now)[i-1]?.isPast ?? false)

    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')

    return {
      time,
      price,
      label: i === steps - 1 ? '마감' : `${hours}:${minutes}`,
      isPast,
      isCurrent: i > 0 && isPast && !buildTimeline(input, now)[i]?.isPast,
    }
  })
}

/** 가격 포맷: 17500 → "17,500원" */
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원'
}

/** 할인율 포맷: 12 → "-12%" */
export function formatDiscount(rate: number): string {
  return `-${rate}%`
}
