/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Mobil erişim için dinamik API URL
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production'
      ? 'https://qrvirtualcardgenerator.onrender.com'
      : 'http://localhost:8000'
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
