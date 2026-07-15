/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_DEV_API_URL: process.env.NEXT_PUBLIC_DEV_API_URL,
    NEXT_PUBLIC_DEV_WS_URL: process.env.NEXT_PUBLIC_DEV_WS_URL,
    NEXT_PUBLIC_PROD_API_URL: process.env.NEXT_PUBLIC_PROD_API_URL,
    NEXT_PUBLIC_PROD_WS_URL: process.env.NEXT_PUBLIC_PROD_WS_URL,
    // Legacy aliases still supported by src/lib/env.ts
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
  images: {
    domains: ['localhost', 'archon-backend-mc2k.onrender.com'],
  },
}

module.exports = nextConfig
