/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Kakao Map SDK는 클라이언트 전용
  transpilePackages: [],
}

module.exports = nextConfig
