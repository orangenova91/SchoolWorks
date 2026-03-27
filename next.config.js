/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  eslint: {
    // 경고는 무시하고 빌드를 강제로 진행합니다.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 타입 에러도 무시합니다.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['placehold.co'],
  },
}

module.exports = nextConfig;

