'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
                <p className="text-xs text-gray-600">Elazığ Dernekler Federasyonu</p>
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
            <button className="md:hidden p-2 text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
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
                Elazığ Dernekler Federasyonu
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Kültürel yozlaşmanın arttığı kentlerde yaşıyor; değerlerimizden koparak adeta yalnızlaşıyoruz.
                Elazığlıların birbirine tutunarak var olma, Türkiye ve Küresel Dünyada yer alma 
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
                Elazığ kültürünü yaşatmak ve sosyal dayanışmayı güçlendirmek için çalışıyoruz
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
                  Elazığ topluluğunu bir arada tutuyoruz.
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
                  Elazığlıların birbirine tutunarak var olması, 
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
                    Elazığ Valisi Sayın Numan Hatipoğlu, Elazığ Dernekler Federasyonu'nu ziyaret etti. 
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
                    Geleneksel kahvaltı etkinliğimizde Elazığlı dostlarımızla bir araya geldik. 
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
                <p className="text-gray-600 text-sm">Eğitim alanında çalışan Elazığlılar bir araya geldi</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <h3 className="font-bold text-gray-900 mb-2">Elazığlı Doktorlar Kahvaltısı</h3>
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
              Elazığ kültürünü yaşatmak ve sosyal dayanışmaya katkıda bulunmak için bize katılın
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
                  <p className="text-gray-400 text-sm">Elazığ Dernekler Federasyonu</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Elazığlıların birbirine tutunarak var olma, Türkiye ve Küresel Dünyada yer alma 
                ve sosyal dayanışmayı artıracak üst örgütlenme ihtiyacından doğduk.
              </p>
              
              {/* Sosyal Medya */}
              <div className="flex gap-4">
                <a href="https://www.facebook.com/elazigfederasyonu" target="_blank" className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/anef_elazigfederasyonu/" target="_blank" className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.621 5.367 11.988 11.988 11.988c6.62 0 11.987-5.367 11.987-11.988C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z"/>
                  </svg>
                </a>
                <a href="https://twitter.com/anef23" target="_blank" className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="https://www.youtube.com/channel/UC8qVo2f8tdOQsx2y1Xmg2Mg" target="_blank" className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
                <p>Elazığ Dernekler Federasyonu</p>
                <p>Elazığ, Türkiye</p>
                <p className="mt-4">
                  <span className="text-red-400">E-posta:</span><br />
                  info@anef.org.tr
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 ANEF - Elazığ Dernekler Federasyonu. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}