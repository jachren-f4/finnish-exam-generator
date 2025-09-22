import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['formidable'],
  
  // Remove standalone output for Vercel deployment
  // output: 'standalone',
  
  // Experimental features for production optimization
  experimental: {
    // Enable edge runtime for better performance
    serverMinification: true,
  },
  
  // Compress responses in production
  compress: true,
  
  // Optimize images
  images: {
    // Enable image optimization in containers
    unoptimized: false,
    // Configure domains if using external images
    domains: [],
    // Enable modern formats
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers for production security and CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Webpack optimization for production
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev) {
      // Bundle analyzer in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
            },
          },
        },
      }
    }
    
    return config
  },
}

export default nextConfig