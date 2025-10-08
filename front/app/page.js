'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Redirect admin users to admin panel
    if (session?.user?.role === 'admin') {
      router.push('/admin');
    }
  }, [session, router]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image 
                src="/anef-logo.png" 
                alt="ANEF Logo" 
                width={48} 
                height={48} 
                className="rounded-lg object-contain"
                priority
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent">
                  ANEF
                </h1>
                <p className="text-xs text-gray-600">Anadolu Elazığlılar Dernekler Federasyonu</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#hakkimizda" className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                Hakkımızda
              </a>
              <a href="#haberler" className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                Haberler
              </a>
              <a href="#faaliyetler" className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                Faaliyetler
              </a>
              <a href="#iletisim" className="text-gray-700 hover:text-red-600 transition-colors font-medium">
                İletişim
              </a>
              
              {session ? (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
                  <span className="text-gray-700 text-sm">
                    Hoş geldiniz, {session.user.name}
                  </span>
                  {session.user.role === 'admin' ? (
                    <Link
                      href="/admin"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Yönetim Paneli
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
                  >
                    Çıkış
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Yönetici Girişi
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-4 space-y-3">
              <a 
                href="#hakkimizda" 
                className="block text-gray-700 hover:text-red-600 transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hakkımızda
              </a>
              <a 
                href="#haberler" 
                className="block text-gray-700 hover:text-red-600 transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Haberler
              </a>
              <a 
                href="#faaliyetler" 
                className="block text-gray-700 hover:text-red-600 transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Faaliyetler
              </a>
              <a 
                href="#iletisim" 
                className="block text-gray-700 hover:text-red-600 transition-colors font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                İletişim
              </a>
              
              {session ? (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div className="text-gray-700 text-sm py-2">
                    Hoş geldiniz, {session.user.name}
                  </div>
                  {session.user.role === 'admin' ? (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Yönetim Paneli
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm text-center"
                  >
                    Çıkış
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-200">
                  <Link
                    href="/auth/signin"
                    className="block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Yönetici Girişi
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-700 via-red-600 to-orange-600 bg-clip-text text-transparent mb-6">
                ANEF
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
                Anadolu Elazığlılar Dernekler Federasyonu
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Kültürel yozlaşmanın arttığı kentlerde yaşıyor; değerlerimizden koparak adeta yalnızlaşıyoruz.
                Anadolu Elazığlıların birbirine tutunarak var olma, Türkiye ve Küresel Dünyada yer alma 
                ve sosyal dayanışmayı artıracak üst örgütlenme ihtiyacından ANEF doğmuştur.
              </p>
              
              {!session && (
                <div className="flex justify-center gap-4">
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 bg-gradient-to-r from-red-600 via-red-700 to-orange-600 hover:from-red-700 hover:via-red-800 hover:to-orange-700 text-white rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  >
                    Yönetici Girişi
                  </Link>
                  <a
                    href="#hakkimizda"
                    className="px-8 py-4 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-lg font-semibold transition-all duration-300"
                  >
                    Hakkımızda
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="hakkimizda" className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                ANEF Faaliyetleri
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Anadolu Elazığ kültürünü yaşatmak ve sosyal dayanışmayı güçlendirmek için çalışıyoruz
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Haberler & Etkinlikler</h3>
                <p className="text-gray-600">
                  Güncel haberlerimiz, etkinliklerimiz ve sosyal aktivitelerimizle 
                  Anadolu Elazığ topluluğunu bir arada tutuyoruz.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sosyal Dayanışma</h3>
                <p className="text-gray-600">
                  Anadolu Elazığlıların birbirine tutunarak var olması, 
                  sosyal dayanışmayı artıracak üst örgütlenme sağlıyoruz.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Kültürel Faaliyetler</h3>
                <p className="text-gray-600">
                  Harput türküleri, geleneksel kahvaltılar ve 
                  kültürel etkinliklerle değerlerimizi yaşatıyoruz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Haberler Section */}
        <section id="haberler" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Güncel Haberlerimiz
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                ANEF'in son haberlerini ve etkinliklerini takip edin
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Haber 1 */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-48 bg-gradient-to-r from-red-600 to-orange-600"></div>
                <div className="p-6">
                  <div className="text-sm text-red-600 font-semibold mb-2">04 Ağustos 2025</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Elazığ Valimizi Ağırladık</h3>
                  <p className="text-gray-600 mb-4">
                    Elazığ Valisi Sayın Numan Hatipoğlu, Anadolu Elazığlılar Dernekler Federasyonu'nu ziyaret etti. 
                    Akgün Otel'de düzenlenen yemekli programda...
                  </p>
                  <a href="#" className="text-red-600 font-semibold hover:text-red-700">
                    Haberin devamı →
                  </a>
                </div>
              </div>

              {/* Haber 2 */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-48 bg-gradient-to-r from-orange-600 to-red-600"></div>
                <div className="p-6">
                  <div className="text-sm text-red-600 font-semibold mb-2">16 Haziran 2025</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Sayın Valimiz Yönetim Kurul Toplantımızda</h3>
                  <p className="text-gray-600 mb-4">
                    Yönetim kurulu toplantımızda Sayın Valimiz ile bir araya geldik. 
                    Gelecek projelerimiz hakkında görüş alışverişinde bulunduk...
                  </p>
                  <a href="#" className="text-red-600 font-semibold hover:text-red-700">
                    Haberin devamı →
                  </a>
                </div>
              </div>

              {/* Haber 3 */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-48 bg-gradient-to-r from-red-700 to-orange-500"></div>
                <div className="p-6">
                  <div className="text-sm text-red-600 font-semibold mb-2">Etkinlik</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">3. Geleneksel Kahvaltı</h3>
                  <p className="text-gray-600 mb-4">
                    Geleneksel kahvaltı etkinliğimizde Anadolu Elazığlı dostlarımızla bir araya geldik. 
                    Kültürel değerlerimizi yaşattığımız güzel bir etkinlik...
                  </p>
                  <a href="#" className="text-red-600 font-semibold hover:text-red-700">
                    Etkinlik fotoğrafları →
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <a 
                href="#" 
                className="inline-block px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Tüm Haberleri Gör
              </a>
            </div>
          </div>
        </section>

        {/* Etkinlikler Section */}
        <section id="faaliyetler" className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Faaliyetler & Projeler
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Kültürel değerlerimizi yaşatan projelerimiz
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <h3 className="font-bold text-gray-900 mb-2">Eğitimciler Buluştu</h3>
                <p className="text-gray-600 text-sm">Eğitim alanında çalışan Anadolu Elazığlılar bir araya geldi</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <h3 className="font-bold text-gray-900 mb-2">Anadolu Elazığlı Doktorlar Kahvaltısı</h3>
                <p className="text-gray-600 text-sm">Sağlık sektöründeki dostlarımızla buluştuk</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <h3 className="font-bold text-gray-900 mb-2">Kayıp Harput Türküleri</h3>
                <p className="text-gray-600 text-sm">Kültürel mirasımızı geleceğe taşıyoruz</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <h3 className="font-bold text-gray-900 mb-2">Çedene Sohbeti</h3>
                <p className="text-gray-600 text-sm">Geleneksel sohbet toplantılarımız</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600 to-orange-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              ANEF'e Katılın
            </h2>
            <p className="text-xl text-red-100 mb-8">
              Anadolu Elazığ kültürünü yaşatmak ve sosyal dayanışmaya katkıda bulunmak için bize katılın
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#iletisim"
                className="inline-block px-8 py-4 bg-white text-red-600 rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                İletişime Geçin
              </a>
              {!session && (
                <Link
                  href="/auth/signin"
                  className="inline-block px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-red-600 rounded-xl text-lg font-semibold transition-all duration-300"
                >
                  Yönetici Girişi
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="iletisim" className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo ve Açıklama */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Image 
                  src="/anef-logo.png" 
                  alt="ANEF Logo" 
                  width={48} 
                  height={48} 
                  className="rounded-lg object-contain"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">ANEF</h3>
                  <p className="text-gray-400 text-sm">Anadolu Elazığlılar Dernekler Federasyonu</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Anadolu Elazığlıların birbirine tutunarak var olma, Türkiye ve Küresel Dünyada yer alma 
                ve sosyal dayanışmayı artıracak üst örgütlenme ihtiyacından doğduk.
              </p>
              
              {/* Sosyal Medya */}
              <div className="flex flex-wrap gap-4">
                <a href="https://www.facebook.com/p/Anadolu-Elaz%C4%B1%C4%9Fl%C4%B1lar-Federasyonu-61575862882563/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/anefresmi/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
                <a href="https://anef.org.tr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors" aria-label="Website">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm9.885 11.441c-2.575-.422-4.943-.445-7.103-.073-.244-.563-.497-1.125-.767-1.68 2.31-1 4.165-2.358 5.548-4.082 1.35 1.594 2.197 3.619 2.322 5.835zm-3.842-7.282c-1.205 1.554-2.868 2.783-4.986 3.68-1.016-1.861-2.178-3.676-3.488-5.438.779-.197 1.591-.314 2.431-.314 2.275 0 4.368.779 6.043 2.072zM8.265 2.183c1.334 1.784 2.525 3.626 3.569 5.519-2.484.874-5.174 1.358-8.078 1.451.545-3.104 2.539-5.686 5.509-6.97zm-6.219 9.318c3.055 0 5.935-.474 8.636-1.422.247.564.488 1.127.713 1.691-2.137.695-4.034 1.82-5.658 3.37-1.623 1.551-2.82 3.424-3.572 5.619-1.556-1.722-2.502-3.994-2.502-6.494 0-1.293.309-2.512.856-3.6zm1.819 8.278c.662-2.014 1.726-3.678 3.183-4.982 1.458-1.305 3.223-2.216 5.281-2.73.244.699.473 1.402.684 2.109-2.505 1.027-4.506 2.764-5.982 5.194-1.476 2.43-2.315 5.167-2.516 8.205-.729-.456-1.385-.999-1.956-1.616-.571-.617-1.046-1.306-1.425-2.064-.379-.758-.664-1.569-.865-2.43-.201-.862-.307-1.761-.307-2.693 0-.931.103-1.831.307-2.693zm9.518 11.076c-.123-2.809.795-5.343 2.753-7.598 1.958-2.255 4.548-3.753 7.759-4.494.069.458.108.928.108 1.406 0 5.514-3.727 10.162-8.82 11.686z"/>
                  </svg>
                </a>
                <a href="mailto:anadoluelaziglilarfederasyonu@gmail.com" className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors" aria-label="Email">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M0 3v18h24v-18h-24zm6.623 7.929l-4.623 5.712v-9.458l4.623 3.746zm-4.141-5.929h19.035l-9.517 7.713-9.518-7.713zm5.694 7.188l3.824 3.099 3.83-3.104 5.612 6.817h-18.779l5.513-6.812zm9.208-1.264l4.616-3.741v9.348l-4.616-5.607z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Hızlı Erişim */}
            <div>
              <h4 className="font-bold text-lg mb-4">Hızlı Erişim</h4>
              <ul className="space-y-2">
                <li><a href="#hakkimizda" className="text-gray-300 hover:text-white transition-colors">ANEF Hakkında</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Kurumsal</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Üyeler</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Faaliyetler & Projeler</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Yayınlar</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">İletişim</a></li>
              </ul>
            </div>

            {/* İletişim */}
            <div>
              <h4 className="font-bold text-lg mb-4">İletişim</h4>
              <div className="space-y-2 text-gray-300">
                <p>Anadolu Elazığlılar Federasyonu</p>
                <p>Elazığ, Türkiye</p>
                <p className="mt-4">
                  <span className="text-red-400">E-posta:</span><br />
                  <a href="mailto:anadoluelaziglilarfederasyonu@gmail.com" className="hover:text-white transition-colors">
                    anadoluelaziglilarfederasyonu@gmail.com
                  </a>
                </p>
                <p className="mt-4">
                  <span className="text-red-400">Web:</span><br />
                  <a href="https://anef.org.tr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    anef.org.tr
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 ANEF - Anadolu Elazığlılar Dernekler Federasyonu. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}