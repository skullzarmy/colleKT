/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    esmExternals: false,
  },
  webpack: (config, { isServer }) => {
    // Handle Three.js and related modules
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })

    // Ensure proper handling of ES modules
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    })

    // Handle Three.js specific optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }

    return config
  },
  // Optimize for Vercel deployment
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // Handle static optimization
  trailingSlash: false,
  // Ensure proper asset handling
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
}

export default nextConfig
