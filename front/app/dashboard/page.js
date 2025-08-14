'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Dashboard verilerini state'te tut
  const [dashboardData, setDashboardData] = useState({
    loading: true,
    error: null,
    stats: {
      monthly: { revenue: 0, nfc_scans: 0, qr_verifications: 0, new_members: 0, growth_rate: 0 },
      totals: { members: 0, active_members: 0, businesses: 0, active_campaigns: 0 },
      last_30_days: { total_nfc_scans: 0, successful_nfc_scans: 0, total_qr_verifications: 0, successful_qr_verifications: 0, total_api_calls: 0, successful_api_calls: 0 },
      chart_data: { dates: [], nfc_scans: [], qr_verifications: [], api_calls: [] },
      last_updated: null
    }
  });

  // Dashboard verilerini çek
  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://qrvirtualcardgenerator.onrender.com'}/api/dashboard/stats`);
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(prev => ({ 
          ...prev, 
          loading: false, 
          stats: data.data,
          error: null
        }));
      } else {
        throw new Error(data.error || 'Dashboard verileri alınamadı');
      }
    } catch (error) {
      console.error('Dashboard veri hatası:', error);
      setDashboardData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message
      }));
    }
  };

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // Redirect admin users to admin panel
    if (session.user.role === 'admin') {
      router.push('/admin');
      return;
    }
    
    // Authentication başarılı, verileri çek
    fetchDashboardData();
  }, [session, status, router]);
  
  // 5 dakikada bir verileri yenile
  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      const interval = setInterval(fetchDashboardData, 5 * 60 * 1000); // 5 dakika
      return () => clearInterval(interval);
    }
  }, [session]);

  // Show loading while checking auth or loading data
  if (status === 'loading' || dashboardData.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Kimlik doğrulanıyor...' : 'Dashboard verileri yükleniyor...'}
          </p>
        </div>
      </div>
    );
  }

  // Show unauthorized if not logged in
  if (!session) {
    return null; // Will be redirected
  }

  // Show error state
  if (dashboardData.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Veri Yükleme Hatası</h2>
          <p className="text-gray-600 mb-4">{dashboardData.error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

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
              <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent">
                  ELFED
                </h1>
                <p className="text-xs text-gray-600">Üye Paneli</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                Hoş geldiniz, {session.user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
            <p className="text-gray-600">İşletme yönetim paneliniz</p>
            {dashboardData.stats.last_updated && (
              <p className="text-sm text-gray-500 mt-1">
                Son güncelleme: {new Date(dashboardData.stats.last_updated).toLocaleString('tr-TR')}
              </p>
            )}
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={dashboardData.loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${dashboardData.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {dashboardData.loading ? 'Yenileniyor...' : 'Yenile'}
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Quick Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bu Ay NFC Tarama</h3>
                <p className="text-2xl font-bold text-green-600">{dashboardData.stats.monthly.nfc_scans.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">+{dashboardData.stats.monthly.growth_rate}% geçen aya göre</p>
          </div>

          {/* Active Campaigns */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">QR Doğrulama</h3>
                <p className="text-2xl font-bold text-blue-600">{dashboardData.stats.monthly.qr_verifications.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Bu ay toplam doğrulama</p>
          </div>

          {/* Customer Count */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Toplam Üye</h3>
                <p className="text-2xl font-bold text-purple-600">{dashboardData.stats.totals.members.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">+{dashboardData.stats.monthly.new_members} yeni üye bu ay</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Business Management */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">İşletme Yönetimi</h3>
                <p className="text-gray-600">İşletme bilgilerinizi güncelleyin</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-semibold text-gray-900">İşletme Bilgileri</span>
                <p className="text-sm text-gray-600">Ad, açıklama, iletişim bilgileri</p>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-semibold text-gray-900">Çalışma Saatleri</span>
                <p className="text-sm text-gray-600">Açılış ve kapanış saatlerini ayarlayın</p>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-semibold text-gray-900">Fotoğraf Galerisi</span>
                <p className="text-sm text-gray-600">İşletme fotoğraflarını yönetin</p>
              </button>
            </div>
          </div>

          {/* Campaign Management */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Kampanya Yönetimi</h3>
                <p className="text-gray-600">İndirimler ve promosyonlar oluşturun</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-semibold text-gray-900">Yeni Kampanya</span>
                <p className="text-sm text-gray-600">İndirim veya promosyon oluşturun</p>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-semibold text-gray-900">Aktif Kampanyalar</span>
                <p className="text-sm text-gray-600">Mevcut kampanyaları yönetin</p>
              </button>
              <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="font-semibold text-gray-900">Kampanya Analizi</span>
                <p className="text-sm text-gray-600">Performans raporlarını görüntüleyin</p>
              </button>
            </div>
          </div>
        </div>

        {/* API İstatistikleri */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Son 30 Gün API İstatistikleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{dashboardData.stats.last_30_days.total_nfc_scans.toLocaleString()}</div>
              <div className="text-blue-100">Toplam NFC Tarama</div>
              <div className="text-sm text-blue-200 mt-1">
                Başarılı: {dashboardData.stats.last_30_days.successful_nfc_scans.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{dashboardData.stats.last_30_days.total_qr_verifications.toLocaleString()}</div>
              <div className="text-blue-100">QR Doğrulama</div>
              <div className="text-sm text-blue-200 mt-1">
                Başarılı: {dashboardData.stats.last_30_days.successful_qr_verifications.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{dashboardData.stats.last_30_days.total_api_calls.toLocaleString()}</div>
              <div className="text-blue-100">Toplam API Çağrısı</div>
              <div className="text-sm text-blue-200 mt-1">
                Başarılı: {dashboardData.stats.last_30_days.successful_api_calls.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{dashboardData.stats.totals.active_campaigns}</div>
              <div className="text-blue-100">Aktif Kampanya</div>
              <div className="text-sm text-blue-200 mt-1">
                Toplam İşletme: {dashboardData.stats.totals.businesses}
              </div>
            </div>
          </div>
          {dashboardData.stats.chart_data.dates.length > 0 && (
            <div className="mt-6 pt-6 border-t border-blue-400">
              <h4 className="text-lg font-semibold mb-3">Son 7 Gün Aktivite</h4>
              <div className="text-sm text-blue-100">
                Günlük ortalama: {Math.round(dashboardData.stats.chart_data.nfc_scans.reduce((a, b) => a + b, 0) / dashboardData.stats.chart_data.nfc_scans.length)} NFC tarama
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
