/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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