import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Permite todos los subdominios de supabase.co
        port: '',
        pathname: '/storage/v1/object/public/**', //ejemplo
      },
    ],
  },
}

export default nextConfig