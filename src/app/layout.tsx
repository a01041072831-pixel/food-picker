import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Food Picker — 마감 직전, 가격은 바닥을 향합니다',
  description: '소비기한 임박 식품을 실시간 다이내믹 프라이싱으로 저렴하게 구매하세요.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
  openGraph: {
    title: 'Food Picker',
    description: '마감이 가까워질수록 가격은 내려갑니다',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
