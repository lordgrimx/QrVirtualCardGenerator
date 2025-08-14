/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ortam değişkenleri: .env öncelikli, yoksa Render backend'e düş
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'https://qrvirtualcardgenerator.onrender.com',
  },
  // Harici görseller için izinler (ELFED logosu)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.elfed.org.tr' },
      { protocol: 'https', hostname: 'elfed.org.tr' },
    ],
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
