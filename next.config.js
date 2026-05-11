/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  images: {
    remotePatterns: [],
  },
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/uploads/:filename',
        destination: '/api/uploads/:filename',
      },
    ]
  },
}

module.exports = nextConfig
