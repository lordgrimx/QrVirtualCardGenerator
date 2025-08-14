'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Static generation'dan hariç tut - auth bağımlı
export const dynamic = 'force-dynamic'

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔐 Attempting sign in...')
      
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      console.log('📡 Sign in result:', result)

      if (result?.error) {
        console.error('❌ Sign in error:', result.error)
        if (result.error === 'CredentialsSignin') {
          setError('Geçersiz email veya şifre. Lütfen bilgilerinizi kontrol edin.')
        } else {
          setError('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.')
        }
      } else if (result?.ok) {
        console.log('✅ Sign in successful, redirecting...')
        // Get the updated session
        const session = await getSession()
        console.log('👤 Session:', session)
        
        // Redirect based on user role
        if (session?.user?.role === 'admin') {
          console.log('👑 Redirecting to admin panel')
          router.push('/admin')
        } else {
          console.log('👤 Redirecting to dashboard')
          router.push('/dashboard')
        }
      } else {
        setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } catch (error) {
      console.error('🚨 Sign in error:', error)
      setError('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image 
              src="/elfed-logo.png" 
              alt="ELFED Logo" 
              width={64} 
              height={64} 
              className="mx-auto mb-4 rounded-2xl object-contain"
              priority
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent">
              ELFED
            </h1>
            <p className="text-sm text-gray-600 mt-1">Elazığ Dernekler Federasyonu</p>
            <p className="text-gray-600 mt-2">Yönetici hesabınıza giriş yapın</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Adresi
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-red-600 via-red-700 to-orange-600 hover:from-red-700 hover:via-red-800 hover:to-orange-700 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sunucu başlatılıyor... (30-45 saniye)</span>
                </div>
              ) : 'Giriş Yap'}
            </button>
          </form>

          {/* Admin Only System - No Registration */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Sadece yönetici girişi
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <p className="font-semibold mb-2">ELFED Demo Hesabı:</p>
            <p>📧 Email: admin@elfed.org.tr</p>
            <p>🔑 Şifre: elfed2024</p>
          </div>

          {/* Cold Start Warning */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
            <p className="font-semibold mb-1">⚠️ Önemli Bilgi:</p>
            <p>İlk giriş 30-45 saniye sürebilir (sunucu başlatma)</p>
            <p>Lütfen sabırlı olun ve sayfayı yenilemeyin.</p>
          </div>

          {/* Debug Section - For Troubleshooting */}
          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-600 mb-2 font-semibold">🔍 Bağlantı Test</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => window.open('/api/debug/backend-test', '_blank')}
                className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Backend Test
              </button>
              <button
                onClick={() => {
                  const envInfo = {
                    NODE_ENV: typeof window !== 'undefined' ? 'client' : process.env.NODE_ENV,
                    API_URL: process.env.NEXT_PUBLIC_API_URL || 'NOT_SET',
                    timestamp: new Date().toISOString()
                  }
                  console.log('🔍 Frontend ENV Check:', envInfo)
                  alert(`ENV Check - Console'u kontrol edin\nAPI URL: ${envInfo.API_URL}`)
                }}
                className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                ENV Check
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('https://qrvirtualcardgenerator.onrender.com/health')
                    const data = await response.json()
                    console.log('🔍 Direct Backend Test:', data)
                    alert('Backend Online ✅\nConsole\'u kontrol edin')
                  } catch (error) {
                    console.error('🔍 Backend Error:', error)
                    alert('Backend Offline ❌\nConsole\'u kontrol edin')
                  }
                }}
                className="text-xs px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Direct Test
              </button>
            </div>
          </div>

          {/* Ana Sayfa Linki */}
          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
            >
              ← Ana sayfaya dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
