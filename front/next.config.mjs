/** @type {import('next').NextConfig} */
const nextConfig = {
  // SWC optimizations for Vercel
  swcMinify: true,
  experimental: {
    // Next.js 14 için uygun experimental özellikler
    optimizePackageImports: ['react-icons'],
    // ISR revalidation timeout'u artır  
    isrFlushToDisk: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Ortam değişkenleri: .env öncelikli, yoksa yeni backend'e düş
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://backend.anefuye.com.tr',
  },
  // Harici görseller için izinler (ANEF logosu)
  images: {
    remotePatterns: [
      { 
        protocol: 'https', 
        hostname: 'www.anef.org.tr',
        pathname: '/images/**'
      },
      { 
        protocol: 'https', 
        hostname: 'anef.org.tr',
        pathname: '/images/**'
      },
    ],
    // Vercel'de external image optimization sorunları için
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // HTTPS ve güvenlik headers
  async headers() {
    return [
      {
        source: '/:path*',
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: 'upgrade-insecure-requests',
          },
        ],
      },
    ];
  },
  // Production için asset yolu (SSL için)
  assetPrefix: process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' 
    ? 'https://anefuye.com.tr' 
    : undefined
};

export default nextConfig;
