/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Mobil erişim için dinamik API URL
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'https://192.168.1.104:8000'  // Network IP kullan
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
