'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

export default function AuthErrorPage() {
  const params = useSearchParams()
  const error = params.get('error')

  const errorMessage = (() => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Geçersiz email veya şifre. Lütfen bilgilerinizi kontrol edin.'
      case 'Configuration':
        return 'Kimlik doğrulama yapılandırmasında bir sorun var.'
      case 'AccessDenied':
        return 'Bu işlemi yapmak için yetkiniz yok.'
      default:
        return 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.'
    }
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 text-center">
          <Image 
            src="/elfed-logo.png" 
            alt="ELFED Logo" 
            width={56} 
            height={56} 
            className="mx-auto mb-4 rounded-2xl object-contain"
            priority
          />
          <h1 className="text-xl font-bold bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent mb-2">
            Giriş Hatası
          </h1>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl mb-6">
            {errorMessage}
          </p>
          <div className="space-y-3">
            <Link href="/auth/signin" className="inline-block px-4 py-2 rounded-lg text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 font-medium">
              Tekrar Dene
            </Link>
            <div>
              <Link href="/" className="text-red-600 hover:text-red-700 text-sm font-medium">
                ← Ana sayfaya dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
