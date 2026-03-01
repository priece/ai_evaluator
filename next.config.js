/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 生产环境禁用严格模式检查
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 构建时忽略类型错误（生产环境使用）
    ignoreBuildErrors: true,
  },
  // 禁用静态页面生成，所有页面使用 SSR
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/hls/:path*',
        destination: '/hls/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
