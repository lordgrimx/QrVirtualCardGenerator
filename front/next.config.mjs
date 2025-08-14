/** @type {import('next').NextConfig} */
const nextConfig = {
  // SWC optimizations for Vercel
  swcMinify: true,
  experimental: {
    // Next.js 14 için uygun experimental özellikler
    optimizePackageImports: ['react-icons'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Ortam değişkenleri: .env öncelikli, yoksa Render backend'e düş
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://qrvirtualcardgenerator.onrender.com',
  },
  // Harici görseller için izinler (ELFED logosu)
  images: {
    remotePatterns: [
      { 
        protocol: 'https', 
        hostname: 'www.elfed.org.tr',
        pathname: '/images/**'
      },
      { 
        protocol: 'https', 
        hostname: 'elfed.org.tr',
        pathname: '/images/**'
      },
    ],
    // Vercel'de external image optimization sorunları için
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // HTTPS development server
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  }
};

export default nextConfig;
