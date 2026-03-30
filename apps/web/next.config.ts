import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@forge/ui', '@forge/db'],
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default config
